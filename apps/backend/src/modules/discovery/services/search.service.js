import { DiscoveryRepository } from '../repositories/discovery.repository.js';
import { SearchRankingService } from './search-ranking.service.js';
import { DiscoveryCacheService } from './discovery-cache.service.js';
import { Show } from '../../shows/show.model.js';
import { ShowStatus } from '../../shows/show.constants.js';
import { DiscoveryCacheKeys, DiscoveryTTLs, DiscoveryDefaults } from '../constants/discovery.constants.js';
import { ValidationError } from '../../../common/errors/index.js';
import { ErrorCodes } from '../../../common/constants/error-codes.js';

export class SearchService {
  /**
   * Execute safe, case-insensitive, multi-field movie search
   */
  static async searchMovies({
    q = '',
    genre = null,
    language = null,
    cast = null,
    director = null,
    certification = null,
    cityId = null,
    page = DiscoveryDefaults.DEFAULT_PAGE,
    limit = DiscoveryDefaults.DEFAULT_LIMIT,
    sortBy = 'relevance',
    sortOrder = 'desc'
  }) {
    // 1. Sanitize & validate query bounds
    const cleanQuery = typeof q === 'string' ? q.trim() : '';

    if (cleanQuery.length > DiscoveryDefaults.MAX_SEARCH_LENGTH) {
      throw new ValidationError(
        `Search query cannot exceed ${DiscoveryDefaults.MAX_SEARCH_LENGTH} characters`,
        ErrorCodes.SEARCH_QUERY_TOO_LONG
      );
    }

    // 2. Build multi-criteria filter
    const filters = {};

    if (genre) {
      filters.genreSlugs = genre.toLowerCase().trim();
    }

    if (language) {
      if (/^[0-9a-fA-F]{24}$/.test(language)) {
        filters.languageIds = language;
      }
    }

    if (cast) {
      filters['cast.name'] = new RegExp(DiscoveryRepository.escapeRegex(cast.trim()), 'i');
    }

    if (director) {
      filters['crew'] = {
        $elemMatch: {
          role: 'DIRECTOR',
          name: new RegExp(DiscoveryRepository.escapeRegex(director.trim()), 'i')
        }
      };
    }

    if (certification) {
      filters.censorRating = certification;
    }

    // 3. Database sort definition
    const sortFieldMap = {
      releaseDate: 'releaseDate',
      rating: 'avgRating',
      title: 'title',
      duration: 'durationMins',
      createdAt: 'createdAt'
    };

    const dbSortField = sortFieldMap[sortBy] || 'releaseDate';
    const dbSortOrder = sortOrder === 'asc' ? 1 : -1;
    const dbSort = { [dbSortField]: dbSortOrder };

    // 4. Query repository
    const { movies, total } = await DiscoveryRepository.searchMovies({
      query: cleanQuery,
      filters,
      page,
      limit,
      sort: dbSort
    });

    // 5. If sortBy is 'relevance', apply centralized ranking
    let finalMovies = movies;
    if (sortBy === 'relevance' && movies.length > 0) {
      // Find which of these movies currently have published shows
      const movieIds = movies.map(m => m._id);
      const activeShows = await Show.distinct('movieId', {
        movieId: { $in: movieIds },
        status: ShowStatus.PUBLISHED,
        startTime: { $gte: new Date() },
        isDeleted: false,
        ...(cityId ? { cityId } : {})
      });
      const activeSet = new Set(activeShows.map(id => id.toString()));

      finalMovies = SearchRankingService.rankMovies(movies, {
        query: cleanQuery,
        activeMovieIds: activeSet
      });
    }

    return {
      movies: finalMovies,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1
    };
  }

  /**
   * Fast autocomplete search suggestions with Redis caching
   */
  static async getSearchSuggestions(query = '', limit = DiscoveryDefaults.SUGGESTION_LIMIT) {
    const cleanQuery = typeof query === 'string' ? query.trim() : '';

    if (!cleanQuery || cleanQuery.length < 1) {
      return [];
    }

    if (cleanQuery.length > 50) {
      throw new ValidationError(
        'Search query for autocomplete cannot exceed 50 characters',
        ErrorCodes.SEARCH_QUERY_TOO_LONG
      );
    }

    // 1. Check Redis cache
    const cacheKey = `${DiscoveryCacheKeys.SUGGESTIONS_PREFIX}${cleanQuery.toLowerCase()}`;
    const cached = await DiscoveryCacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    // 2. Fetch suggestions from repository
    const suggestions = await DiscoveryRepository.findSuggestions({
      query: cleanQuery,
      limit
    });

    // 3. Cache results
    await DiscoveryCacheService.set(cacheKey, suggestions, DiscoveryTTLs.SUGGESTIONS_SECONDS);

    return suggestions;
  }
}

export default SearchService;
