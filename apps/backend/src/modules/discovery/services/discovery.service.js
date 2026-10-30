import { DiscoveryRepository } from '../repositories/discovery.repository.js';
import { DiscoveryCacheService } from './discovery-cache.service.js';
import { Movie } from '../../movies/model/movie.model.js';
import { City } from '../../theatres/model/city.model.js';
import { PublicVisibleStatuses } from '../../movies/movie.constants.js';
import {
  DiscoveryCacheKeys,
  DiscoveryTTLs,
  DiscoveryDefaults
} from '../constants/discovery.constants.js';

export class DiscoveryService {
  /**
   * Get upcoming movies with Redis caching
   */
  static async getUpcomingMovies({
    genre = null,
    language = null,
    page = DiscoveryDefaults.DEFAULT_PAGE,
    limit = DiscoveryDefaults.DEFAULT_LIMIT
  } = {}) {
    const cacheKey = `${DiscoveryCacheKeys.UPCOMING_PREFIX}${genre || 'all'}:${language || 'all'}:${page}:${limit}`;
    const cached = await DiscoveryCacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const filters = {};
    if (genre) {
      filters.genreSlugs = genre.toLowerCase().trim();
    }
    if (language && /^[0-9a-fA-F]{24}$/.test(language)) {
      filters.languageIds = language;
    }

    const result = await DiscoveryRepository.findUpcomingMovies({
      filters,
      page,
      limit,
      sort: { releaseDate: 1 }
    });

    const payload = {
      movies: result.movies,
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit) || 1
    };

