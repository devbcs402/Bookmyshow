import TheatreService from './theatre.service.js';
import ApiResponse from '../../common/responses/api-response.js';

export class TheatreController {
  /* =========================================================================
   * 1. THEATRE OWNER CONTROLLER ACTIONS
   * ========================================================================= */

  static async registerTheatre(req, res, next) {
    try {
      const theatre = await TheatreService.registerTheatre(req.body, req.user);
      return ApiResponse.created(res, {
        message: 'Theatre registration request submitted successfully',
        data: theatre
      });
    } catch (error) {
      return next(error);
    }
  }

  static async getMyTheatres(req, res, next) {
    try {
      const { theatres, pagination } = await TheatreService.getMyTheatres(req.query, req.user);
      return ApiResponse.success(res, {
        message: 'Theatres retrieved successfully',
        data: theatres,
        meta: pagination
      });
    } catch (error) {
      return next(error);
    }
  }

  static async getTheatreByIdForOwner(req, res, next) {
    try {
      const theatre = await TheatreService.getTheatreByIdForOwner(req.params.theatreId, req.user);
      return ApiResponse.success(res, {
        message: 'Theatre details retrieved successfully',
        data: theatre
      });
    } catch (error) {
      return next(error);
    }
  }

  static async updateTheatre(req, res, next) {
    try {
      const updated = await TheatreService.updateTheatre(req.params.theatreId, req.body, req.user);
      return ApiResponse.success(res, {
        message: 'Theatre updated successfully',
        data: updated
      });
    } catch (error) {
      return next(error);
    }
  }

  static async updateOperations(req, res, next) {
    try {
      const updated = await TheatreService.updateTheatreOperations(
        req.params.theatreId,
        req.body,
        req.user
      );
      return ApiResponse.success(res, {
        message: 'Operational details updated successfully',
        data: updated
      });
    } catch (error) {
      return next(error);
    }
  }

  static async updateMedia(req, res, next) {
    try {
      const updated = await TheatreService.updateTheatreMedia(
        req.params.theatreId,
        req.body,
        req.user
      );
      return ApiResponse.success(res, {
        message: 'Media assets updated successfully',
        data: updated
      });
    } catch (error) {
      return next(error);
    }
  }

  static async softDeleteTheatre(req, res, next) {
    try {
      await TheatreService.softDeleteTheatre(req.params.theatreId, req.user);
      return ApiResponse.success(res, {
        message: 'Theatre deleted successfully',
        data: null
      });
    } catch (error) {
      return next(error);
    }
  }

  /* =========================================================================
   * 2. THEATRE STAFF ASSIGNMENT ACTIONS
   * ========================================================================= */

  static async assignStaff(req, res, next) {
    try {
      const result = await TheatreService.assignStaff(req.params.theatreId, req.body, req.user);
      return ApiResponse.success(res, {
        message: 'Staff member assigned successfully',
        data: result
      });
    } catch (error) {
      return next(error);
    }
  }

  static async getTheatreStaff(req, res, next) {
    try {
      const staff = await TheatreService.getTheatreStaff(req.params.theatreId, req.user);
      return ApiResponse.success(res, {
        message: 'Theatre staff retrieved successfully',
        data: staff
      });
    } catch (error) {
      return next(error);
    }
  }

  static async removeStaff(req, res, next) {
    try {
      const result = await TheatreService.removeStaff(
        req.params.theatreId,
        req.params.userId,
        req.user
      );
      return ApiResponse.success(res, {
        message: 'Staff member removed successfully',
        data: result
      });
    } catch (error) {
      return next(error);
    }
  }

  /* =========================================================================
   * 3. SUPER ADMIN CONTROLLER ACTIONS
   * ========================================================================= */

