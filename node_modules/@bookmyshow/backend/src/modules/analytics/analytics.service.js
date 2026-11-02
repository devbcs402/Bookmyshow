import AnalyticsRepository from './analytics.repository.js';
import { AnalyticsCache } from './analytics.constants.js';
import { getRedisClient } from '../../config/redis.js';
import logger from '../../config/logger.js';
import { AuthorizationError } from '../../common/errors/authorization.error.js';

export class AnalyticsService {
  static getCacheKey(prefix, timeRange, identifier = '') {
    return `${prefix}:${timeRange}${identifier ? `:${identifier}` : ''}`;
  }

  static async getFromCache(key) {
    try {
      const client = getRedisClient();
      if (client && client.status === 'ready') {
        const cached = await client.get(key);
        if (cached) {
          return JSON.parse(cached);
        }
      }
    } catch (err) {
      logger.warn({ msg: 'Analytics cache read error; falling back to DB', error: err.message });
    }
    return null;
  }

  static async setToCache(key, data, ttlSeconds = AnalyticsCache.TTL_SECONDS) {
    try {
      const client = getRedisClient();
      if (client && client.status === 'ready') {
        await client.setex(key, ttlSeconds, JSON.stringify(data));
      }
    } catch (err) {
      logger.warn({ msg: 'Analytics cache write error', error: err.message });
    }
  }

  /* =========================================================================
   * SUPER ADMIN ANALYTICS METHODS
   * ========================================================================= */
  static async getAdminOverview(queryParams) {
    const cacheKey = this.getCacheKey(
      AnalyticsCache.PREFIX_ADMIN,
      queryParams.timeRange,
      'overview'
    );
    if (queryParams.timeRange !== 'custom') {
      const cached = await this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const data = await AnalyticsRepository.getAdminOverview(queryParams);

    if (queryParams.timeRange !== 'custom') {
      await this.setToCache(cacheKey, data);
    }
    return data;
  }

  static async getAdminBookings(queryParams) {
    const cacheKey = this.getCacheKey(
      AnalyticsCache.PREFIX_ADMIN,
      queryParams.timeRange,
      'bookings'
    );
    if (queryParams.timeRange !== 'custom') {
      const cached = await this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const data = await AnalyticsRepository.getAdminBookings(queryParams);

    if (queryParams.timeRange !== 'custom') {
      await this.setToCache(cacheKey, data);
    }
    return data;
  }

  static async getAdminRevenue(queryParams) {
    const cacheKey = this.getCacheKey(
      AnalyticsCache.PREFIX_ADMIN,
      queryParams.timeRange,
      'revenue'
    );
    if (queryParams.timeRange !== 'custom') {
      const cached = await this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const data = await AnalyticsRepository.getAdminRevenue(queryParams);

    if (queryParams.timeRange !== 'custom') {
      await this.setToCache(cacheKey, data);
    }
    return data;
  }

  static async getAdminMovies(queryParams) {
    const cacheKey = this.getCacheKey(
      AnalyticsCache.PREFIX_ADMIN,
      queryParams.timeRange,
      `movies:${queryParams.limit}`
    );
    if (queryParams.timeRange !== 'custom') {
      const cached = await this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const data = await AnalyticsRepository.getAdminMovies(queryParams);

    if (queryParams.timeRange !== 'custom') {
      await this.setToCache(cacheKey, data);
    }
    return data;
  }

  static async getAdminTheatres(queryParams) {
    const cacheKey = this.getCacheKey(
      AnalyticsCache.PREFIX_ADMIN,
      queryParams.timeRange,
      `theatres:${queryParams.limit}`
    );
    if (queryParams.timeRange !== 'custom') {
      const cached = await this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const data = await AnalyticsRepository.getAdminTheatres(queryParams);

    if (queryParams.timeRange !== 'custom') {
      await this.setToCache(cacheKey, data);
    }
    return data;
  }

  /* =========================================================================
   * THEATRE OWNER ISOLATED ANALYTICS METHODS
   * ========================================================================= */
  static async getTheatreOwnerOverview(user, queryParams) {
    if (!user.partnerId) {
      throw new AuthorizationError('User account has no associated theatre partner profile');
    }

    const cacheKey = this.getCacheKey(
      AnalyticsCache.PREFIX_OWNER,
      queryParams.timeRange,
      `${user.partnerId}:overview`
    );
    if (queryParams.timeRange !== 'custom') {
      const cached = await this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const data = await AnalyticsRepository.getTheatreOwnerOverview(user.partnerId, queryParams);

    if (queryParams.timeRange !== 'custom') {
      await this.setToCache(cacheKey, data);
    }
    return data;
  }

  static async getTheatreOwnerBookings(user, queryParams) {
    if (!user.partnerId) {
      throw new AuthorizationError('User account has no associated theatre partner profile');
    }

    const cacheKey = this.getCacheKey(
      AnalyticsCache.PREFIX_OWNER,
      queryParams.timeRange,
      `${user.partnerId}:bookings`
    );
    if (queryParams.timeRange !== 'custom') {
      const cached = await this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const data = await AnalyticsRepository.getTheatreOwnerBookings(user.partnerId, queryParams);

    if (queryParams.timeRange !== 'custom') {
      await this.setToCache(cacheKey, data);
    }
    return data;
  }

  static async getTheatreOwnerRevenue(user, queryParams) {
    if (!user.partnerId) {
      throw new AuthorizationError('User account has no associated theatre partner profile');
    }

    const cacheKey = this.getCacheKey(
      AnalyticsCache.PREFIX_OWNER,
      queryParams.timeRange,
      `${user.partnerId}:revenue`
    );
    if (queryParams.timeRange !== 'custom') {
      const cached = await this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const data = await AnalyticsRepository.getTheatreOwnerRevenue(user.partnerId, queryParams);

    if (queryParams.timeRange !== 'custom') {
      await this.setToCache(cacheKey, data);
    }
    return data;
  }
}

export default AnalyticsService;