    await DiscoveryCacheService.set(cacheKey, payload, DiscoveryTTLs.UPCOMING_SECONDS);
    return payload;
  }

  /**
   * Get movies currently showing based on active published shows
   */
  static async getNowShowingMovies({
    cityId = null,
    date = null,
    genre = null,
    language = null,
    page = DiscoveryDefaults.DEFAULT_PAGE,
    limit = DiscoveryDefaults.DEFAULT_LIMIT
  } = {}) {
    const cacheKey = `${DiscoveryCacheKeys.NOW_SHOWING_PREFIX}${cityId || 'all'}:${date || 'all'}:${genre || 'all'}:${language || 'all'}:${page}:${limit}`;
    const cached = await DiscoveryCacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await DiscoveryRepository.findNowShowingMovies({
      cityId,
      date,
      genre,
      language,
      page,
      limit
    });

    const payload = {
      movies: result.movies,
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit) || 1
    };

    await DiscoveryCacheService.set(cacheKey, payload, DiscoveryTTLs.NOW_SHOWING_SECONDS);
    return payload;
  }

  /**
   * Get trending movies based on recent booking velocity (last 48h) with fallback
   */
  static async getTrendingMovies({ cityId = null, limit = DiscoveryDefaults.DEFAULT_LIMIT } = {}) {
    const cacheKey = `${DiscoveryCacheKeys.TRENDING_PREFIX}${cityId || 'all'}:${limit}`;
    const cached = await DiscoveryCacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Window: past 48 hours
    const windowHours = DiscoveryDefaults.TRENDING_WINDOW_HOURS;
    const sinceDate = new Date(Date.now() - windowHours * 60 * 60 * 1000);

    const bookingAggs = await DiscoveryRepository.aggregateTrendingBookings({
      sinceDate,
      limit
    });

    let trendingMovies = [];

    if (bookingAggs && bookingAggs.length > 0) {
      const movieIds = bookingAggs.map(b => b.movieId);
      const movies = await Movie.find({
        _id: { $in: movieIds },
        status: { $in: PublicVisibleStatuses },
        isDeleted: false
      })
        .populate('genreIds', 'name slug')
        .populate('languageIds', 'name code nativeName')
        .lean();

      // Map booking metrics onto movie records
      const movieMap = new Map(movies.map(m => [m._id.toString(), m]));
      trendingMovies = bookingAggs
        .map(agg => {
          const movie = movieMap.get(agg.movieId.toString());
          if (!movie) {
            return null;
          }
          // Velocity formula: confirmed bookings * 2 + total tickets
          const velocityScore = agg.bookingCount * 2 + agg.totalSeats;
          return {
            ...movie,
            trendingVelocity: velocityScore,
            recentBookings: agg.bookingCount
          };
        })
        .filter(Boolean);
    }

    // Fallback if not enough booking transactions in window
    if (trendingMovies.length < limit) {
      const remainingLimit = limit - trendingMovies.length;
      const existingIds = trendingMovies.map(m => m._id);

      const fallbackMovies = await Movie.find({
        _id: { $nin: existingIds },
        status: { $in: PublicVisibleStatuses },
        isDeleted: false
      })
        .populate('genreIds', 'name slug')
        .populate('languageIds', 'name code nativeName')
        .sort({ avgRating: -1, releaseDate: -1 })
        .limit(remainingLimit)
        .lean();

      const taggedFallback = fallbackMovies.map(m => ({
        ...m,
        trendingVelocity: Number((m.avgRating * 5).toFixed(1)),
        isFallbackTrending: true
      }));

      trendingMovies.push(...taggedFallback);
    }

    const payload = {
      movies: trendingMovies,
      timeWindowHours: windowHours,
      total: trendingMovies.length
    };

    await DiscoveryCacheService.set(cacheKey, payload, DiscoveryTTLs.TRENDING_SECONDS);
    return payload;
  }

  /**
   * Get popular movies based on sustained booking volume & review rating (last 30d)
   */
  static async getPopularMovies({ cityId = null, limit = DiscoveryDefaults.DEFAULT_LIMIT } = {}) {
    const cacheKey = `${DiscoveryCacheKeys.POPULAR_PREFIX}${cityId || 'all'}:${limit}`;
    const cached = await DiscoveryCacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const windowDays = DiscoveryDefaults.POPULAR_WINDOW_DAYS;
    const sinceDate = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

    const bookingAggs = await DiscoveryRepository.aggregatePopularBookings({
      sinceDate,
      limit
    });

    let popularMovies = [];

    if (bookingAggs && bookingAggs.length > 0) {
      const movieIds = bookingAggs.map(b => b.movieId);
      const movies = await Movie.find({
        _id: { $in: movieIds },
        status: { $in: PublicVisibleStatuses },
        isDeleted: false
      })
        .populate('genreIds', 'name slug')
        .populate('languageIds', 'name code nativeName')
        .lean();

      const movieMap = new Map(movies.map(m => [m._id.toString(), m]));
      popularMovies = bookingAggs
        .map(agg => {
          const movie = movieMap.get(agg.movieId.toString());
          if (!movie) {
            return null;
          }
          const ratingFactor = (movie.avgRating || 0) / 10;
          const popularityScore = agg.totalBookings * 0.7 + ratingFactor * 30;
          return {
            ...movie,
            popularityScore: Number(popularityScore.toFixed(2)),
            totalBookings: agg.totalBookings
          };
        })
        .filter(Boolean);
    }

    // Fallback to top-rated movies if booking data is sparse
    if (popularMovies.length < limit) {
      const remainingLimit = limit - popularMovies.length;
      const existingIds = popularMovies.map(m => m._id);

      const fallbackMovies = await Movie.find({
        _id: { $nin: existingIds },
        status: { $in: PublicVisibleStatuses },
        isDeleted: false
      })
        .populate('genreIds', 'name slug')
        .populate('languageIds', 'name code nativeName')
        .sort({ avgRating: -1, totalReviews: -1 })
        .limit(remainingLimit)
        .lean();

      const taggedFallback = fallbackMovies.map(m => ({
        ...m,
        popularityScore: Number(((m.avgRating || 0) * 10).toFixed(2)),
        isFallbackPopular: true
      }));

      popularMovies.push(...taggedFallback);
    }

    const payload = {
      movies: popularMovies,
      timeWindowDays: windowDays,
      total: popularMovies.length
    };

    await DiscoveryCacheService.set(cacheKey, payload, DiscoveryTTLs.POPULAR_SECONDS);
    return payload;
  }

  /**
   * Unified location-based discovery
   */
  static async getLocationDiscovery({
    cityId = null,
    cityName = '',
    latitude = null,
    longitude = null,
    radiusKm = 15
  }) {
    let resolvedCity = null;

    if (cityId) {
      resolvedCity = await City.findById(cityId).lean();
    } else if (cityName) {
      resolvedCity = await City.findOne({
        name: new RegExp(`^${DiscoveryRepository.escapeRegex(cityName)}$`, 'i')
      }).lean();
    }

    const actualCityId = resolvedCity ? resolvedCity._id : cityId;

    const [nowShowing, theatres, trending] = await Promise.all([
      this.getNowShowingMovies({ cityId: actualCityId, limit: 10 }),
      DiscoveryRepository.findTheatres({
        cityId: actualCityId,
        coordinates: latitude && longitude ? [Number(longitude), Number(latitude)] : null,
        radiusKm,
        limit: 10
      }),
      this.getTrendingMovies({ cityId: actualCityId, limit: 6 })
    ]);

    return {
      city: resolvedCity,
      nowShowing: nowShowing.movies,
      theatres: theatres.theatres,
      trending: trending.movies
    };
  }
}

export default DiscoveryService;
