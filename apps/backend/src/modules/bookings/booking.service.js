import mongoose from 'mongoose';
import crypto from 'crypto';
import config from '../../config/env.js';
import logger from '../../config/logger.js';
import redisConfig from '../../config/redis.js';
import { BookingStatus, BookingRedisKeys, BookingDefaults } from './booking.constants.js';
import { bookingRepository } from './booking.repository.js';
import { BookingPricingService } from './booking-pricing.service.js';
import { BookingStatusService } from './booking-status.service.js';
import { BookingReferenceService } from './booking-reference.service.js';
import { BookingQrService } from './booking-qr.service.js';
import { BookingExpirationService } from './booking-expiration.service.js';

import Show from '../shows/show.model.js';
import Seat from '../screens/seat/seat.model.js';
import Theatre from '../theatres/model/theatre.model.js';
import Screen from '../screens/screen.model.js';
import { redisLockService } from '../seat-locks/redis-lock.service.js';
import { seatLockSocket } from '../seat-locks/seat-lock.socket.js';

import { AppError } from '../../common/errors/app.error.js';
import HttpStatus from '../../common/constants/http-status.js';
import ErrorCodes from '../../common/constants/error-codes.js';
import { Roles } from '../auth/auth.constants.js';

export class BookingService {
  /**
   * Hashes a request payload to detect idempotency collisions.
   * @param {string} showId
   * @param {Array<string>} seatIds
   * @returns {string} SHA-256 fingerprint
   */
  static hashPayload(showId, seatIds) {
    const sorted = [...seatIds].map(s => s.toString()).sort();
    return crypto
      .createHash('sha256')
      .update(`${showId}:${sorted.join(',')}`)
      .digest('hex');
  }

