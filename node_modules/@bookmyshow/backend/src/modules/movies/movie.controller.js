import MovieService from './movie.service.js';
import ApiResponse from '../../common/responses/api-response.js';

export class MovieController {
  // Admin Operations
  static async createMovie(req, res, next) {
    try {
      const movie = await MovieService.createMovie(req.body, req.user?.id, req.user?.role);
      return ApiResponse.created(res, {
        message: 'Movie created successfully',
        data: movie
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAdminMovies(req, res, next) {
    try {
      const result = await MovieService.getAdminMovies(req.query);
      return ApiResponse.success(res, {
        message: 'Admin movie list retrieved successfully',
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

  static async getAdminMovieById(req, res, next) {
    try {
      const movie = await MovieService.getAdminMovieById(req.params.movieId);
      return ApiResponse.success(res, {
        message: 'Movie retrieved successfully',
        data: movie
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateMovie(req, res, next) {
    try {
      const movie = await MovieService.updateMovie(
        req.params.movieId,
        req.body,
        req.user?.id,
        req.user?.role
      );
      return ApiResponse.success(res, {
        message: 'Movie updated successfully',
        data: movie
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteMovie(req, res, next) {
    try {
      const result = await MovieService.deleteMovie(req.params.movieId, req.user?.id);
      return ApiResponse.success(res, {
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  static async approveMovie(req, res, next) {
    try {
      const movie = await MovieService.approveMovie(req.params.movieId, req.user?.id);
      return ApiResponse.success(res, {
        message: 'Movie approved successfully for public exhibition',
        data: movie
      });
    } catch (error) {
      next(error);
    }
  }

  static async rejectMovie(req, res, next) {
    try {
      const movie = await MovieService.rejectMovie(
        req.params.movieId,
        req.body.reason,
        req.user?.id
      );
      return ApiResponse.success(res, {
        message: 'Movie rejected successfully',
        data: movie
      });
    } catch (error) {
      next(error);
    }
  }

  // Public Operations
  static async getPublicMovies(req, res, next) {
    try {
      const result = await MovieService.getPublicMovies(req.query);
      return ApiResponse.success(res, {
        message: 'Movies retrieved successfully',
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

  static async getUpcomingMovies(req, res, next) {
    try {
      const result = await MovieService.getUpcomingMovies(req.query);
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

  static async getNowShowingMovies(req, res, next) {
    try {
      const result = await MovieService.getNowShowingMovies(req.query);
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

  static async getMovieBySlug(req, res, next) {
    try {
      const movie = await MovieService.getMovieBySlug(req.params.slug);
      return ApiResponse.success(res, {
        message: 'Movie details retrieved successfully',
        data: movie
      });
    } catch (error) {
      next(error);
    }
  }
}

export default MovieController;
