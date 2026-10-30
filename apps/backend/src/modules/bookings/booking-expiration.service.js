import mongoose from 'mongoose';
import redisConfig from '../../config/redis.js';
import logger from '../../config/logger.js';
import { BookingStatus, BookingRedisKeys } from './booking.constants.js';
import { bookingRepository } from './booking.repository.js';
import { BookingStatusService } from './booking-status.service.js';
import { redisLockService } from '../seat-locks/redis-lock.service.js';
import { seatLockSocket } from '../seat-locks/seat-lock.socket.js';

const getRedis = () => {
  try {
    return redisConfig.getRedisClient();
  } catch (_e) {
    return null;
  }
};

export class BookingExpirationService {
  /**
   * Registers a booking into the Redis expiration sorted set index.
   * Enables O(log N) instant retrieval of due bookings without full table scans.
   *
   * @param {string} bookingId
   * @param {Date} expiresAt
   */
  static async scheduleExpirationIndex(bookingId, expiresAt) {
    const client = getRedis();
    if (!client) {
      return;
    }
    try {
      const score = new Date(expiresAt).getTime();
      await client.zadd(BookingRedisKeys.EXPIRATIONS_ZSET, score, bookingId.toString());
    } catch (err) {
      logger.warn(
        { err: err.message, bookingId },
        'Failed to record booking in Redis expiration index'
      );
    }
  }

  /**
   * Removes a booking from the Redis expiration sorted set index once resolved (paid, cancelled, or expired).
   * @param {string} bookingId
   */
  static async removeExpirationIndex(bookingId) {
    const client = getRedis();
    if (!client) {
      return;
    }
    try {
      await client.zrem(BookingRedisKeys.EXPIRATIONS_ZSET, bookingId.toString());
    } catch (err) {
      logger.debug(
        { err: err.message, bookingId },
        'Failed to remove booking from Redis expiration index'
      );
    }
  }

  /**
   * Processes a single expired booking idempotently with distributed lock protection and transaction rollback.
   *
   * @param {string} bookingId
   * @returns {Promise<boolean>} True if expired successfully, false if ignored/already resolved
   */
  static async expireBooking(bookingId) {
    const lockKey = `${BookingRedisKeys.EXPIRATION_LOCK_PREFIX}:${bookingId}`;
    let lockAcquired = false;
    const client = getRedis();

    // Distributed lock guard to prevent concurrent workers from processing the same booking
    if (client) {
      try {
        const result = await client.set(lockKey, 'locked', 'EX', 15, 'NX');
        if (!result) {
          logger.debug({ bookingId }, 'Expiration job already in progress by another worker');
          return false;
        }
        lockAcquired = true;
      } catch (err) {
        logger.warn(
          { err: err.message, bookingId },
          'Redis lock acquisition failed for expiration; proceeding with DB guard'
        );
      }
    }

    try {
      const booking = await bookingRepository.findById(bookingId);
      if (!booking) {
        await this.removeExpirationIndex(bookingId);
        return false;
      }

      // Concurrency Invariant: NEVER expire a booking that has been confirmed by payment
      if (booking.status !== BookingStatus.PENDING_PAYMENT) {
        logger.info(
          { bookingId, status: booking.status },
          'Booking is no longer PENDING_PAYMENT; skipping expiration'
        );
        await this.removeExpirationIndex(bookingId);
        return false;
      }

      // Verify expiration window has actually elapsed
      if (new Date(booking.expiresAt).getTime() > Date.now()) {
        logger.debug(
          { bookingId, expiresAt: booking.expiresAt },
          'Booking has not yet reached expiration timestamp'
        );
        return false;
      }

      const statusHistoryEntry = BookingStatusService.createStatusHistoryEntry(
        BookingStatus.EXPIRED,
        null,
        'Booking expired due to payment window closure'
      );

      // Execute status transition inside a transaction where available
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
        await bookingRepository.updateStatus(
          bookingId,
          BookingStatus.EXPIRED,
          statusHistoryEntry,
          session
        );
        if (session) {
          await session.commitTransaction();
        }
      } catch (dbErr) {
        if (session) {
          await session.abortTransaction();
        }
        throw dbErr;
      } finally {
        if (session) {
          session.endSession();
        }
      }

      // Safely release ephemeral Redis locks for the expired seats
      if (Array.isArray(booking.seats) && booking.seats.length > 0) {
        const seatIds = booking.seats.map(s => (s.seatId ? s.seatId.toString() : s.seatId));
        try {
          await redisLockService.releaseLocks(
            booking.showId.toString(),
            seatIds,
            booking.bookingReference,
            booking.customerId.toString()
          );
        } catch (releaseErr) {
          logger.debug(
            { err: releaseErr.message, bookingId },
            'Redis lock release cleanup warning'
          );
        }

        // Broadcast real-time seat expiration to active show room
        try {
          seatLockSocket.emitSeatExpired(booking.showId.toString(), seatIds);
          seatLockSocket.emitAvailabilityUpdated(booking.showId.toString(), {
            reason: 'SEAT_EXPIRED'
          });
        } catch (socketErr) {
          logger.debug({ err: socketErr.message }, 'Socket broadcast error on booking expiration');
        }
      }

      await this.removeExpirationIndex(bookingId);
      logger.info(
        { bookingId, reference: booking.bookingReference },
        'Pending booking expired and seats released'
      );
      return true;
    } finally {
      if (lockAcquired && client) {
        try {
          await client.del(lockKey);
        } catch (_delErr) {
          // Key will expire automatically via 15s TTL
        }
      }
    }
  }

  /**
   * Sweeps and processes all due expired pending bookings across the platform.
   * Can be invoked by a recurring cron, BullMQ worker, or health sweep.
   *
   * @param {number} [limit=100]
   * @returns {Promise<number>} Count of bookings successfully expired
   */
  static async sweepExpiredBookings(limit = 100) {
    let expiredCount = 0;
    const client = getRedis();

    // 1. Try Redis sorted set index first
    if (client) {
      try {
        const nowMs = Date.now();
        const dueBookingIds = await client.zrangebyscore(
          BookingRedisKeys.EXPIRATIONS_ZSET,
          '-inf',
          nowMs,
          'LIMIT',
          0,
          limit
        );

        for (const bookingId of dueBookingIds) {
          const processed = await this.expireBooking(bookingId);
          if (processed) {
            expiredCount++;
          }
        }

        if (dueBookingIds.length > 0) {
          return expiredCount;
        }
      } catch (redisErr) {
        logger.warn(
          { err: redisErr.message },
          'Redis expiration sweep failed; falling back to DB scan'
        );
      }
    }

    // 2. Fallback to MongoDB index sweep: { status: 'PENDING_PAYMENT', expiresAt: { $lte: now } }
    try {
      const expiredBookings = await bookingRepository.findExpiredPendingBookings(limit);
      for (const booking of expiredBookings) {
        const processed = await this.expireBooking(booking._id.toString());
        if (processed) {
          expiredCount++;
        }
      }
    } catch (dbErr) {
      logger.error({ err: dbErr.message }, 'MongoDB fallback expiration sweep encountered error');
    }

    return expiredCount;
  }
}

export default BookingExpirationService;
