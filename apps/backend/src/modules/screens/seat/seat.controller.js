import SeatService from './seat.service.js';
import ApiResponse from '../../../common/responses/api-response.js';

export class SeatController {
  /**
   * Get all physical seats for a screen and layout version
   */
  static async getSeatsByScreen(req, res, next) {
    try {
      const result = await SeatService.getSeatsByScreen(
        req.params.screenId,
        req.user,
        req.query.version
      );
      return ApiResponse.success(res, {
        message: 'Seats retrieved successfully',
        data: result.seats,
        meta: {
          screenId: result.screenId,
          layoutVersion: result.layoutVersion,
          totalSeats: result.totalSeats
        }
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Get seat by ID
   */
  static async getSeatById(req, res, next) {
    try {
      const seat = await SeatService.getSeatById(req.params.seatId, req.user);
      return ApiResponse.success(res, {
        message: 'Seat details retrieved successfully',
        data: seat
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Update seat details
   */
  static async updateSeat(req, res, next) {
    try {
      const updated = await SeatService.updateSeat(req.params.seatId, req.body, req.user);
      return ApiResponse.success(res, {
        message: 'Seat updated successfully',
        data: updated
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Update seat status
   */
  static async updateSeatStatus(req, res, next) {
    try {
      const updated = await SeatService.updateSeatStatus(
        req.params.seatId,
        req.body.status,
        req.body.isAvailable,
        req.user
      );
      return ApiResponse.success(res, {
        message: 'Seat status updated successfully',
        data: updated
      });
    } catch (error) {
      return next(error);
    }
  }
}

export default SeatController;
