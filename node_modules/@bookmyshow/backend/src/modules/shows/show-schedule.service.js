import crypto from 'node:crypto';
import mongoose from 'mongoose';
import redisConfig from '../../config/redis.js';
import logger from '../../config/logger.js';
import { ConflictError } from '../../common/errors/conflict.error.js';
import ErrorCodes from '../../common/constants/error-codes.js';

export class ShowScheduleService {
  /**
   * Acquire a distributed screen-level scheduling mutex.
   *
   * @param {string} screenId
   * @param {number} [ttlSeconds=10]
   * @returns {Promise<{ acquired: boolean, token: string }>}
   */
  static async acquireScreenLock(screenId, ttlSeconds = 10) {
    const lockKey = `lock:schedule:screen:${screenId}`;
    const token = crypto.randomUUID();

    try {
      const redis = redisConfig.getRedisClient();
      if (redis && redis.status === 'ready') {
        const result = await redis.set(lockKey, token, 'EX', ttlSeconds, 'NX');
        const acquired = result === 'OK';
        return { acquired, token: acquired ? token : null };
      }
    } catch (err) {
      logger.warn({
        msg: 'Redis screen lock acquisition failed, falling back to database concurrency checks',
        error: err.message,
        screenId
      });
    }

    // Fallback when Redis is not running / test mock mode
    return { acquired: true, token: 'fallback-token' };
  }

  /**
   * Safely release distributed screen lock using atomic Lua verification.
   *
   * @param {string} screenId
   * @param {string} token
   * @returns {Promise<boolean>}
   */
  static async releaseScreenLock(screenId, token) {
    if (!token || token === 'fallback-token') {
      return true;
    }

    const lockKey = `lock:schedule:screen:${screenId}`;
    const releaseLuaScript = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;

    try {
      const redis = redisConfig.getRedisClient();
      if (redis && redis.status === 'ready') {
        await redis.eval(releaseLuaScript, 1, lockKey, token);
        return true;
      }
    } catch (err) {
      logger.warn({
        msg: 'Redis screen lock release failed',
        error: err.message,
        screenId
      });
    }

    return false;
  }

  /**
   * Wraps scheduling task execution within the distributed lock and MongoDB transaction.
   *
   * @param {string} screenId
   * @param {Function} taskFn - Callback returning promise
   * @param {number} [ttlSeconds=10]
   * @returns {Promise<any>}
   */
  static async executeWithScheduleLock(screenId, taskFn, ttlSeconds = 10) {
    const { acquired, token } = await this.acquireScreenLock(screenId, ttlSeconds);

    if (!acquired) {
      throw new ConflictError(
        'Another scheduling operation is currently in progress on this screen. Please retry.',
        ErrorCodes.SCHEDULE_CONFLICT
      );
    }

    let session = null;
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      try {
        session = await mongoose.startSession();
        session.startTransaction();
      } catch {
        session = null;
      }
    }

    try {
      const result = await taskFn(session);

      if (session) {
        await session.commitTransaction();
        session.endSession();
      }

      return result;
    } catch (error) {
      if (session) {
        await session.abortTransaction();
        session.endSession();
      }
      throw error;
    } finally {
      await this.releaseScreenLock(screenId, token);
    }
  }
}

export default ShowScheduleService;
