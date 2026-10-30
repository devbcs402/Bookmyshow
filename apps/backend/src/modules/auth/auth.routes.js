import { Router } from 'express';
import AuthController from './auth.controller.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import {
  authRateLimiter,
  otpRateLimiter,
  passwordResetLimiter
} from '../../middlewares/rate-limit.middleware.js';
import {
  registerValidation,
  theatreOwnerRegisterValidation,
  loginValidation,
  refreshTokenValidation,
  sendOtpValidation,
  verifyOtpValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  changePasswordValidation
} from './auth.validation.js';

const router = Router();

// Customer Registration
router.post('/register', authRateLimiter, validate(registerValidation), AuthController.register);

// Theatre Owner Partner Registration
router.post(
  '/theatre-owner/register',
  authRateLimiter,
  validate(theatreOwnerRegisterValidation),
  AuthController.theatreOwnerRegister
);

// Login (Email or Phone + Password)
router.post('/login', authRateLimiter, validate(loginValidation), AuthController.login);

// Refresh Access Token (Dual Token rotation)
router.post('/refresh', validate(refreshTokenValidation), AuthController.refresh);

// Session Termination
router.post('/logout', authenticate, AuthController.logout);
router.post('/logout-all', authenticate, AuthController.logoutAll);

// One-Time Password (OTP)
router.post('/otp/send', otpRateLimiter, validate(sendOtpValidation), AuthController.sendOtp);
router.post('/otp/verify', otpRateLimiter, validate(verifyOtpValidation), AuthController.verifyOtp);

// Password Recovery & Lifecycle
router.post(
  '/password/forgot',
  passwordResetLimiter,
  validate(forgotPasswordValidation),
  AuthController.forgotPassword
);
router.post(
  '/password/reset',
  passwordResetLimiter,
  validate(resetPasswordValidation),
  AuthController.resetPassword
);
router.post(
  '/password/change',
  authenticate,
  validate(changePasswordValidation),
  AuthController.changePassword
);

export default router;
