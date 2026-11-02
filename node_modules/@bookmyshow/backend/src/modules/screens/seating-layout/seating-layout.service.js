import mongoose from 'mongoose';
import SeatingLayoutRepository from './seating-layout.repository.js';
import ScreenRepository from '../screen.repository.js';
import SeatRepository from '../seat/seat.repository.js';
import SeatCategoryRepository from '../seat-category/seat-category.repository.js';
import { validateLayout, calculateCapacity, generateBulkSeats } from '../screen.utils.js';
import { LayoutStatus } from '../screen.constants.js';
import { NotFoundError } from '../../../common/errors/not-found.error.js';
import { ValidationError } from '../../../common/errors/validation.error.js';
import { Roles } from '../../auth/auth.constants.js';
import ErrorCodes from '../../../common/constants/error-codes.js';

export class SeatingLayoutService {
  /**
   * Helper: verify screen existence and partner ownership
   */
  static async verifyScreenAccess(screenId, userContext) {
    const screen = await ScreenRepository.findById(screenId);
    if (!screen) {
      throw new NotFoundError('Screen not found', ErrorCodes.SCREEN_NOT_FOUND);
    }

    if (
      userContext.role !== Roles.SYSTEM_ADMIN &&
      String(screen.partnerId._id || screen.partnerId) !== String(userContext.partnerId)
    ) {
      throw new NotFoundError('Screen not found', ErrorCodes.SCREEN_NOT_FOUND);
    }

    return screen;
  }

  /**
   * Get seating layout (draft, latest published, or specific version)
   */
  static async getLayout(screenId, userContext, version = null) {
    await this.verifyScreenAccess(screenId, userContext);

    if (version) {
      const layout = await SeatingLayoutRepository.findByScreenAndVersion(
        screenId,
        Number(version)
      );
      if (!layout) {
        throw new NotFoundError(
          `Layout version ${version} not found for this screen`,
          ErrorCodes.LAYOUT_NOT_FOUND
        );
      }
      return layout;
    }

    // Default: Return draft if exists, else latest published
    const draft = await SeatingLayoutRepository.findDraftByScreen(screenId);
    if (draft) {
      return draft;
    }

    const published = await SeatingLayoutRepository.findLatestPublishedByScreen(screenId);
    return published || null;
  }

  /**
   * Save or update draft seating layout
   */
  static async saveLayoutDraft(screenId, layoutData, userContext) {
    const screen = await this.verifyScreenAccess(screenId, userContext);
    const partnerId = screen.partnerId._id || screen.partnerId;

    // Fetch valid categories for partner
    const categories = await SeatCategoryRepository.findAllForPartner(partnerId);
    const validCodes = categories.map(c => c.code);

    // Validate layout structure
    const validation = validateLayout(layoutData.seats, validCodes);
    if (!validation.isValid) {
      throw new ValidationError('Invalid seating layout specification', ErrorCodes.INVALID_LAYOUT, {
        errors: validation.errors
      });
    }

    // Compute metrics
    const capacity = calculateCapacity(layoutData.seats);

    // Check for existing draft
    const existingDraft = await SeatingLayoutRepository.findDraftByScreen(screenId);

    if (existingDraft) {
      const updated = await SeatingLayoutRepository.updateById(existingDraft._id, {
        name: layoutData.name || existingDraft.name,
        seats: layoutData.seats,
        totalSeats: capacity.totalSeats,
        bookableSeats: capacity.bookableSeats,
        totalRows: capacity.totalRows,
        totalColumns: capacity.totalColumns,
        categoryBreakdown: capacity.categoryBreakdown,
        updatedBy: userContext.id
      });
      return updated;
    }

    // Compute layout version number for new draft
    const latestPublished = await SeatingLayoutRepository.findLatestPublishedByScreen(screenId);
    const nextVersion = latestPublished ? latestPublished.layoutVersion + 1 : 1;

    const newDraft = await SeatingLayoutRepository.create({
      screenId: screen._id,
      theatreId: screen.theatreId._id || screen.theatreId,
      partnerId,
      layoutVersion: nextVersion,
      name: layoutData.name || `Layout v${nextVersion} (Draft)`,
      status: LayoutStatus.DRAFT,
      totalSeats: capacity.totalSeats,
      bookableSeats: capacity.bookableSeats,
      totalRows: capacity.totalRows,
      totalColumns: capacity.totalColumns,
      seats: layoutData.seats,
      categoryBreakdown: capacity.categoryBreakdown,
      createdBy: userContext.id,
      updatedBy: userContext.id
    });

    return newDraft;
  }

  /**
   * Validate a layout without persisting it
   */
  static async validateLayout(screenId, seats, userContext) {
    const screen = await this.verifyScreenAccess(screenId, userContext);
    const partnerId = screen.partnerId._id || screen.partnerId;

    const categories = await SeatCategoryRepository.findAllForPartner(partnerId);
    const validCodes = categories.map(c => c.code);

    const validation = validateLayout(seats, validCodes);
    const capacity = calculateCapacity(seats);

    return {
      isValid: validation.isValid,
      errors: validation.errors,
      capacity
    };
  }

