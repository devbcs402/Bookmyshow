import seatLockRepository from './seat-lock.repository.js';
import redisLockService from './redis-lock.service.js';
import SeatLockSocket from './seat-lock.socket.js';
import { SeatStatus } from '../screens/screen.constants.js';
import { ShowStatus } from '../shows/show.constants.js';
import { AppError } from '../../common/errors/app.error.js';
import { NotFoundError } from '../../common/errors/not-found.error.js';
import { ConflictError } from '../../common/errors/conflict.error.js';
import { AuthorizationError } from '../../common/errors/authorization.error.js';
import HttpStatus from '../../common/constants/http-status.js';
import ErrorCodes from '../../common/constants/error-codes.js';
import logger from '../../config/logger.js';

export class SeatLockService {
  /**
   * Atomically locks requested seats for the authenticated customer.
   *
   * @param {Object} lockParams
   * @param {string} lockParams.showId
   * @param {Array<string>} lockParams.seatIds
   * @param {string} [lockParams.idempotencyKey]
   * @param {Object} userContext
   * @returns {Promise<Object>}
   */
  async acquireSeatLocks({ showId, seatIds, idempotencyKey }, userContext) {
    const userId = userContext.id || userContext._id;
    if (!userId) {
      throw new AuthorizationError('Authentication required to reserve seat locks');
    }

    // 1. Idempotency Check
    if (idempotencyKey) {
      const cached = await redisLockService.checkIdempotency(userId.toString(), idempotencyKey);
      if (cached) {
        // Verify payload matches
        const cachedPayload = cached.payloadToMatch;
        const isMatch =
          cachedPayload.showId === showId &&
          cachedPayload.seatIds.length === seatIds.length &&
          seatIds.every(id => cachedPayload.seatIds.includes(id));

        if (isMatch) {
          logger.info({
            msg: 'Returning idempotent cached seat lock response',
            userId,
            idempotencyKey
          });
          return cached.responseData;
        }

        throw new ConflictError(
          'Idempotency key reuse with different request payload is prohibited',
          ErrorCodes.IDEMPOTENCY_CONFLICT
        );
      }
    }

    // 2. Validate Show existence and operational state
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

    if (show.status !== ShowStatus.PUBLISHED) {
      throw new ConflictError(
        'Show is not currently published or open for ticket reservations',
        ErrorCodes.SHOW_NOT_BOOKABLE
      );
    }

    const now = new Date();
    if (new Date(show.startTime) <= now) {
      throw new ConflictError(
        'Show has already commenced or closed for online reservations',
        ErrorCodes.SHOW_NOT_BOOKABLE
      );
    }

    if (show.bookingClosesAt && new Date(show.bookingClosesAt) <= now) {
      throw new ConflictError(
        'Online booking window for this show has closed',
        ErrorCodes.SHOW_NOT_BOOKABLE
      );
    }

    // 3. Physical Seat Validation
    const physicalSeats = await seatLockRepository.findSeatsByIds(
      show.screenId,
      show.layoutVersion,
      seatIds
    );

    if (physicalSeats.length !== seatIds.length) {
      throw new AppError(
        'One or more selected seats do not exist in the screen layout for this show',
        HttpStatus.NOT_FOUND,
        ErrorCodes.SEAT_INVALID_FOR_SHOW
      );
    }

    const physicallyUnavailable = physicalSeats.filter(
      s => s.status !== SeatStatus.ACTIVE || s.isAvailable === false
    );

    if (physicallyUnavailable.length > 0) {
      throw new ConflictError(
        'One or more selected seats are physically blocked, inactive, or under maintenance',
        ErrorCodes.SEAT_UNAVAILABLE,
        {
          unavailableSeatIds: physicallyUnavailable.map(s => s._id.toString())
        }
      );
    }

    // 4. Durable MongoDB Booking Verification
    const bookedConflictingSeats = await seatLockRepository.findConflictingBookedSeats(
      showId,
      seatIds
    );

    if (bookedConflictingSeats.length > 0) {
      throw new ConflictError(
        'One or more selected seats are already confirmed or booked',
        ErrorCodes.SEAT_ALREADY_BOOKED,
        {
          conflictingSeatIds: bookedConflictingSeats
        }
      );
    }

    // 5. Atomic Multi-Seat Lock Acquisition via Redis Lua Script
    const lockResult = await redisLockService.acquireLocks(showId, seatIds, userId.toString());

    if (!lockResult.acquired) {
      throw new ConflictError(
        'One or more selected seats are temporarily held by another customer',
        ErrorCodes.SEAT_ALREADY_LOCKED,
        {
          conflictingSeatIds: lockResult.conflictingSeatIds
        }
      );
    }

    const responseData = {
      lockId: lockResult.lockId,
      showId,
      seatIds,
      expiresAt: lockResult.expiresAt,
      expiresInSeconds: lockResult.expiresInSeconds
    };

    // 6. Broadcast Real-Time Availability Event via Socket.IO
    await SeatLockSocket.emitSeatLocked(showId, seatIds);

    // 7. Store Idempotency Record if key provided
    if (idempotencyKey) {
      await redisLockService.saveIdempotency(
        userId.toString(),
        idempotencyKey,
        { showId, seatIds },
        responseData
      );
    }

    return responseData;
  }