  /**
   * Creates a pending-payment booking with atomic multi-seat reservation and server-side pricing.
   *
   * @param {string} customerId Authenticated customer's MongoDB ObjectId
   * @param {Object} payload
   * @param {string} payload.showId
   * @param {Array<string>} payload.seatIds Array of seat ObjectIds
   * @param {string} [idempotencyKey=null] Optional client idempotency key
   * @returns {Promise<Object>} Created booking record
   */
  async createBooking(customerId, payload, idempotencyKey = null) {
    const { showId, seatIds } = payload;

    if (!showId || !Array.isArray(seatIds) || seatIds.length === 0) {
      throw new AppError(
        'Show ID and seat IDs array are mandatory',
        HttpStatus.BAD_REQUEST,
        ErrorCodes.VALIDATION_ERROR
      );
    }

    if (seatIds.length > BookingDefaults.MAX_SEATS_PER_BOOKING) {
      throw new AppError(
        `Cannot book more than ${BookingDefaults.MAX_SEATS_PER_BOOKING} seats per transaction`,
        HttpStatus.BAD_REQUEST,
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // Deduplicate requested seat IDs
    const uniqueSeatIds = Array.from(new Set(seatIds.map(id => id.toString())));
    if (uniqueSeatIds.length !== seatIds.length) {
      throw new AppError(
        'Duplicate seat IDs detected in request',
        HttpStatus.BAD_REQUEST,
        ErrorCodes.VALIDATION_ERROR
      );
    }

    const redisClient = redisConfig.getRedisClient();

    // 1. Idempotency Check & Fingerprint Guard
    const payloadFingerprint = BookingService.hashPayload(showId, uniqueSeatIds);
    let idempotencyRedisKey = null;

    if (idempotencyKey && redisClient) {
      idempotencyRedisKey = `${BookingRedisKeys.IDEMPOTENCY_PREFIX}:${customerId}:${idempotencyKey}`;
      try {
        const cached = await redisClient.get(idempotencyRedisKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.fingerprint === payloadFingerprint) {
            logger.info(
              { customerId, idempotencyKey },
              'Idempotent booking request served from cache'
            );
            return parsed.booking;
          }
          throw new AppError(
            'Idempotency key reused with different booking payload',
            HttpStatus.CONFLICT,
            ErrorCodes.IDEMPOTENCY_CONFLICT
          );
        }
      } catch (err) {
        if (err instanceof AppError) {
          throw err;
        }
        logger.warn(
          { err: err.message },
          'Redis idempotency read warning; proceeding with creation'
        );
      }
    }

    // 2. Validate Show Existence & Bookability
    const show = await Show.findById(showId).lean();
    if (!show) {
      throw new AppError('Show not found', HttpStatus.NOT_FOUND, ErrorCodes.SHOW_NOT_FOUND);
    }

    if (show.status !== 'PUBLISHED') {
      throw new AppError(
        'Show is not published or bookable',
        HttpStatus.CONFLICT,
        ErrorCodes.SHOW_NOT_BOOKABLE
      );
    }

    if (new Date(show.startTime).getTime() <= Date.now()) {
      throw new AppError(
        'Show has already started or booking has closed',
        HttpStatus.CONFLICT,
        ErrorCodes.SHOW_ALREADY_STARTED
      );
    }

    // 3. Verify Redis Temporary Seat Locks (Enforce Ownership & Active Status)
    for (const seatId of uniqueSeatIds) {
      const lockKey = `seatlock:${showId}:${seatId}`;
      let lockData = null;

      if (redisClient) {
        const raw = await redisClient.get(lockKey);
        if (raw) {
          try {
            lockData = JSON.parse(raw);
          } catch (_e) {
            lockData = null;
          }
        }
      }

      if (!lockData) {
        throw new AppError(
          `Seat lock has expired or does not exist for seat ID ${seatId}. Please lock your seats first.`,
          HttpStatus.CONFLICT,
          ErrorCodes.LOCK_EXPIRED
        );
      }

      if (lockData.userId.toString() !== customerId.toString()) {
        throw new AppError(
          `Seat lock for seat ID ${seatId} belongs to another user. Booking access denied.`,
          HttpStatus.FORBIDDEN,
          ErrorCodes.LOCK_OWNERSHIP_MISMATCH
        );
      }
    }

    // 4. Verify Absence of Conflicting Durable Bookings in MongoDB
    const conflictingBookings = await bookingRepository.findConflictingActiveBookings(
      showId,
      uniqueSeatIds
    );
    if (conflictingBookings && conflictingBookings.length > 0) {
      throw new AppError(
        'One or more selected seats have already been reserved or booked',
        HttpStatus.CONFLICT,
        ErrorCodes.SEAT_ALREADY_BOOKED
      );
    }

    // 5. Query & Validate Physical Seats in Screen Layout
    const physicalSeats = await Seat.find({
      _id: { $in: uniqueSeatIds },
      screenId: show.screenId,
      layoutVersion: show.layoutVersion
    }).lean();

    if (physicalSeats.length !== uniqueSeatIds.length) {
      throw new AppError(
        'One or more requested seats are invalid or do not belong to the show layout',
        HttpStatus.BAD_REQUEST,
        ErrorCodes.SEAT_INVALID_FOR_SHOW
      );
    }

    for (const seat of physicalSeats) {
      if (
        seat.status === 'MAINTENANCE' ||
        seat.status === 'INACTIVE' ||
        seat.status === 'BLOCKED'
      ) {
        throw new AppError(
          `Seat ${seat.seatLabel} is currently under maintenance or unavailable for booking`,
          HttpStatus.CONFLICT,
          ErrorCodes.SEAT_UNAVAILABLE
        );
      }
    }

    // 6. Fetch Theatre and Screen for Snapshot
    const [theatre, screen] = await Promise.all([
      Theatre.findById(show.theatreId).lean(),
      Screen.findById(show.screenId).lean()
    ]);

    const theatreName = theatre ? theatre.name : 'Cinema Theatre';
    const theatreAddress = theatre?.address
      ? `${theatre.address.street || ''}, ${theatre.address.area || ''}, ${theatre.address.cityName || ''}`.trim()
      : '';
    const screenName = screen ? screen.name : `Screen ${show.screenId}`;

    // 7. Calculate Server-Side Pricing Snapshot
    const pricingBreakdown = BookingPricingService.calculateBookingPrice(
      physicalSeats,
      show.pricingTiers
    );

    // 8. Generate Unique Booking Reference & Signed QR Payload
    const bookingReference = await BookingReferenceService.generateUniqueReference(ref =>
      bookingRepository.existsByReference(ref)
    );

    const seatSummary = physicalSeats.map(s => s.seatLabel).join(', ');
    const paymentWindowSeconds =
      config.BOOKING_PAYMENT_WINDOW_SECONDS || BookingDefaults.DEFAULT_PAYMENT_WINDOW_SECONDS;
    const expiresAt = new Date(Date.now() + paymentWindowSeconds * 1000);

    const snapshot = {
      movieTitle: show.movieSnapshot?.title || 'Featured Film',
      moviePosterUrl: show.movieSnapshot?.posterUrl || '',
      censorRating: show.movieSnapshot?.censorRating || 'UA',
      durationMins: show.movieSnapshot?.durationMins || 120,
      format: show.format || '2D',
      language: show.language || 'English',
      theatreName,
      theatreAddress,
      screenName,
      showStartTime: show.startTime,
      showEndTime: show.endTime,
      seatSummary
    };

    const initialStatusHistory = [
      BookingStatusService.createStatusHistoryEntry(
        BookingStatus.PENDING_PAYMENT,
        customerId,
        'Booking checkout initiated; awaiting payment'
      )
    ];

    const bookingDoc = {
      bookingReference,
      customerId,
      partnerId: show.partnerId,
      theatreId: show.theatreId,
      branchId: show.branchId || null,
      screenId: show.screenId,
      showId: show._id,
      movieId: show.movieId,
      seats: pricingBreakdown.seatLineItems,
      totalSeats: uniqueSeatIds.length,
      baseAmount: pricingBreakdown.baseAmount,
      convenienceFee: pricingBreakdown.convenienceFee,
      taxAmount: pricingBreakdown.taxAmount,
      discountAmount: pricingBreakdown.discountAmount,
      netPayableAmount: pricingBreakdown.netPayableAmount,
      currency: pricingBreakdown.currency,
      status: BookingStatus.PENDING_PAYMENT,
      snapshot,
      statusHistory: initialStatusHistory,
      expiresAt,
      idempotencyKey
    };

    // Generate cryptographic QR verification token
    bookingDoc.qrCodePayload = BookingQrService.generateQrPayload(bookingDoc);

    // 9. Persist Booking inside MongoDB Session / Transaction
    let createdBooking = null;
    let session = null;

    if (mongoose.connection.readyState === 1) {
      try {
        session = await mongoose.startSession();
        session.startTransaction();
      } catch (_e) {
        session = null;
      }
    }

    try {
      createdBooking = await bookingRepository.create(bookingDoc, session);
      if (session) {
        await session.commitTransaction();
      }
    } catch (err) {
      if (session) {
        await session.abortTransaction();
      }
      if (err.code === 11000) {
        throw new AppError(
          'One or more seats have already been reserved or booked by another customer',
          HttpStatus.CONFLICT,
          ErrorCodes.SEAT_ALREADY_BOOKED
        );
      }
      throw err;
    } finally {
      if (session) {
        session.endSession();
      }
    }

    // 10. Register into Redis Expiration Index
    await BookingExpirationService.scheduleExpirationIndex(createdBooking._id, expiresAt);

    // 11. Cache Idempotency Result
    if (idempotencyRedisKey && redisClient) {
      try {
        const idempotencyPayload = {
          fingerprint: payloadFingerprint,
          booking: createdBooking.toObject ? createdBooking.toObject() : createdBooking
        };
        await redisClient.set(
          idempotencyRedisKey,
          JSON.stringify(idempotencyPayload),
          'EX',
          BookingDefaults.IDEMPOTENCY_TTL_SECONDS
        );
      } catch (cacheErr) {
        logger.debug({ err: cacheErr.message }, 'Failed to cache idempotency booking response');
      }
    }

    // 12. Broadcast Real-Time Availability & Booking Event to Socket Room
    try {
      seatLockSocket.emitSeatBooked(showId.toString(), uniqueSeatIds);
      seatLockSocket.emitAvailabilityUpdated(showId.toString(), {
        reason: 'BOOKING_PENDING'
      });
    } catch (socketErr) {
      logger.debug({ err: socketErr.message }, 'Socket broadcast warning on booking creation');
    }

    logger.info(
      {
        bookingId: createdBooking._id,
        reference: bookingReference,
        customerId,
        totalSeats: uniqueSeatIds.length
      },
      'Booking successfully created in PENDING_PAYMENT state'
    );

    return createdBooking;
  }

  /**
   * Retrieves a booking by primary ID with strict role-based access control and tenant isolation.
   *
   * @param {string} bookingId
   * @param {Object} currentUser Authenticated request user { id, role, partnerId }
   * @returns {Promise<Object>}
   */
  async getBookingById(bookingId, currentUser) {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) {
      throw new AppError('Booking not found', HttpStatus.NOT_FOUND, ErrorCodes.BOOKING_NOT_FOUND);
    }

    // Role-Based Ownership & Tenancy Verification
    if (currentUser.role === Roles.CUSTOMER) {
      if (booking.customerId.toString() !== currentUser.id.toString()) {
        // Return 404 to avoid enumeration / IDOR attacks
        throw new AppError(
          'Booking not found under your account',
          HttpStatus.NOT_FOUND,
          ErrorCodes.BOOKING_NOT_FOUND
        );
      }
    } else if (
      currentUser.role === Roles.THEATRE_OWNER ||
      currentUser.role === Roles.THEATRE_MANAGER
    ) {
      if (booking.partnerId.toString() !== currentUser.partnerId?.toString()) {
        throw new AppError(
          'Booking not found under your cinema organization',
          HttpStatus.NOT_FOUND,
          ErrorCodes.BOOKING_NOT_FOUND
        );
      }
    } else if (currentUser.role !== Roles.SUPER_ADMIN) {
      throw new AppError(
        'Access to booking details denied',
        HttpStatus.FORBIDDEN,
        ErrorCodes.FORBIDDEN
      );
    }

    const ticketView = BookingQrService.buildTicketPayload(booking);
    return {
      ...(booking.toObject ? booking.toObject() : booking),
      ticketView
    };
  }

