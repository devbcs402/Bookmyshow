import { Router } from 'express';
import BookingController from './booking.controller.js';
import {
  authenticate,
  authorizeRoles,
  authorizePermission
} from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import {
  createBookingValidation,
  bookingIdParamValidation,
  cancelBookingValidation,
  customerBookingsQueryValidation,
  partnerBookingsQueryValidation
} from './booking.validation.js';
import { Roles, Permissions } from '../auth/auth.constants.js';

/* =========================================================================
 * 1. CUSTOMER & PUBLIC BOOKING ROUTES (Mounted under /api/v1/bookings)
 * ========================================================================= */
export const bookingRoutes = Router();

bookingRoutes.use(authenticate);

/**
 * @openapi
 * /bookings:
 *   post:
 *     tags:
 *       - Bookings
 *     summary: Create a pending-payment booking from active seat locks
 *     description: >-
 *       Atomically creates a booking in PENDING_PAYMENT state using valid Redis seat locks.
 *       Verifies show eligibility, screen layout belonging, seat lock ownership, and absence of
 *       durable confirmed bookings. Calculates server-side pricing and stores immutable snapshots.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: header
 *         name: idempotency-key
 *         required: false
 *         schema:
 *           type: string
 *         description: Client idempotency key to prevent duplicate booking creation
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - showId
 *               - seatIds
 *             properties:
 *               showId:
 *                 type: string
 *                 example: 67220b3f81e7d23a104f9b01
 *               seatIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   example: 65f1a2b3c4d5e6f7a8b9c0f3
 *                 minItems: 1
 *                 maxItems: 10
 *     responses:
 *       201:
 *         description: Booking successfully created in PENDING_PAYMENT state
 *       400:
 *         description: Invalid request payload or seat count exceeded
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Show or seats not found
 *       409:
 *         description: Seat already booked, lock expired, or ownership mismatch
 */
bookingRoutes.post('/', validate(createBookingValidation), BookingController.createBooking);

/**
 * @openapi
 * /bookings/me:
 *   get:
 *     tags:
 *       - Bookings
 *     summary: Get booking history for authenticated customer
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Customer booking history retrieved successfully
 */
bookingRoutes.get(
  '/me',
  validate(customerBookingsQueryValidation),
  BookingController.getMyBookings
);

/**
 * @openapi
 * /bookings/{bookingId}:
 *   get:
 *     tags:
 *       - Bookings
 *     summary: Get details of a single booking
 *     description: >-
 *       Returns complete booking details, movie/theatre snapshots, pricing breakdown,
 *       and cryptographically signed ticket QR code payload.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Booking details retrieved successfully
 *       404:
 *         description: Booking not found under user account
 */
bookingRoutes.get(
  '/:bookingId',
  validate(bookingIdParamValidation),
  BookingController.getBookingById
);

/**
 * @openapi
 * /bookings/{bookingId}/cancel:
 *   post:
 *     tags:
 *       - Bookings
 *     summary: Cancel an eligible booking
 *     description: >-
 *       Cancels a booking according to platform business rules and cutoff windows.
 *       Releases reserved seats back into inventory and updates real-time availability.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 example: Change of plans
 *     responses:
 *       200:
 *         description: Booking cancelled successfully
 *       400:
 *         description: Booking not cancellable due to cutoff policy
 *       404:
 *         description: Booking not found
 *       409:
 *         description: Booking already cancelled or expired
 */
bookingRoutes.post(
  '/:bookingId/cancel',
  validate(cancelBookingValidation),
  BookingController.cancelBooking
);

/* =========================================================================
 * 2. THEATRE OWNER BOOKING ROUTES (Mounted under /api/v1/owner/bookings)
 * ========================================================================= */
export const bookingOwnerRoutes = Router();

bookingOwnerRoutes.use(authenticate);
bookingOwnerRoutes.use(
  authorizeRoles(Roles.THEATRE_OWNER, Roles.THEATRE_MANAGER, Roles.SUPER_ADMIN)
);

bookingOwnerRoutes.get(
  '/',
  authorizePermission(Permissions.BOOKING_READ),
  validate(partnerBookingsQueryValidation),
  BookingController.getPartnerBookings
);

export default bookingRoutes;
