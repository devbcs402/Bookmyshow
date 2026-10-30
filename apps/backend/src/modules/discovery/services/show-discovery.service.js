import { DiscoveryRepository } from '../repositories/discovery.repository.js';
import { DiscoveryCacheService } from './discovery-cache.service.js';
import {
  DiscoveryCacheKeys,
  DiscoveryTTLs,
  DiscoveryDefaults
} from '../constants/discovery.constants.js';
import { ValidationError } from '../../../common/errors/index.js';
import { ErrorCodes } from '../../../common/constants/error-codes.js';

export class ShowDiscoveryService {
  /**
   * Search and discover published public shows
   */
  static async searchShows({
    movieId = null,
    theatreId = null,
    branchId = null,
    cityId = null,
    date = null,
    language = null,
    format = null,
    startTimeFrom = null,
    startTimeTo = null,
    page = DiscoveryDefaults.DEFAULT_PAGE,
    limit = DiscoveryDefaults.DEFAULT_LIMIT
  }) {
    // 1. Date format validation if provided
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new ValidationError('Date must be in YYYY-MM-DD format', ErrorCodes.VALIDATION_ERROR);
    }

    // 2. Cache key generation
    const cacheKey = `${DiscoveryCacheKeys.SHOWS_PREFIX}${movieId || 'all'}:${theatreId || 'all'}:${cityId || 'all'}:${date || 'all'}:${language || 'all'}:${format || 'all'}:${page}:${limit}`;
    const cached = await DiscoveryCacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    // 3. Query repository
    const { shows, total } = await DiscoveryRepository.findShows({
      movieId,
      theatreId,
      branchId,
      cityId,
      date,
      language,
      format,
      startTimeFrom,
      startTimeTo,
      page,
      limit
    });

    const result = {
      shows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1
    };

    // 4. Cache result
    await DiscoveryCacheService.set(cacheKey, result, DiscoveryTTLs.SHOWS_SECONDS);

    return result;
  }
}

export default ShowDiscoveryService;
