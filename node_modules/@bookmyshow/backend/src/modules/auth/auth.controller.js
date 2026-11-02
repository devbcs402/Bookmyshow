import AuthService from './auth.service.js';
import ApiResponse from '../../common/responses/api-response.js';
import HttpStatus from '../../common/constants/http-status.js';
import { getRefreshTokenCookieOptions, getClearCookieOptions } from './auth.utils.js';

export class AuthController {
  static async register(req, res, next) {
    try {
      const result = await AuthService.registerCustomer({
        ...req.body,
        ipAddress: req.ip,
        userAgent: req.get('user-agent') || ''
      });

      return ApiResponse.created(res, {
        message: 'Account registered successfully. A verification code has been dispatched.',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async theatreOwnerRegister(req, res, next) {
    try {
      const result = await AuthService.registerTheatreOwner({
        ...req.body,
        ipAddress: req.ip,
        userAgent: req.get('user-agent') || ''
      });

      return ApiResponse.created(res, {
        message:
          'Theatre partner onboarding submitted successfully. Awaiting Super Admin approval.',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async login(req, res, next) {
    try {
      const { user, tokens } = await AuthService.login({
        ...req.body,
        ipAddress: req.ip,
        userAgent: req.get('user-agent') || ''
      });

      // Set HttpOnly SameSite=Strict cookie for browser clients
      res.cookie('refreshToken', tokens.refreshToken, getRefreshTokenCookieOptions());

      return ApiResponse.success(res, {
        statusCode: HttpStatus.OK,
        message: 'Authentication successful',
        data: {
          user,
          accessToken: tokens.accessToken,
          // Expose refreshToken in response body for non-browser (mobile/API) clients
          refreshToken: tokens.refreshToken
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async refresh(req, res, next) {
    try {
      const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

      const { accessToken, refreshToken, user } = await AuthService.refreshTokens({
        refreshToken: incomingRefreshToken,
        ipAddress: req.ip,
        userAgent: req.get('user-agent') || ''
      });

      res.cookie('refreshToken', refreshToken, getRefreshTokenCookieOptions());

      return ApiResponse.success(res, {
        statusCode: HttpStatus.OK,
        message: 'Access token refreshed successfully',
        data: {
          accessToken,
          refreshToken,
          user
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async logout(req, res, next) {
    try {
      const sessionId = req.user?.sessionId;
      const userId = req.user?.id;

      await AuthService.logout({
        sessionId,
        userId,
        ipAddress: req.ip,
        userAgent: req.get('user-agent') || ''
      });

      res.clearCookie('refreshToken', getClearCookieOptions());

      return ApiResponse.success(res, {
        message: 'Logged out successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async logoutAll(req, res, next) {
    try {
      const userId = req.user?.id;

      await AuthService.logoutAll({
        userId,
        ipAddress: req.ip,
        userAgent: req.get('user-agent') || ''
      });

      res.clearCookie('refreshToken', getClearCookieOptions());

      return ApiResponse.success(res, {
        message: 'All active sessions have been revoked successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async sendOtp(req, res, next) {
    try {
      const result = await AuthService.sendOtp({
        ...req.body,
        ipAddress: req.ip
      });

      return ApiResponse.success(res, {
        message: result.message,
        data: { sent: true }
      });
    } catch (error) {
      next(error);
    }
  }

  static async verifyOtp(req, res, next) {
    try {
      const result = await AuthService.verifyOtp(req.body);

      return ApiResponse.success(res, {
        message: 'Verification code verified successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async forgotPassword(req, res, next) {
    try {
      const result = await AuthService.forgotPassword({
        ...req.body,
        ipAddress: req.ip,
        userAgent: req.get('user-agent') || ''
      });

      return ApiResponse.success(res, {
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  static async resetPassword(req, res, next) {
    try {
      const result = await AuthService.resetPassword({
        ...req.body,
        ipAddress: req.ip,
        userAgent: req.get('user-agent') || ''
      });

      return ApiResponse.success(res, {
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  static async changePassword(req, res, next) {
    try {
      const result = await AuthService.changePassword({
        userId: req.user.id,
        currentPassword: req.body.currentPassword,
        newPassword: req.body.newPassword,
        currentSessionId: req.user.sessionId,
        ipAddress: req.ip,
        userAgent: req.get('user-agent') || ''
      });

      return ApiResponse.success(res, {
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }
}

export default AuthController;
