import seatLockRepository from './seat-lock.repository.js';
import redisLockService from './redis-lock.service.js';
import { SeatAvailabilityStatus } from './seat-lock.constants.js';
import { SeatStatus } from '../screens/screen.constants.js';
import { ShowStatus } from '../shows/show.constants.js';
import { NotFoundError } from '../../common/errors/not-found.error.js';
import { ConflictError } from '../../common/errors/conflict.error.js';
import ErrorCodes from '../../common/constants/error-codes.js';

export class SeatAvailabilityService {
  /**
   * Calculates comprehensive, show-specific seat availability.
   * Merges physical screen topology, durable MongoDB bookings, and ephemeral Redis locks.
   *
   * @param {string} showId
   * @param {string|null} [currentUserId=null]
   * @returns {Promise<Object>}
   */
  async getShowSeatAvailability(showId, currentUserId = null) {
    // 1. Fetch Show details
    const show = await seatLockRepository.findShowById(showId);
    if (!show || show.isDeleted) {
      throw new NotFoundError('Show not found', ErrorCodes.SHOW_NOT_FOUND);
    }

    if (show.status === ShowStatus.CANCELLED) {
      throw new ConflictError(
        'Show has been cancelled. Seating is unavailable.',
        ErrorCodes.SHOW_ALREADY_CANCELLED
      );
    }

    // 2. Fetch all physical seats for the screen and version
    const physicalSeats = await seatLockRepository.findSeatsByScreenAndVersion(
      show.screenId,
      show.layoutVersion
    );

    // 3. Fetch durable confirmed/pending bookings from MongoDB
    const bookedSeatIds = await seatLockRepository.findBookedSeatIdsForShow(showId);

    // 4. Fetch ephemeral active seat locks from Redis
    const activeLocksMap = await redisLockService.getActiveLocksForShow(showId);

    // 5. Index show pricing tiers by categoryCode for fast lookup
    const pricingMap = new Map();
    if (Array.isArray(show.pricingTiers)) {
      for (const tier of show.pricingTiers) {
        pricingMap.set(tier.categoryCode.toUpperCase(), tier);
      }
    }

    // 6. Statistics counters
    const stats = {
      totalSeats: physicalSeats.length,
      availableSeats: 0,
      lockedSeats: 0,
      bookedSeats: 0,
      blockedSeats: 0,
      maintenanceSeats: 0,
      inactiveSeats: 0
    };

    // 7. Group seats by row while computing granular status
    const rowMap = new Map();

    for (const seat of physicalSeats) {
      const seatIdStr = seat._id.toString();
      const categoryCodeUpper = (seat.categoryCode || 'REGULAR').toUpperCase();
      const pricingTier = pricingMap.get(categoryCodeUpper);

      let status = SeatAvailabilityStatus.AVAILABLE;
      let isLockedByCurrentUser = false;

      // Evaluation precedence:
      // A. Physical Screen Template Invariants
      if (seat.status === SeatStatus.INACTIVE) {
        status = SeatAvailabilityStatus.INACTIVE;
        stats.inactiveSeats += 1;
      } else if (seat.status === SeatStatus.MAINTENANCE) {
        status = SeatAvailabilityStatus.MAINTENANCE;
        stats.maintenanceSeats += 1;
      } else if (seat.status === SeatStatus.BLOCKED || seat.isAvailable === false) {
        status = SeatAvailabilityStatus.BLOCKED;
        stats.blockedSeats += 1;
      }
      // B. Durable MongoDB Bookings
      else if (bookedSeatIds.has(seatIdStr)) {
        status = SeatAvailabilityStatus.BOOKED;
        stats.bookedSeats += 1;
      }
      // C. Ephemeral Redis Locks
      else if (activeLocksMap.has(seatIdStr)) {
        const lockData = activeLocksMap.get(seatIdStr);
        stats.lockedSeats += 1;

        if (currentUserId && lockData.userId === currentUserId.toString()) {
          status = SeatAvailabilityStatus.LOCKED_BY_ME;
          isLockedByCurrentUser = true;
        } else {
          status = SeatAvailabilityStatus.LOCKED_BY_OTHER;
        }
      }
      // D. Clean Available Seat
      else {
        status = SeatAvailabilityStatus.AVAILABLE;
        stats.availableSeats += 1;
      }

      const formattedSeat = {
        seatId: seat._id,
        seatLabel: seat.seatLabel,
        rowLabel: seat.rowLabel,
        columnNumber: seat.columnNumber,
        gridRow: seat.gridRow,
        gridCol: seat.gridCol,
        categoryCode: categoryCodeUpper,
        categoryName: pricingTier?.categoryName || categoryCodeUpper,
        type: seat.type,
        pricing: {
          basePrice: pricingTier?.basePrice || 0,
          convenienceFee: pricingTier?.convenienceFee || 0,
          taxPercent: pricingTier?.taxPercent || 18,
          effectivePrice: pricingTier?.effectivePrice || 0
        },
        status,
        isLockedByMe: isLockedByCurrentUser,
        accessibility: seat.accessibility || {}
      };

      if (!rowMap.has(seat.rowLabel)) {
        rowMap.set(seat.rowLabel, []);
      }
      rowMap.get(seat.rowLabel).push(formattedSeat);
    }

    // Convert rowMap to ordered array of rows
    const rows = Array.from(rowMap.entries()).map(([rowLabel, seatsInRow]) => ({
      rowLabel,
      seats: seatsInRow.sort((a, b) => a.columnNumber - b.columnNumber)
    }));

    return {
      show: {
        id: show._id,
        movieId: show.movieId,
        movieTitle: show.movieSnapshot?.title,
        theatreId: show.theatreId,
        screenId: show.screenId,
        showDate: show.showDate,
        startTime: show.startTime,
        endTime: show.endTime,
        format: show.format,
        language: show.language,
        status: show.status,
        layoutVersion: show.layoutVersion
      },
      categories: show.pricingTiers || [],
      rows,
      stats
    };
  }
}

export default new SeatAvailabilityService();
