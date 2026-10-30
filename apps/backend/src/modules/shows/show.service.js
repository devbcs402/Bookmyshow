import ShowRepository from './show.repository.js';
import MovieRepository from '../movies/movie.repository.js';
import TheatreRepository from '../theatres/theatre.repository.js';
import ScreenRepository from '../screens/screen.repository.js';
import SeatingLayoutRepository from '../screens/seating-layout/seating-layout.repository.js';
import ShowConflictService from './show-conflict.service.js';
import ShowScheduleService from './show-schedule.service.js';
import ShowPricingService from './show-pricing/show-pricing.service.js';
import {
  ShowStatus,
  DefaultCleanupBufferMinutes,
  PublicVisibleShowStatuses
} from './show.constants.js';
import {
  calculateOccupiedEndTime,
  normalizeShowDate,
  isAllowedShowStatusTransition
} from './show.utils.js';
import { Roles } from '../auth/auth.constants.js';
import { NotFoundError } from '../../common/errors/not-found.error.js';
import { ValidationError } from '../../common/errors/validation.error.js';
import { ConflictError } from '../../common/errors/conflict.error.js';
import { AuthorizationError } from '../../common/errors/authorization.error.js';
import ErrorCodes from '../../common/constants/error-codes.js';

export class ShowService {
  /**
   * Helper: verify show existence and partner access
   */
  static async verifyShowAccess(showId, userContext) {
    const show = await ShowRepository.findById(showId);
    if (!show) {
      throw new NotFoundError('Show not found', ErrorCodes.SHOW_NOT_FOUND);
    }

    const showPartnerId = show.partnerId?._id || show.partnerId;
    if (
      userContext.role !== Roles.SYSTEM_ADMIN &&
      String(showPartnerId) !== String(userContext.partnerId)
    ) {
      throw new NotFoundError('Show not found', ErrorCodes.SHOW_NOT_FOUND);
    }

    return show;
  }