  /**
   * Retrieves paginated bookings for the authenticated customer.
   *
   * @param {string} customerId
   * @param {Object} queryOptions
   * @returns {Promise<{ bookings: Array<Object>, total: number }>}
   */
  async getCustomerBookings(customerId, queryOptions = {}) {
    return bookingRepository.findCustomerBookings(customerId, queryOptions);
  }

  /**
   * Retrieves paginated bookings for a theatre partner (theatre owner).
   *
   * @param {string} partnerId
   * @param {Object} queryOptions
   * @returns {Promise<{ bookings: Array<Object>, total: number }>}
   */
  async getPartnerBookings(partnerId, queryOptions = {}) {
    return bookingRepository.findPartnerBookings(partnerId, queryOptions);
  }

  /**
   * Cancels a booking according to business rules, cutoff windows, and ownership.
   *
   * @param {string} bookingId
   * @param {Object} currentUser
   * @param {string} [reason='']
   * @returns {Promise<Object>} Cancelled booking record
   */
  async cancelBooking(bookingId, currentUser, reason = '') {
    const booking = await bookingRepository.findById(bookingId);
    if (!booking) {
      throw new AppError('Booking not found', HttpStatus.NOT_FOUND, ErrorCodes.BOOKING_NOT_FOUND);
    }

    // Ownership Verification
    if (currentUser.role === Roles.CUSTOMER) {
      if (booking.customerId.toString() !== currentUser.id.toString()) {
        throw new AppError(
          'You do not have permission to cancel this booking',
          HttpStatus.FORBIDDEN,
          ErrorCodes.FORBIDDEN
        );
      }
    } else if (
      currentUser.role === Roles.THEATRE_OWNER ||
      currentUser.role === Roles.THEATRE_MANAGER
    ) {
      if (booking.partnerId.toString() !== currentUser.partnerId?.toString()) {
        throw new AppError(
          'Booking not found under your organization',
          HttpStatus.FORBIDDEN,
          ErrorCodes.FORBIDDEN
        );
      }
    } else if (currentUser.role !== Roles.SUPER_ADMIN) {
      throw new AppError(
        'You do not have permission to cancel this booking',
        HttpStatus.FORBIDDEN,
        ErrorCodes.FORBIDDEN
      );
    }

    // Status Transition Validation
    BookingStatusService.validateTransition(booking.status, BookingStatus.CANCELLED, {
      role: currentUser.role,
      showStartTime: booking.snapshot?.showStartTime,
      cancellationCutoffHours:
        config.BOOKING_CANCELLATION_CUTOFF_HOURS || BookingDefaults.CANCELLATION_CUTOFF_HOURS
    });

    const cancellationDetails = {
      cancelledAt: new Date(),
      reason: reason || 'Customer requested cancellation',
      initiatedBy: currentUser.id,
      refundPercentage: booking.status === BookingStatus.CONFIRMED ? 100 : 0,
      refundAmount: booking.status === BookingStatus.CONFIRMED ? booking.baseAmount : 0,
      nonRefundableFee: booking.status === BookingStatus.CONFIRMED ? booking.convenienceFee : 0
    };

    const statusHistoryEntry = BookingStatusService.createStatusHistoryEntry(
      BookingStatus.CANCELLED,
      currentUser.id,
      reason || 'Cancelled by user'
    );

    let session = null;
    if (mongoose.connection.readyState === 1) {
      try {
        session = await mongoose.startSession();
        session.startTransaction();
      } catch (_e) {
        session = null;
      }
    }

    let updatedBooking = null;
    try {
      updatedBooking = await bookingRepository.cancelBooking(
        bookingId,
        cancellationDetails,
        statusHistoryEntry,
        session
      );
      if (session) {
        await session.commitTransaction();
      }
    } catch (err) {
      if (session) {
        await session.abortTransaction();
      }
      throw err;
    } finally {
      if (session) {
        session.endSession();
      }
    }

    // Remove from expiration index
    await BookingExpirationService.removeExpirationIndex(bookingId);

    // Release Redis locks if still held
    if (Array.isArray(booking.seats) && booking.seats.length > 0) {
      const seatIds = booking.seats.map(s => (s.seatId ? s.seatId.toString() : s.seatId));
      try {
        await redisLockService.releaseLocks(
          booking.showId.toString(),
          seatIds,
          booking.bookingReference,
          booking.customerId.toString()
        );
      } catch (_releaseErr) {
        // Ignored if keys already released or expired
      }

      // Broadcast real-time availability updates
      try {
        seatLockSocket.emitSeatReleased(booking.showId.toString(), seatIds);
        seatLockSocket.emitAvailabilityUpdated(booking.showId.toString(), {
          reason: 'BOOKING_CANCELLED'
        });
      } catch (_socketErr) {
        // Socket broadcast best-effort
      }
    }

    logger.info(
      { bookingId, reference: booking.bookingReference },
      'Booking cancelled successfully'
    );
    return updatedBooking;
  }