  /**
   * Generate seats in bulk from row specifications
   */
  static async generateBulk(screenId, bulkConfig, userContext) {
    await this.verifyScreenAccess(screenId, userContext);

    const seats = generateBulkSeats(bulkConfig);
    const capacity = calculateCapacity(seats);

    return {
      seats,
      capacity
    };
  }

  /**
   * Preview layout grid and visual summary
   */
  static async previewLayout(screenId, userContext, version = null) {
    const layout = await this.getLayout(screenId, userContext, version);
    if (!layout) {
      throw new NotFoundError('No layout found for preview', ErrorCodes.LAYOUT_NOT_FOUND);
    }

    return {
      screenId: layout.screenId,
      layoutVersion: layout.layoutVersion,
      status: layout.status,
      totalRows: layout.totalRows,
      totalColumns: layout.totalColumns,
      totalSeats: layout.totalSeats,
      bookableSeats: layout.bookableSeats,
      categoryBreakdown: layout.categoryBreakdown,
      seats: layout.seats
    };
  }

  /**
   * Publish draft layout:
   * 1. Validates draft layout integrity
   * 2. Sets new layout version
   * 3. Atomically generates physical seat records in `seats` collection
   * 4. Updates layout status to PUBLISHED and deprecates previous versions
   * 5. Syncs Screen capacity & layout version
   */
  static async publishLayout(screenId, userContext) {
    const screen = await this.verifyScreenAccess(screenId, userContext);
    const partnerId = screen.partnerId._id || screen.partnerId;
    const theatreId = screen.theatreId._id || screen.theatreId;

    const draft = await SeatingLayoutRepository.findDraftByScreen(screenId);
    if (!draft || !draft.seats || draft.seats.length === 0) {
      throw new NotFoundError(
        'No active draft layout found to publish for this screen',
        ErrorCodes.LAYOUT_NOT_FOUND
      );
    }

    // Validate layout before publication
    const categories = await SeatCategoryRepository.findAllForPartner(partnerId);
    const validCodes = categories.map(c => c.code);
    const validation = validateLayout(draft.seats, validCodes);

    if (!validation.isValid) {
      throw new ValidationError('Cannot publish an invalid layout', ErrorCodes.INVALID_LAYOUT, {
        errors: validation.errors
      });
    }

    const latestPublished = await SeatingLayoutRepository.findLatestPublishedByScreen(screenId);
    const newVersion = (latestPublished ? latestPublished.layoutVersion : 0) + 1;
    const capacity = calculateCapacity(draft.seats);

    // Prepare physical seat documents
    const physicalSeats = draft.seats.map(seat => ({
      screenId: screen._id,
      theatreId,
      partnerId,
      layoutVersion: newVersion,
      rowLabel: seat.rowLabel,
      columnNumber: seat.columnNumber,
      seatLabel: seat.seatLabel,
      categoryCode: seat.categoryCode,
      type: seat.type,
      status: seat.status,
      gridRow: seat.gridRow,
      gridCol: seat.gridCol,
      isAvailable: seat.isAvailable,
      accessibility: seat.accessibility
    }));

    // Start session if database is actively connected
    let session = null;
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      try {
        session = await mongoose.startSession();
        session.startTransaction();
      } catch {
        session = null;
      }
    }

    try {
      // 1. Bulk insert physical seats into `seats` collection
      await SeatRepository.bulkInsert(physicalSeats, session);

      // 2. Deprecate previous published versions
      await SeatingLayoutRepository.deprecatePreviousPublished(screen._id, newVersion, session);

      // 3. Mark draft as published with new version
      const publishedLayout = await SeatingLayoutRepository.updateById(
        draft._id,
        {
          layoutVersion: newVersion,
          status: LayoutStatus.PUBLISHED,
          totalSeats: capacity.totalSeats,
          bookableSeats: capacity.bookableSeats,
          totalRows: capacity.totalRows,
          totalColumns: capacity.totalColumns,
          categoryBreakdown: capacity.categoryBreakdown,
          publishedAt: new Date(),
          publishedBy: userContext.id,
          updatedBy: userContext.id
        },
        session
      );

      // 4. Update screen capacity and version
      await ScreenRepository.updateById(
        screen._id,
        {
          layoutVersion: newVersion,
          totalSeats: capacity.totalSeats,
          totalRows: capacity.totalRows,
          totalColumns: capacity.totalColumns,
          updatedBy: userContext.id
        },
        session
      );

      if (session) {
        await session.commitTransaction();
        session.endSession();
      }

      return {
        message: 'Seating layout successfully published',
        layout: publishedLayout,
        version: newVersion,
        totalSeats: capacity.totalSeats,
        bookableSeats: capacity.bookableSeats
      };
    } catch (err) {
      if (session) {
        await session.abortTransaction();
        session.endSession();
      }
      throw err;
    }
  }

  /**
   * Get all version summaries for a screen
   */
  static async getLayoutVersions(screenId, userContext) {
    await this.verifyScreenAccess(screenId, userContext);
    return SeatingLayoutRepository.findVersionsByScreen(screenId);
  }
}

export default SeatingLayoutService;