  /**
   * Create a new show schedule under a screen
   */
  static async createShow(showInput, userContext) {
    if (!userContext || !userContext.id) {
      throw new AuthorizationError('Authentication required');
    }

    // 1. Verify Movie
    const movie = await MovieRepository.findById(showInput.movieId);
    if (!movie) {
      throw new NotFoundError('Movie not found', ErrorCodes.MOVIE_NOT_FOUND);
    }
    if (!['APPROVED', 'NOW_SHOWING', 'UPCOMING'].includes(movie.status)) {
      throw new ValidationError(
        'Movie is not eligible for scheduling',
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // 2. Verify Theatre & Tenant Scope
    const theatre = await TheatreRepository.findById(showInput.theatreId);
    if (!theatre) {
      throw new NotFoundError('Theatre not found', ErrorCodes.THEATRE_NOT_FOUND);
    }
    const theatrePartnerId = theatre.partnerId?._id || theatre.partnerId;
    if (
      userContext.role !== Roles.SYSTEM_ADMIN &&
      String(theatrePartnerId) !== String(userContext.partnerId)
    ) {
      throw new NotFoundError('Theatre not found', ErrorCodes.THEATRE_NOT_FOUND);
    }
    if (theatre.status !== 'APPROVED') {
      throw new ValidationError(
        'Theatre is not approved for show scheduling',
        ErrorCodes.THEATRE_NOT_APPROVED
      );
    }

    // 3. Verify Screen
    const screen = await ScreenRepository.findById(showInput.screenId);
    if (!screen) {
      throw new NotFoundError('Screen not found', ErrorCodes.SCREEN_NOT_FOUND);
    }
    const screenTheatreId = screen.theatreId?._id || screen.theatreId;
    if (String(screenTheatreId) !== String(theatre._id)) {
      throw new ValidationError(
        'Selected screen does not belong to the specified theatre',
        ErrorCodes.VALIDATION_ERROR
      );
    }
    if (screen.status !== 'ACTIVE' || screen.isActive === false) {
      throw new ValidationError(
        'Screen is not in active operational state',
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // 4. Verify Published Seating Layout
    const layout = await SeatingLayoutRepository.findLatestPublishedByScreen(screen._id);
    if (!layout) {
      throw new ValidationError(
        'Screen does not have a published seating layout. Publish layout first.',
        ErrorCodes.LAYOUT_NOT_FOUND
      );
    }

    // 5. Timings & Interval Calculations
    const durationMins = showInput.durationMins || movie.durationMins || 120;
    const cleanupBufferMinutes =
      showInput.cleanupBufferMinutes !== undefined
        ? Number(showInput.cleanupBufferMinutes)
        : DefaultCleanupBufferMinutes;

    const { endTime, occupiedEndTime } = calculateOccupiedEndTime(
      showInput.startTime,
      durationMins,
      cleanupBufferMinutes
    );

    const showDate = normalizeShowDate(showInput.startTime);

    // 6. Concurrency-Safe Scheduling execution
    const screenId = String(screen._id);
    const createdShow = await ShowScheduleService.executeWithScheduleLock(
      screenId,
      async session => {
        // Evaluate conflict check inside lock & session
        const { hasConflict, conflictingShow } = await ShowConflictService.checkScreenConflict(
          screen._id,
          new Date(showInput.startTime),
          occupiedEndTime,
          null,
          session
        );

        if (hasConflict) {
          throw new ConflictError(
            `Screen schedule conflict: screen is occupied by show "${conflictingShow._id}" until ${conflictingShow.occupiedEndTime.toISOString()}`,
            ErrorCodes.SCHEDULE_CONFLICT
          );
        }

        const showPayload = {
          partnerId: theatrePartnerId,
          theatreId: theatre._id,
          branchId: showInput.branchId || null,
          screenId: screen._id,
          movieId: movie._id,
          cityId: theatre.address?.cityId?._id || theatre.address?.cityId,
          movieSnapshot: {
            title: movie.title,
            posterUrl: movie.posterUrl || '',
            durationMins,
            censorRating: movie.censorRating || 'UA'
          },
          showDate,
          startTime: new Date(showInput.startTime),
          endTime,
          cleanupBufferMinutes,
          occupiedEndTime,
          timezone: showInput.timezone || theatre.timezone || 'Asia/Kolkata',
          format: showInput.format || '2D',
          language: showInput.language || movie.languages?.[0]?.name || 'Hindi',
          subtitleLanguage: showInput.subtitleLanguage || 'None',
          audioFormat: showInput.audioFormat || screen.soundSystem || 'Dolby 7.1',
          showType: showInput.showType || 'REGULAR',
          layoutId: layout._id,
          layoutVersion: layout.layoutVersion,
          totalSeats: layout.totalSeats,
          availableSeats: layout.bookableSeats,
          status: ShowStatus.DRAFT,
          createdBy: userContext.id
        };

        const newShow = await ShowRepository.create(showPayload, session);

        // If initial pricing tiers were provided in the payload
        if (Array.isArray(showInput.pricingTiers) && showInput.pricingTiers.length > 0) {
          await ShowPricingService.setShowPricing(
            newShow._id,
            showInput.pricingTiers,
            userContext,
            session
          );
        }

        return newShow;
      }
    );

    return ShowRepository.findById(createdShow._id);
  }

  /**
   * List shows for theatre partner
   */
  static async getOwnerShows(userContext, filter = {}, options = {}) {
    const partnerId =
      userContext.role === Roles.SYSTEM_ADMIN ? filter.partnerId : userContext.partnerId;
    const queryFilter = { ...filter };
    if (partnerId) {
      queryFilter.partnerId = partnerId;
    }

    return ShowRepository.findShows(queryFilter, options);
  }

  /**
   * Get single show details by ID
   */
  static async getShowById(showId, userContext) {
    return this.verifyShowAccess(showId, userContext);
  }

  /**
   * Update non-temporal metadata of a show
   */
  static async updateShow(showId, updateData, userContext) {
    const show = await this.verifyShowAccess(showId, userContext);

    if (show.status === ShowStatus.CANCELLED || show.status === ShowStatus.COMPLETED) {
      throw new ValidationError(
        `Cannot update a show that is already ${show.status}`,
        ErrorCodes.INVALID_SHOW_STATUS
      );
    }

    const permittedUpdates = {};
    const allowedKeys = [
      'format',
      'language',
      'subtitleLanguage',
      'audioFormat',
      'showType',
      'bookingOpensAt',
      'bookingClosesAt'
    ];

    allowedKeys.forEach(key => {
      if (updateData[key] !== undefined) {
        permittedUpdates[key] = updateData[key];
      }
    });

    permittedUpdates.updatedBy = userContext.id;

    const updated = await ShowRepository.updateById(show._id, permittedUpdates);
    return updated;
  }

  /**
   * Reschedule show start and end times with conflict checking
   */
  static async rescheduleShow(showId, rescheduleInput, userContext) {
    const show = await this.verifyShowAccess(showId, userContext);

    if (show.status === ShowStatus.CANCELLED || show.status === ShowStatus.COMPLETED) {
      throw new ValidationError(
        `Cannot reschedule a show that is already ${show.status}`,
        ErrorCodes.INVALID_SHOW_STATUS
      );
    }

    const durationMins = show.movieSnapshot?.durationMins || 120;
    const cleanupBufferMinutes = show.cleanupBufferMinutes || DefaultCleanupBufferMinutes;

    const { endTime: newEndTime, occupiedEndTime: newOccupiedEndTime } = calculateOccupiedEndTime(
      rescheduleInput.newStartTime,
      durationMins,
      cleanupBufferMinutes
    );

    const newShowDate = normalizeShowDate(rescheduleInput.newStartTime);
    const screenId = String(show.screenId?._id || show.screenId);

    const updated = await ShowScheduleService.executeWithScheduleLock(screenId, async session => {
      // Exclude current show from conflict detection
      const { hasConflict, conflictingShow } = await ShowConflictService.checkScreenConflict(
        screenId,
        new Date(rescheduleInput.newStartTime),
        newOccupiedEndTime,
        show._id,
        session
      );

      if (hasConflict) {
        throw new ConflictError(
          `Reschedule conflict: screen is occupied by show "${conflictingShow._id}" until ${conflictingShow.occupiedEndTime.toISOString()}`,
          ErrorCodes.SCHEDULE_CONFLICT
        );
      }

      const historyItem = {
        previousStartTime: show.startTime,
        previousEndTime: show.endTime,
        rescheduledAt: new Date(),
        rescheduledBy: userContext.id,
        reason: rescheduleInput.reason || 'Operational adjustment'
      };

      const updatePayload = {
        startTime: new Date(rescheduleInput.newStartTime),
        endTime: newEndTime,
        occupiedEndTime: newOccupiedEndTime,
        showDate: newShowDate,
        $push: { rescheduleHistory: historyItem },
        updatedBy: userContext.id
      };

      return ShowRepository.updateById(show._id, updatePayload, session);
    });

    return ShowRepository.findById(updated._id);
  }

  /**
   * Publish show making it active for booking
   */
  static async publishShow(showId, userContext) {
    const show = await this.verifyShowAccess(showId, userContext);

    if (show.status === ShowStatus.PUBLISHED) {
      return show;
    }

    if (!isAllowedShowStatusTransition(show.status, ShowStatus.PUBLISHED)) {
      throw new ValidationError(
        `Invalid status transition from ${show.status} to PUBLISHED`,
        ErrorCodes.INVALID_STATUS_TRANSITION
      );
    }

    // 1. Verify layout
    const layout = await SeatingLayoutRepository.findById(show.layoutId);
    if (!layout) {
      throw new NotFoundError('Seating layout not found', ErrorCodes.LAYOUT_NOT_FOUND);
    }

    // 2. Verify pricing completeness
    const pricingTiers = show.pricingTiers || [];
    const layoutCategoryCodes = (layout.categoryBreakdown || []).map(c =>
      String(c.categoryCode).toUpperCase()
    );

    const coveredCodes = new Set(pricingTiers.map(t => String(t.categoryCode).toUpperCase()));

    for (const code of layoutCategoryCodes) {
      if (!coveredCodes.has(code)) {
        throw new ValidationError(
          `Pricing is incomplete. Missing price configuration for category: "${code}"`,
          ErrorCodes.PRICING_INCOMPLETE
        );
      }
    }

    const updated = await ShowRepository.updateById(show._id, {
      status: ShowStatus.PUBLISHED,
      updatedBy: userContext.id
    });

    return updated;
  }

  /**
   * Cancel show
   */
  static async cancelShow(showId, reason, userContext) {
    const show = await this.verifyShowAccess(showId, userContext);

    if (show.status === ShowStatus.CANCELLED) {
      throw new ConflictError('Show is already cancelled', ErrorCodes.SHOW_ALREADY_CANCELLED);
    }

    if (!isAllowedShowStatusTransition(show.status, ShowStatus.CANCELLED)) {
      throw new ValidationError(
        `Invalid status transition from ${show.status} to CANCELLED`,
        ErrorCodes.INVALID_STATUS_TRANSITION
      );
    }

    const updated = await ShowRepository.updateById(show._id, {
      status: ShowStatus.CANCELLED,
      cancellationReason: reason || 'Cancelled by cinema administration',
      cancelledAt: new Date(),
      cancelledBy: userContext.id,
      updatedBy: userContext.id
    });

    return updated;
  }

  /**
   * Public: Search published shows
   */
  static async searchPublicShows(filter = {}, options = {}) {
    const publicFilter = {
      ...filter,
      status: { $in: PublicVisibleShowStatuses }
    };

    if (filter.date) {
      publicFilter.showDate = normalizeShowDate(filter.date);
      delete publicFilter.date;
    }

    return ShowRepository.findShows(publicFilter, options);
  }

  /**
   * Public: Get published shows for a specific movie
   */
  static async getMovieShows(movieId, filter = {}, options = {}) {
    return this.searchPublicShows({ movieId, ...filter }, options);
  }

  /**
   * Public: Get published shows for a specific theatre
   */
  static async getTheatreShows(theatreId, filter = {}, options = {}) {
    return this.searchPublicShows({ theatreId, ...filter }, options);
  }

  /**
   * Public: Get single show details
   */
  static async getPublicShowDetails(showId) {
    const show = await ShowRepository.findById(showId);
    if (!show || !PublicVisibleShowStatuses.includes(show.status)) {
      throw new NotFoundError('Show not found or unavailable', ErrorCodes.SHOW_NOT_FOUND);
    }

    return show;
  }
}

export default ShowService;
