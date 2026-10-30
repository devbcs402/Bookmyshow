import AnalyticsService from './analytics.service.js';
import ApiResponse from '../../common/responses/api-response.js';
import HttpStatus from '../../common/constants/http-status.js';

export class AnalyticsController {
  /* =========================================================================
   * ADMIN ANALYTICS CONTROLLERS
   * ========================================================================= */
  static async getAdminOverview(req, res, next) {
    try {
      const data = await AnalyticsService.getAdminOverview(req.query);
      return ApiResponse.success(res, {
        statusCode: HttpStatus.OK,
        message: 'Platform analytics overview retrieved successfully',
        data
      });
    } catch (err) {
      next(err);
    }
  }

  static async getAdminBookings(req, res, next) {
    try {
      const data = await AnalyticsService.getAdminBookings(req.query);
      return ApiResponse.success(res, {
        statusCode: HttpStatus.OK,
        message: 'Platform booking analytics retrieved successfully',
        data
      });
    } catch (err) {
      next(err);
    }
  }

  static async getAdminRevenue(req, res, next) {
    try {
      const data = await AnalyticsService.getAdminRevenue(req.query);
      return ApiResponse.success(res, {
        statusCode: HttpStatus.OK,
        message: 'Platform revenue analytics retrieved successfully',
        data
      });
    } catch (err) {
      next(err);
    }
  }

  static async getAdminMovies(req, res, next) {
    try {
      const data = await AnalyticsService.getAdminMovies(req.query);
      return ApiResponse.success(res, {
        statusCode: HttpStatus.OK,
        message: 'Top performing movie analytics retrieved successfully',
        data
      });
    } catch (err) {
      next(err);
    }
  }

  static async getAdminTheatres(req, res, next) {
    try {
      const data = await AnalyticsService.getAdminTheatres(req.query);
      return ApiResponse.success(res, {
        statusCode: HttpStatus.OK,
        message: 'Top performing theatre analytics retrieved successfully',
        data
      });
    } catch (err) {
      next(err);
    }
  }

  /* =========================================================================
   * THEATRE OWNER ISOLATED CONTROLLERS
   * ========================================================================= */
  static async getOwnerOverview(req, res, next) {
    try {
      const data = await AnalyticsService.getTheatreOwnerOverview(req.user, req.query);
      return ApiResponse.success(res, {
        statusCode: HttpStatus.OK,
        message: 'Theatre partner analytics overview retrieved successfully',
        data
      });
    } catch (err) {
      next(err);
    }
  }

  static async getOwnerBookings(req, res, next) {
    try {
      const data = await AnalyticsService.getTheatreOwnerBookings(req.user, req.query);
      return ApiResponse.success(res, {
        statusCode: HttpStatus.OK,
        message: 'Theatre partner booking analytics retrieved successfully',
        data
      });
    } catch (err) {
      next(err);
    }
  }

  static async getOwnerRevenue(req, res, next) {
    try {
      const data = await AnalyticsService.getTheatreOwnerRevenue(req.user, req.query);
      return ApiResponse.success(res, {
        statusCode: HttpStatus.OK,
        message: 'Theatre partner revenue settlement analytics retrieved successfully',
        data
      });
    } catch (err) {
      next(err);
    }
  }
}

export default AnalyticsController;

