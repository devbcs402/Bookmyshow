import SeatRepository from './seat.repository.js';
import ScreenRepository from '../screen.repository.js';
import { NotFoundError } from '../../../common/errors/not-found.error.js';
import { Roles } from '../../auth/auth.constants.js';
import ErrorCodes from '../../../common/constants/error-codes.js';

export class SeatService {
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
   * Get all physical seats for a screen and layout version
   */
  static async getSeatsByScreen(screenId, userContext, version = null) {
    const screen = await this.verifyScreenAccess(screenId, userContext);
    const layoutVersion = version ? Number(version) : screen.layoutVersion;

    const seats = await SeatRepository.findSeatsByScreenAndVersion(screenId, layoutVersion);
    return {
      screenId: screen._id,
      layoutVersion,
      totalSeats: seats.length,
      seats
    };
  }

  /**
   * Get physical seat by ID with ownership verification
   */
  static async getSeatById(seatId, userContext) {
    const seat = await SeatRepository.findById(seatId);
    if (!seat) {
      throw new NotFoundError('Seat not found', ErrorCodes.SEAT_NOT_FOUND);
    }

    if (
      userContext.role !== Roles.SYSTEM_ADMIN &&
      String(seat.partnerId) !== String(userContext.partnerId)
    ) {
      throw new NotFoundError('Seat not found', ErrorCodes.SEAT_NOT_FOUND);
    }

    return seat;
  }

  /**
   * Update individual physical seat attributes
   */
  static async updateSeat(seatId, updateData, userContext) {
    await this.getSeatById(seatId, userContext);
    const updated = await SeatRepository.updateById(seatId, updateData);
    return updated;
  }

  /**
   * Update individual physical seat status / availability
   */
  static async updateSeatStatus(seatId, status, isAvailable, userContext) {
    await this.getSeatById(seatId, userContext);

    const updatePayload = { status };
    if (typeof isAvailable === 'boolean') {
      updatePayload.isAvailable = isAvailable;
    } else if (status !== 'ACTIVE') {
      updatePayload.isAvailable = false;
    }

    const updated = await SeatRepository.updateById(seatId, updatePayload);
    return updated;
  }
}

export default SeatService;

