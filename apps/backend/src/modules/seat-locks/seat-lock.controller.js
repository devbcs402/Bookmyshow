import seatAvailabilityService from './seat-availability.service.js';
import seatLockService from './seat-lock.service.js';
import ApiResponse from '../../common/responses/api-response.js';
import HttpStatus from '../../common/constants/http-status.js';

export class SeatLockController {
  /**
   * Retrieves seating layout and real-time seat availability for a specific show.
   * GET /api/v1/shows/:showId/seats
   */
  async getSeatAvailability(req, res, next) {
    try {
      const { showId } = req.params;
      const currentUserId = req.user?.id || null;

      const data = await seatAvailabilityService.getShowSeatAvailability(showId, currentUserId);
      return ApiResponse.success(res, {
        statusCode: HttpStatus.OK,
        message: 'Seat availability retrieved successfully',
        data
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Atomically acquires temporary holds on multiple seats for the authenticated customer.
   * POST /api/v1/shows/:showId/seat-locks
   */
  async acquireSeatLocks(req, res, next) {
    try {
      const { showId } = req.params;
      const { seatIds } = req.body;
      const idempotencyKey = req.body.idempotencyKey || req.headers['x-idempotency-key'] || null;

      const data = await seatLockService.acquireSeatLocks(
        { showId, seatIds, idempotencyKey },
        req.user
      );
      return ApiResponse.created(res, {
        message: 'Temporary seat locks acquired successfully',
        data
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Safely releases temporary seat locks held by the authenticated customer.
   * DELETE /api/v1/shows/:showId/seat-locks
   */
  async releaseSeatLocks(req, res, next) {
    try {
      const { showId } = req.params;
      const { seatIds, lockId } = req.body;

      const data = await seatLockService.releaseSeatLocks({ showId, seatIds, lockId }, req.user);
      return ApiResponse.success(res, {
        statusCode: HttpStatus.OK,
        message: 'Temporary seat locks released successfully',
        data
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Extends the duration of temporary seat locks held by the authenticated customer.
   * PATCH /api/v1/shows/:showId/seat-locks/renew
   */
  async renewSeatLocks(req, res, next) {
    try {
      const { showId } = req.params;
      const { seatIds, lockId } = req.body;

      const data = await seatLockService.renewSeatLocks({ showId, seatIds, lockId }, req.user);
      return ApiResponse.success(res, {
        statusCode: HttpStatus.OK,
        message: 'Seat locks renewed successfully',
        data
      });
    } catch (error) {
      return next(error);
    }
  }
}

export default new SeatLockController();
