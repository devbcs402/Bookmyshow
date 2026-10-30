import ScreenService from './screen.service.js';
import ApiResponse from '../../common/responses/api-response.js';

export class ScreenController {
  /**
   * Create a new screen under a theatre
   */
  static async createScreen(req, res, next) {
    try {
      const theatreId = req.params.theatreId || req.body.theatreId;
      const screen = await ScreenService.createScreen(theatreId, req.body, req.user);
      return ApiResponse.created(res, {
        message: 'Screen created successfully',
        data: screen
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Get all screens belonging to a theatre
   */
  static async getScreensByTheatre(req, res, next) {
    try {
      const result = await ScreenService.getScreensByTheatre(
        req.params.theatreId,
        req.user,
        req.query
      );
      return ApiResponse.success(res, {
        message: 'Screens retrieved successfully',
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
   * Get screen by ID
   */
  static async getScreenById(req, res, next) {
    try {
      const screen = await ScreenService.getScreenById(req.params.screenId, req.user);
      return ApiResponse.success(res, {
        message: 'Screen details retrieved successfully',
        data: screen
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Update screen details
   */
  static async updateScreen(req, res, next) {
    try {
      const updated = await ScreenService.updateScreen(req.params.screenId, req.body, req.user);
      return ApiResponse.success(res, {
        message: 'Screen updated successfully',
        data: updated
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Update screen operational status
   */
  static async updateScreenStatus(req, res, next) {
    try {
      const updated = await ScreenService.updateScreenStatus(
        req.params.screenId,
        req.body.status,
        req.user
      );
      return ApiResponse.success(res, {
        message: 'Screen status updated successfully',
        data: updated
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Soft delete screen
   */
  static async deleteScreen(req, res, next) {
    try {
      const result = await ScreenService.deleteScreen(req.params.screenId, req.user);
      return ApiResponse.success(res, {
        message: result.message,
        data: null
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Admin: List all screens
   */
  static async adminListScreens(req, res, next) {
    try {
      const result = await ScreenService.adminListScreens(req.query, req.query);
      return ApiResponse.success(res, {
        message: 'Screens retrieved successfully',
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
   * Admin: Get screen details
   */
  static async adminGetScreenById(req, res, next) {
    try {
      const screen = await ScreenService.adminGetScreenById(req.params.screenId);
      return ApiResponse.success(res, {
        message: 'Screen details retrieved successfully',
        data: screen
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Admin: Update screen
   */
  static async adminUpdateScreen(req, res, next) {
    try {
      const updated = await ScreenService.adminUpdateScreen(
        req.params.screenId,
        req.body,
        req.user
      );
      return ApiResponse.success(res, {
        message: 'Screen updated successfully',
        data: updated
      });
    } catch (error) {
      return next(error);
    }
  }
}

export default ScreenController;