  /**
   * Confirms a booking upon cryptographically verified payment.
   *
   * @param {string} bookingId
   * @param {Object} paymentData
   * @param {string|null} [actorId=null]
   * @param {import('mongoose').ClientSession|null} [session=null]
   * @returns {Promise<Object>} Confirmed booking record
   */
  async confirmBooking(bookingId, paymentData, actorId = null, session = null) {
    const booking = await bookingRepository.findById(bookingId, session);
    if (!booking) {
      throw new AppError('Booking not found', HttpStatus.NOT_FOUND, ErrorCodes.BOOKING_NOT_FOUND);
    }

    if (booking.status === BookingStatus.CONFIRMED) {
      logger.info(
        { bookingId, reference: booking.bookingReference },
        'Booking is already confirmed; returning idempotent record'
      );
      return booking;
    }

    // Validate Transition to CONFIRMED
    BookingStatusService.validateTransition(booking.status, BookingStatus.CONFIRMED, {
      isVerifiedPayment: true,
      role: 'SYSTEM'
    });

    const statusHistoryEntry = BookingStatusService.createStatusHistoryEntry(
      BookingStatus.CONFIRMED,
      actorId,
      'Payment verified and captured; booking confirmed'
    );

    const paymentDetails = {
      paymentId: paymentData.paymentId,
      gateway: paymentData.gateway || 'RAZORPAY',
      razorpayPaymentId: paymentData.razorpayPaymentId || null,
      razorpayOrderId: paymentData.razorpayOrderId || null,
      paidAmount: paymentData.amount || booking.netPayableAmount,
      paidAt: paymentData.capturedAt || new Date()
    };

    const confirmedBooking = await bookingRepository.confirmBooking(
      bookingId,
      paymentDetails,
      statusHistoryEntry,
      session
    );

    // Remove from Redis expiration sorted set
    await BookingExpirationService.removeExpirationIndex(bookingId);

    // Release ephemeral Redis locks since seats are now durably confirmed in MongoDB
    if (Array.isArray(booking.seats) && booking.seats.length > 0) {
      const seatIds = booking.seats.map(s => (s.seatId ? s.seatId.toString() : s.seatId));
      try {
        await redisLockService.releaseLocks(
          booking.showId.toString(),
          seatIds,
          booking.bookingReference,
          booking.customerId.toString()
        );
      } catch (_e) {
        // Ignored
      }

      try {
        seatLockSocket.emitAvailabilityUpdated(booking.showId.toString(), {
          reason: 'BOOKING_CONFIRMED'
        });
      } catch (_e) {
        // Ignored
      }
    }

    logger.info(
      { bookingId, reference: booking.bookingReference },
      'Booking confirmed successfully upon verified payment'
    );

    return confirmedBooking;
  }
}

export const bookingService = new BookingService();
export default bookingService;
