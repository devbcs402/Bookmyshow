import ScreenRepository from './screen.repository.js';
import TheatreRepository from '../theatres/theatre.repository.js';
import { NotFoundError } from '../../common/errors/not-found.error.js';
import { ConflictError } from '../../common/errors/conflict.error.js';
import { AuthorizationError } from '../../common/errors/authorization.error.js';
import { Roles } from '../auth/auth.constants.js';
import ErrorCodes from '../../common/constants/error-codes.js';

export class ScreenService {
  /**
   * Helper: verify theatre access for current partner
   */
  static async verifyTheatreAccess(theatreId, userContext) {
    const theatre = await TheatreRepository.findById(theatreId);
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

    return theatre;
  }

  /**
   * Create a new screen under a theatre
   */
  static async createScreen(theatreId, screenData, userContext) {
    if (!userContext || !userContext.id) {
      throw new AuthorizationError('Authentication required');
    }

    const theatre = await this.verifyTheatreAccess(theatreId, userContext);
    const partnerId = theatre.partnerId?._id || theatre.partnerId;

    // Check duplicate screen number in the same theatre
    const existing = await ScreenRepository.findByTheatreAndNumber(
      theatreId,
      screenData.screenNumber
    );
    if (existing) {
      throw new ConflictError(
        `Screen number ${screenData.screenNumber} already exists in this theatre`,
        ErrorCodes.CONFLICT
      );
    }

    const screen = await ScreenRepository.create({
      ...screenData,
      theatreId: theatre._id,
      partnerId,
      createdBy: userContext.id
    });

    return screen;
  }

  /**
   * List screens for a theatre
   */
  static async getScreensByTheatre(theatreId, userContext, options = {}) {
    await this.verifyTheatreAccess(theatreId, userContext);
    return ScreenRepository.findScreens({ theatreId }, options);
  }

  /**
   * Get single screen by ID with ownership verification
   */
  static async getScreenById(screenId, userContext) {
    const screen = await ScreenRepository.findById(screenId);
    if (!screen) {
      throw new NotFoundError('Screen not found', ErrorCodes.SCREEN_NOT_FOUND);
    }

    const screenPartnerId = screen.partnerId?._id || screen.partnerId;
    if (
      userContext.role !== Roles.SYSTEM_ADMIN &&
      String(screenPartnerId) !== String(userContext.partnerId)
    ) {
      throw new NotFoundError('Screen not found', ErrorCodes.SCREEN_NOT_FOUND);
    }

    return screen;
  }

  /**
   * Update screen details
   */
  static async updateScreen(screenId, updateData, userContext) {
    const screen = await this.getScreenById(screenId, userContext);

    // If changing screenNumber, ensure uniqueness within same theatre
    if (updateData.screenNumber && updateData.screenNumber !== screen.screenNumber) {
      const existing = await ScreenRepository.findByTheatreAndNumber(
        screen.theatreId?._id || screen.theatreId,
        updateData.screenNumber
      );
      if (existing && String(existing._id) !== String(screenId)) {
        throw new ConflictError(
          `Screen number ${updateData.screenNumber} already exists in this theatre`,
          ErrorCodes.CONFLICT
        );
      }
    }

    const updated = await ScreenRepository.updateById(screenId, {
      ...updateData,
      updatedBy: userContext.id
    });

    return updated;
  }

  /**
   * Update screen operational status
   */
  static async updateScreenStatus(screenId, status, userContext) {
    await this.getScreenById(screenId, userContext);

    const updated = await ScreenRepository.updateById(screenId, {
      status,
      updatedBy: userContext.id
    });

    return updated;
  }

  /**
   * Soft delete screen
   */
  static async deleteScreen(screenId, userContext) {
    await this.getScreenById(screenId, userContext);

    await ScreenRepository.softDelete(screenId, userContext.id);
    return {
      success: true,
      message: 'Screen deleted successfully'
    };
  }

  /**
   * Admin: List all screens across platform
   */
  static async adminListScreens(filter = {}, options = {}) {
    return ScreenRepository.findScreens(filter, options);
  }

  /**
   * Admin: Get screen details
   */
  static async adminGetScreenById(screenId) {
    const screen = await ScreenRepository.findById(screenId);
    if (!screen) {
      throw new NotFoundError('Screen not found', ErrorCodes.SCREEN_NOT_FOUND);
    }
    return screen;
  }

  /**
   * Admin: Update screen
   */
  static async adminUpdateScreen(screenId, updateData, userContext) {
    const screen = await ScreenRepository.findById(screenId);
    if (!screen) {
      throw new NotFoundError('Screen not found', ErrorCodes.SCREEN_NOT_FOUND);
    }

    const updated = await ScreenRepository.updateById(screenId, {
      ...updateData,
      updatedBy: userContext.id
    });

    return updated;
  }
}

export default ScreenService;
