import ApiResponse from '../../../common/responses/api-response.js';
import RecentlyViewedService from '../services/recently-viewed.service.js';

export class RecentlyViewedController {
  /**
   * Record a viewed movie for customer
   * POST /api/v1/users/me/recently-viewed/:movieId
   */
  static async recordMovieView(req, res, next) {
    try {
      const entry = await RecentlyViewedService.recordMovieView(req.user.id, req.params.movieId);
      return ApiResponse.created(res, {
        message: 'Movie added to recently viewed history',
        data: entry
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieve customer's recently viewed movies
   * GET /api/v1/users/me/recently-viewed
   */
  static async getRecentlyViewed(req, res, next) {
    try {
      const result = await RecentlyViewedService.getRecentlyViewed(req.user.id, req.query);
      return ApiResponse.success(res, {
        message: 'Recently viewed movies retrieved successfully',
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
   * Clear customer's recently viewed history
   * DELETE /api/v1/users/me/recently-viewed
   */
  static async clearRecentlyViewed(req, res, next) {
    try {
      const result = await RecentlyViewedService.clearRecentlyViewed(req.user.id);
      return ApiResponse.success(res, {
        message: result.message,
        data: { deletedCount: result.deletedCount }
      });
    } catch (error) {
      next(error);
    }
  }
}

export default RecentlyViewedController;
