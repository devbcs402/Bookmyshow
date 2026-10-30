import ApiResponse from '../../../common/responses/api-response.js';
import SearchService from '../services/search.service.js';
import FilterService from '../services/filter.service.js';
import DiscoveryService from '../services/discovery.service.js';
import SimilarMoviesService from '../services/similar-movies.service.js';
import TheatreDiscoveryService from '../services/theatre-discovery.service.js';
import ShowDiscoveryService from '../services/show-discovery.service.js';
import RecommendationService from '../services/recommendation.service.js';

export class DiscoveryController {
  /**
   * Search movies by text, actor, director, genre, language
   * GET /api/v1/movies/search
   */
  static async searchMovies(req, res, next) {
    try {
      const result = await SearchService.searchMovies(req.query);
      return ApiResponse.success(res, {
        message: 'Movie search results retrieved successfully',
        data: result.movies,
        meta: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Filter catalog movies by multi-dimensional parameters
   * GET /api/v1/movies
   */
  static async filterMovies(req, res, next) {
    try {
      const result = await FilterService.filterMovies(req.query);
      return ApiResponse.success(res, {
        message: 'Filtered movies retrieved successfully',
        data: result.movies,
        meta: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Discover upcoming approved movies
   * GET /api/v1/movies/upcoming
   */
  static async getUpcomingMovies(req, res, next) {
    try {
      const result = await DiscoveryService.getUpcomingMovies(req.query);
      return ApiResponse.success(res, {
        message: 'Upcoming movies retrieved successfully',
        data: result.movies,
        meta: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Discover movies with active published shows
   * GET /api/v1/movies/now-showing
   */
  static async getNowShowingMovies(req, res, next) {
    try {
      const result = await DiscoveryService.getNowShowingMovies(req.query);
      return ApiResponse.success(res, {
        message: 'Now showing movies retrieved successfully',
        data: result.movies,
        meta: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Discover trending movies based on recent booking activity
   * GET /api/v1/movies/trending
   */
  static async getTrendingMovies(req, res, next) {
    try {
      const result = await DiscoveryService.getTrendingMovies(req.query);
      return ApiResponse.success(res, {
        message: 'Trending movies retrieved successfully',
        data: result.movies,
        meta: {
          timeWindowHours: result.timeWindowHours,
          total: result.total
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Discover popular movies based on sustained engagement and reviews
   * GET /api/v1/movies/popular
   */
  static async getPopularMovies(req, res, next) {
    try {
      const result = await DiscoveryService.getPopularMovies(req.query);
      return ApiResponse.success(res, {
        message: 'Popular movies retrieved successfully',
        data: result.movies,
        meta: {
          timeWindowDays: result.timeWindowDays,
          total: result.total
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Discover similar movies based on content-based similarity
   * GET /api/v1/movies/:movieId/similar
   */
  static async getSimilarMovies(req, res, next) {
    try {
      const movies = await SimilarMoviesService.getSimilarMovies(
        req.params.movieId,
        { limit: req.query.limit ? Number(req.query.limit) : 10 }
      );
      return ApiResponse.success(res, {
        message: 'Similar movies retrieved successfully',
        data: movies,
        meta: {
          total: movies.length
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Discover approved active theatres with optional proximity search
   * GET /api/v1/theatres/search
   */
  static async searchTheatres(req, res, next) {
    try {
      const result = await TheatreDiscoveryService.searchTheatres(req.query);
      return ApiResponse.success(res, {
        message: 'Theatre search results retrieved successfully',
        data: result.theatres,
        meta: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Discover published bookable shows
   * GET /api/v1/shows/search
   */
  static async searchShows(req, res, next) {
    try {
      const result = await ShowDiscoveryService.searchShows(req.query);
      return ApiResponse.success(res, {
        message: 'Show search results retrieved successfully',
        data: result.shows,
        meta: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate personalized or anonymous explainable recommendations
   * GET /api/v1/recommendations
   */
  static async getRecommendations(req, res, next) {
    try {
      const movies = await RecommendationService.getRecommendations({
        userId: req.user?.id || null,
        type: req.query.type,
        cityId: req.query.cityId,
        limit: req.query.limit ? Number(req.query.limit) : 10
      });
      return ApiResponse.success(res, {
        message: 'Movie recommendations retrieved successfully',
        data: movies,
        meta: {
          total: movies.length,
          isPersonalized: Boolean(req.user?.id)
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Fast autocomplete suggestions for search bar
   * GET /api/v1/search/suggestions
   */
  static async getSearchSuggestions(req, res, next) {
    try {
      const suggestions = await SearchService.getSearchSuggestions(
        req.query.q,
        req.query.limit ? Number(req.query.limit) : 10
      );
      return ApiResponse.success(res, {
        message: 'Search suggestions retrieved successfully',
        data: suggestions,
        meta: {
          count: suggestions.length
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Location-based discovery landing view
   * GET /api/v1/discovery/location
   */
  static async getLocationDiscovery(req, res, next) {
    try {
      const result = await DiscoveryService.getLocationDiscovery(req.query);
      return ApiResponse.success(res, {
        message: 'Location discovery retrieved successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}

export default DiscoveryController;

