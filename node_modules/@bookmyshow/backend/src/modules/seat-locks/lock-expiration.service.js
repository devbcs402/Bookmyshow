import redisConfig from '../../config/redis.js';
import logger from '../../config/logger.js';
import SeatLockSocket from './seat-lock.socket.js';
import { parseSeatLockKey } from './seat-lock.utils.js';

/**
 * LockExpirationService
 *
 * Architectural Invariants:
 * 1. Redis native TTL (EX parameter) is the primary, resilient authority for lock expiration.
 * 2. No in-memory JavaScript timers (setTimeout/setInterval) are required for correctness.
 *    If the Node.js process crashes or restarts, Redis TTL guarantees automatic lock eviction.
 * 3. This service acts as a supplementary maintenance listener for Redis Keyspace Notifications
 *    (when enabled: notify-keyspace-events KEx) to trigger proactive real-time Socket.IO broadcasts.
 */
export class LockExpirationService {
  constructor() {
    this.isSubscriberRunning = false;
    this.keyspaceSubClient = null;
  }

  /**
   * Initializes Redis keyspace notification listener for expired seat locks (optional supplementary feature).
   */
  async initKeyspaceExpirationListener() {
    if (this.isSubscriberRunning) {
      return;
    }

    try {
      const baseClient = redisConfig.getRedisClient();
      if (!baseClient) {
        return;
      }

      this.keyspaceSubClient = baseClient.duplicate();

      // Subscribe to Redis expired key events across database 0
      await this.keyspaceSubClient.psubscribe('__keyevent@*__:expired');

      this.keyspaceSubClient.on('pmessage', async (_pattern, _channel, expiredKey) => {
        const parsed = parseSeatLockKey(expiredKey);
        if (parsed) {
          logger.debug({
            msg: 'Redis keyspace expired event received for seat lock',
            showId: parsed.showId,
            seatId: parsed.seatId
          });

          // Proactively inform room that seat is now available
          await SeatLockSocket.emitSeatExpired(parsed.showId, [parsed.seatId]);
        }
      });

      this.isSubscriberRunning = true;
      logger.info('Redis keyspace lock expiration listener initialized');
    } catch (err) {
      logger.warn({
        msg: 'Redis keyspace expiration listener not active (keyspace notifications may be disabled on server)',
        error: err.message
      });
    }
  }

  /**
   * Manual or triggered expiration broadcast.
   * @param {string} showId
   * @param {Array<string>} seatIds
   */
  async handleExpiredSeats(showId, seatIds) {
    if (seatIds && seatIds.length > 0) {
      await SeatLockSocket.emitSeatExpired(showId, seatIds);
    }
  }
}

export default new LockExpirationService();
