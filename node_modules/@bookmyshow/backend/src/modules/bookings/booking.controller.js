import { bookingService } from './booking.service.js';
import ApiResponse from '../../common/responses/api-response.js';
import PaginationMeta from '../../common/responses/pagination-meta.js';

export class BookingController {
  /**
   * Creates a new pending-payment booking with atomic seat reservation.
   * POST /api/v1/bookings
   */
  static async createBooking(req, res, next) {
    try {
      const customerId = req.user.id;
      const idempotencyKey =
        req.headers['idempotency-key'] || req.headers['x-idempotency-key'] || null;

      const booking = await bookingService.createBooking(customerId, req.body, idempotencyKey);

      return ApiResponse.created(res, {
        message: 'Booking created successfully in PENDING_PAYMENT state',
        data: booking
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * Retrieves single booking details.
   * GET /api/v1/bookings/:bookingId
   */
  static async getBookingById(req, res, next) {
    try {
      const booking = await bookingService.getBookingById(req.params.bookingId, req.user);

      return ApiResponse.success(res, {
        message: 'Booking details retrieved successfully',
        data: booking
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * Retrieves authenticated customer's personal booking history.
   * GET /api/v1/users/me/bookings
   */
  static async getMyBookings(req, res, next) {
    try {
      const customerId = req.user.id;
      const { bookings, total } = await bookingService.getCustomerBookings(customerId, req.query);

      const meta = new PaginationMeta({
        totalRecords: total,
        currentPage: Number(req.query.page) || 1,
        pageSize: Number(req.query.limit) || 10
      });

      return ApiResponse.success(res, {
        message: 'Booking history retrieved successfully',
        data: bookings,
        meta
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * Cancels an eligible booking.
   * POST /api/v1/bookings/:bookingId/cancel
   */
  static async cancelBooking(req, res, next) {
    try {
      const { bookingId } = req.params;
      const reason = req.body?.reason || '';

      const cancelledBooking = await bookingService.cancelBooking(bookingId, req.user, reason);

      return ApiResponse.success(res, {
        message: 'Booking cancelled successfully',
        data: cancelledBooking
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * Retrieves bookings for a theatre partner (theatre owner).
   * GET /api/v1/owner/bookings
   */
  static async getPartnerBookings(req, res, next) {
    try {
      const partnerId = req.user.partnerId;
      const { bookings, total } = await bookingService.getPartnerBookings(partnerId, req.query);

      const meta = new PaginationMeta({
        totalRecords: total,
        currentPage: Number(req.query.page) || 1,
        pageSize: Number(req.query.limit) || 10
      });

      return ApiResponse.success(res, {
        message: 'Partner bookings retrieved successfully',
        data: bookings,
        meta
      });
    } catch (err) {
      return next(err);
    }
  }
}

export default BookingController;
