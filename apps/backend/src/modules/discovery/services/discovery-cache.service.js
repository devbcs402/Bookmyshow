import { getRedisClient } from '../../../config/redis.js';
import logger from '../../../config/logger.js';

export class DiscoveryCacheService {
  /**
   * Retrieve cached data by key
   */
  static async get(key) {
    try {
      const redis = getRedisClient();
      if (!redis || redis.status !== 'ready') {
        return null;
      }
      const data = await redis.get(key);
      if (!data) {
        return null;
      }
      return JSON.parse(data);
    } catch (error) {
      logger.debug({
        msg: 'Redis cache read error, falling back to database',
        key,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Store data in cache with TTL in seconds
   */
  static async set(key, value, ttlSeconds = 300) {
    try {
      const redis = getRedisClient();
      if (!redis || redis.status !== 'ready') {
        return false;
      }
      await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
      return true;
    } catch (error) {
      logger.debug({
        msg: 'Redis cache write error, continuing without cache',
        key,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Delete specific cache key
   */
  static async del(key) {
    try {
      const redis = getRedisClient();
      if (!redis || redis.status !== 'ready') {
        return false;
      }
      await redis.del(key);
      return true;
    } catch (error) {
      logger.debug({ msg: 'Redis cache delete error', key, error: error.message });
      return false;
    }
  }

  /**
   * Invalidate all discovery caches matching a prefix pattern
   */
  static async invalidatePattern(pattern) {
    try {
      const redis = getRedisClient();
      if (!redis || redis.status !== 'ready') {
        return false;
      }

      // Use SCAN to avoid blocking Redis event loop
      const stream = redis.scanStream({
        match: pattern,
        count: 100
      });

      const keysToDelete = [];
      stream.on('data', resultKeys => {
        keysToDelete.push(...resultKeys);
      });

      return new Promise(resolve => {
        stream.on('end', async () => {
          if (keysToDelete.length > 0) {
            await redis.del(...keysToDelete);
            logger.info({
              msg: 'Invalidated cache keys matching pattern',
              pattern,
              count: keysToDelete.length
            });
          }
          resolve(true);
        });

        stream.on('error', err => {
          logger.warn({
            msg: 'Scan stream error during cache invalidation',
            pattern,
            error: err.message
          });
          resolve(false);
        });
      });
    } catch (error) {
      logger.debug({ msg: 'Redis pattern invalidation error', pattern, error: error.message });
      return false;
    }
  }

  /**
   * Invalidate movie-related discovery caches (called on movie mutation)
   */
  static async invalidateMovieCaches(movieId = null) {
    await Promise.all([
      this.invalidatePattern('discovery:trending:*'),
      this.invalidatePattern('discovery:popular:*'),
      this.invalidatePattern('discovery:upcoming:*'),
      this.invalidatePattern('discovery:now_showing:*'),
      this.invalidatePattern('discovery:suggestions:*'),
      movieId ? this.del(`discovery:similar:${movieId}`) : Promise.resolve()
    ]);
  }

  /**
   * Invalidate show-related discovery caches (called when show schedules change)
   */
  static async invalidateShowCaches(cityId = null) {
    await Promise.all([
      this.invalidatePattern('discovery:now_showing:*'),
      this.invalidatePattern('discovery:shows:*'),
      cityId ? this.invalidatePattern(`discovery:*:${cityId}*`) : Promise.resolve()
    ]);
  }
}

export default DiscoveryCacheService;
