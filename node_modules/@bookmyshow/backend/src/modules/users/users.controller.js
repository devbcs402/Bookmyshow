import UsersService from './users.service.js';
import ApiResponse from '../../common/responses/api-response.js';
import { getClearCookieOptions } from '../auth/auth.utils.js';

export class UsersController {
  static async getProfile(req, res, next) {
    try {
      const profile = await UsersService.getProfile(req.user.id);
      return ApiResponse.success(res, {
        message: 'Profile retrieved successfully',
        data: profile
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(req, res, next) {
    try {
      const updatedProfile = await UsersService.updateProfile(req.user.id, req.body);
      return ApiResponse.success(res, {
        message: 'Profile updated successfully',
        data: updatedProfile
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAccountStatus(req, res, next) {
    try {
      const status = await UsersService.getAccountStatus(req.user.id);
      return ApiResponse.success(res, {
        message: 'Account status retrieved successfully',
        data: status
      });
    } catch (error) {
      next(error);
    }
  }

  static async deactivateAccount(req, res, next) {
    try {
      const result = await UsersService.deactivateAccount(req.user.id);
      res.clearCookie('refreshToken', getClearCookieOptions());
      return ApiResponse.success(res, {
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSessions(req, res, next) {
    try {
      const sessions = await UsersService.getActiveSessions(req.user.id, req.user.sessionId);
      return ApiResponse.success(res, {
        message: 'Active sessions retrieved successfully',
        data: sessions
      });
    } catch (error) {
      next(error);
    }
  }

  static async revokeSession(req, res, next) {
    try {
      const result = await UsersService.revokeSession(req.user.id, req.params.sessionId);

      // If user revoked their current session, clear cookie
      if (String(req.params.sessionId) === String(req.user.sessionId)) {
        res.clearCookie('refreshToken', getClearCookieOptions());
      }

      return ApiResponse.success(res, {
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  static async revokeAllOtherSessions(req, res, next) {
    try {
      const result = await UsersService.revokeAllOtherSessions(req.user.id, req.user.sessionId);
      return ApiResponse.success(res, {
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }
}

export default UsersController;