  static async getAllTheatresAdmin(req, res, next) {
    try {
      const { theatres, pagination } = await TheatreService.getAllTheatresAdmin(req.query);
      return ApiResponse.success(res, {
        message: 'Admin theatres retrieved successfully',
        data: theatres,
        meta: pagination
      });
    } catch (error) {
      return next(error);
    }
  }

  static async getTheatreByIdAdmin(req, res, next) {
    try {
      const theatre = await TheatreService.getTheatreByIdAdmin(req.params.theatreId);
      return ApiResponse.success(res, {
        message: 'Admin theatre details retrieved successfully',
        data: theatre
      });
    } catch (error) {
      return next(error);
    }
  }

  static async approveTheatre(req, res, next) {
    try {
      const updated = await TheatreService.approveTheatre(req.params.theatreId, req.user);
      return ApiResponse.success(res, {
        message: 'Theatre approved successfully',
        data: updated
      });
    } catch (error) {
      return next(error);
    }
  }

  static async rejectTheatre(req, res, next) {
    try {
      const updated = await TheatreService.rejectTheatre(
        req.params.theatreId,
        req.body.rejectionReason,
        req.user
      );
      return ApiResponse.success(res, {
        message: 'Theatre rejected successfully',
        data: updated
      });
    } catch (error) {
      return next(error);
    }
  }

  static async suspendTheatre(req, res, next) {
    try {
      const updated = await TheatreService.suspendTheatre(req.params.theatreId, req.user);
      return ApiResponse.success(res, {
        message: 'Theatre suspended successfully',
        data: updated
      });
    } catch (error) {
      return next(error);
    }
  }

  static async reactivateTheatre(req, res, next) {
    try {
      const updated = await TheatreService.reactivateTheatre(req.params.theatreId, req.user);
      return ApiResponse.success(res, {
        message: 'Theatre reactivated successfully',
        data: updated
      });
    } catch (error) {
      return next(error);
    }
  }

  static async updateTheatreAdmin(req, res, next) {
    try {
      const updated = await TheatreService.updateTheatreAdmin(
        req.params.theatreId,
        req.body,
        req.user
      );
      return ApiResponse.success(res, {
        message: 'Theatre updated by admin successfully',
        data: updated
      });
    } catch (error) {
      return next(error);
    }
  }

  /* =========================================================================
   * 4. PUBLIC THEATRE CONTROLLER ACTIONS
   * ========================================================================= */

  static async getPublicTheatres(req, res, next) {
    try {
      const { theatres, pagination } = await TheatreService.getPublicTheatres(req.query);
      return ApiResponse.success(res, {
        message: 'Theatres retrieved successfully',
        data: theatres,
        meta: pagination
      });
    } catch (error) {
      return next(error);
    }
  }

  static async getPublicTheatreBySlug(req, res, next) {
    try {
      const theatre = await TheatreService.getPublicTheatreBySlug(req.params.slug);
      return ApiResponse.success(res, {
        message: 'Theatre details retrieved successfully',
        data: theatre
      });
    } catch (error) {
      return next(error);
    }
  }

  static async getPublicTheatreById(req, res, next) {
    try {
      const theatre = await TheatreService.getPublicTheatreById(req.params.theatreId);
      return ApiResponse.success(res, {
        message: 'Theatre details retrieved successfully',
        data: theatre
      });
    } catch (error) {
      return next(error);
    }
  }

  /* =========================================================================
   * 5. CITY MASTER DATA CONTROLLER ACTIONS
   * ========================================================================= */

  static async getActiveCities(_req, res, next) {
    try {
      const cities = await TheatreService.getActiveCities();
      return ApiResponse.success(res, {
        message: 'Cities retrieved successfully',
        data: cities
      });
    } catch (error) {
      return next(error);
    }
  }

  static async createCity(req, res, next) {
    try {
      const city = await TheatreService.createCity(req.body);
      return ApiResponse.created(res, {
        message: 'City created successfully',
        data: city
      });
    } catch (error) {
      return next(error);
    }
  }
}

export default TheatreController;