  /**
   * Safely releases seat locks owned by the authenticated customer.
   *
   * @param {Object} releaseParams
   * @param {string} releaseParams.showId
   * @param {Array<string>} releaseParams.seatIds
   * @param {string} releaseParams.lockId
   * @param {Object} userContext
   * @returns {Promise<Object>}
   */
  async releaseSeatLocks({ showId, seatIds, lockId }, userContext) {
    const userId = userContext.id || userContext._id;
    if (!userId) {
      throw new AuthorizationError('Authentication required to release seat locks');
    }

    // 1. Validate Show existence
    const show = await seatLockRepository.findShowById(showId);
    if (!show || show.isDeleted) {
      throw new NotFoundError('Show not found', ErrorCodes.SHOW_NOT_FOUND);
    }

    // 2. Safe Compare-and-Delete release in Redis
    const result = await redisLockService.releaseLocks(showId, seatIds, lockId, userId.toString());

    // 3. Broadcast Real-Time Availability Update
    if (result.releasedSeatIds.length > 0) {
      await SeatLockSocket.emitSeatReleased(showId, result.releasedSeatIds);
    }

    return {
      released: true,
      releasedSeatIds: result.releasedSeatIds
    };
  }

  /**
   * Extends the TTL for temporary seat locks owned by the caller.
   *
   * @param {Object} renewParams
   * @param {string} renewParams.showId
   * @param {Array<string>} renewParams.seatIds
   * @param {string} renewParams.lockId
   * @param {Object} userContext
   * @returns {Promise<Object>}
   */
  async renewSeatLocks({ showId, seatIds, lockId }, userContext) {
    const userId = userContext.id || userContext._id;
    if (!userId) {
      throw new AuthorizationError('Authentication required to renew seat locks');
    }

    // 1. Validate Show existence and operational state
    const show = await seatLockRepository.findShowById(showId);
    if (!show || show.isDeleted) {
      throw new NotFoundError('Show not found', ErrorCodes.SHOW_NOT_FOUND);
    }

    if (show.status === ShowStatus.CANCELLED) {
      throw new ConflictError(
        'Cannot renew locks for a cancelled show',
        ErrorCodes.SHOW_ALREADY_CANCELLED
      );
    }

    // 2. Atomic Renewal via Redis Lua
    const result = await redisLockService.renewLocks(showId, seatIds, lockId, userId.toString());

    if (!result.renewed) {
      if (result.errorReason === 'LOCK_EXPIRED') {
        throw new ConflictError(
          'Seat locks have expired and cannot be renewed',
          ErrorCodes.LOCK_EXPIRED
        );
      }
      if (result.errorReason === 'OWNERSHIP_MISMATCH') {
        throw new AuthorizationError(
          'Unauthorized: You do not own the locks for the specified seats',
          ErrorCodes.LOCK_OWNERSHIP_MISMATCH
        );
      }
      if (result.errorReason === 'MAX_RENEWALS_EXCEEDED') {
        throw new ConflictError(
          'Maximum lock renewal limit reached. Please complete checkout.',
          ErrorCodes.LOCK_LIMIT_EXCEEDED
        );
      }
      throw new ConflictError('Failed to renew seat locks', ErrorCodes.CONFLICT);
    }

    return {
      lockId,
      showId,
      seatIds,
      expiresAt: result.expiresAt,
      expiresInSeconds: result.expiresInSeconds,
      renewalCount: result.renewalCount
    };
  }
}

export default new SeatLockService();
