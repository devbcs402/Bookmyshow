import { DiscoveryRepository } from '../repositories/discovery.repository.js';
import { DiscoveryCacheService } from './discovery-cache.service.js';
import {
  DiscoveryCacheKeys,
  DiscoveryTTLs,
  DiscoveryDefaults
} from '../constants/discovery.constants.js';
import { ValidationError } from '../../../common/errors/index.js';
import { ErrorCodes } from '../../../common/constants/error-codes.js';

export class TheatreDiscoveryService {
  /**
   * Search and discover approved active theatres with optional geospatial proximity
   */
  static async searchTheatres({
    q = '',
    cityId = null,
    city = '',
    area = '',
    pincode = '',
    latitude = null,
    longitude = null,
    radiusKm = DiscoveryDefaults.DEFAULT_GEO_RADIUS_KM,
    facilities = [],
    page = DiscoveryDefaults.DEFAULT_PAGE,
    limit = DiscoveryDefaults.DEFAULT_LIMIT
  }) {
    // 1. Coordinate validation if supplied
    let coordinates = null;
    if (latitude !== null && longitude !== null) {
      const lat = Number(latitude);
      const lng = Number(longitude);

      if (isNaN(lat) || lat < -90 || lat > 90 || isNaN(lng) || lng < -180 || lng > 180) {
        throw new ValidationError(
          'Coordinates must be valid: latitude between -90 and 90, longitude between -180 and 180',
          ErrorCodes.INVALID_LOCATION_COORDINATES
        );
      }
      coordinates = [lng, lat]; // GeoJSON expects [longitude, latitude]
    }

    // 2. Validate radius
    const parsedRadius = Math.min(
      Math.max(Number(radiusKm) || DiscoveryDefaults.DEFAULT_GEO_RADIUS_KM, 1),
      DiscoveryDefaults.MAX_GEO_RADIUS_KM
    );

    // 3. Cache key generation
    const cacheKey = `${DiscoveryCacheKeys.THEATRES_PREFIX}${cityId || city || 'all'}:${area || 'all'}:${pincode || 'all'}:${coordinates ? coordinates.join(',') : 'none'}:${page}:${limit}`;
    const cached = await DiscoveryCacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    // 4. Query repository
    const facilitiesArray = Array.isArray(facilities)
      ? facilities
      : typeof facilities === 'string'
        ? facilities.split(',').map(f => f.trim().toUpperCase())
        : [];

    const { theatres, total } = await DiscoveryRepository.findTheatres({
      query: q,
      cityId,
      cityName: city,
      area,
      pincode,
      coordinates,
      radiusKm: parsedRadius,
      facilities: facilitiesArray,
      page,
      limit
    });

    const result = {
      theatres,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1
    };

    // 5. Cache result
    await DiscoveryCacheService.set(cacheKey, result, DiscoveryTTLs.THEATRES_SECONDS);

    return result;
  }
}

export default TheatreDiscoveryService;
