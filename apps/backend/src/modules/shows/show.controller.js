import ShowService from './show.service.js';
import ApiResponse from '../../common/responses/api-response.js';

export class ShowController {
  /**
   * Create a new scheduled show
   */
  static async createShow(req, res, next) {
    try {
      const show = await ShowService.createShow(req.body, req.user);
      return ApiResponse.created(res, {
        message: 'Show created successfully in DRAFT state',
        data: show
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * List shows for the authenticated theatre partner
   */
  static async getOwnerShows(req, res, next) {
    try {
      const result = await ShowService.getOwnerShows(req.user, req.query, req.query);
      return ApiResponse.success(res, {
        message: 'Shows retrieved successfully',
        data: result.items,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages
        }
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Get show by ID for owner
   */
  static async getShowById(req, res, next) {
    try {
      const show = await ShowService.getShowById(req.params.showId, req.user);
      return ApiResponse.success(res, {
        message: 'Show details retrieved successfully',
        data: show
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Update show non-schedule metadata
   */
  static async updateShow(req, res, next) {
    try {
      const updated = await ShowService.updateShow(req.params.showId, req.body, req.user);
      return ApiResponse.success(res, {
        message: 'Show details updated successfully',
        data: updated
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Reschedule show start/end times
   */
  static async rescheduleShow(req, res, next) {
    try {
      const updated = await ShowService.rescheduleShow(req.params.showId, req.body, req.user);
      return ApiResponse.success(res, {
        message: 'Show rescheduled successfully',
        data: updated
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Publish show for booking
   */
  static async publishShow(req, res, next) {
    try {
      const published = await ShowService.publishShow(req.params.showId, req.user);
      return ApiResponse.success(res, {
        message: 'Show successfully published and opened for booking',
        data: published
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Cancel show
   */
  static async cancelShow(req, res, next) {
    try {
      const cancelled = await ShowService.cancelShow(req.params.showId, req.body.reason, req.user);
      return ApiResponse.success(res, {
        message: 'Show cancelled successfully',
        data: cancelled
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Public: Search published shows
   */
  static async searchPublicShows(req, res, next) {
    try {
      const result = await ShowService.searchPublicShows(req.query, req.query);
      return ApiResponse.success(res, {
        message: 'Shows retrieved successfully',
        data: result.items,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages
        }
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Public: Get published shows for a movie
   */
  static async getMovieShows(req, res, next) {
    try {
      const result = await ShowService.getMovieShows(req.params.movieId, req.query, req.query);
      return ApiResponse.success(res, {
        message: 'Movie shows retrieved successfully',
        data: result.items,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages
        }
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Public: Get published shows for a theatre
   */
  static async getTheatreShows(req, res, next) {
    try {
      const result = await ShowService.getTheatreShows(req.params.theatreId, req.query, req.query);
      return ApiResponse.success(res, {
        message: 'Theatre shows retrieved successfully',
        data: result.items,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages
        }
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Public: Get single show details
   */
  static async getPublicShowDetails(req, res, next) {
    try {
      const show = await ShowService.getPublicShowDetails(req.params.showId);
      return ApiResponse.success(res, {
        message: 'Show details retrieved successfully',
        data: show
      });
    } catch (error) {
      return next(error);
    }
  }
}

export default ShowController;
