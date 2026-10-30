import rateLimit from 'express-rate-limit';
import config from '../config/env.js';
import HttpStatus from '../common/constants/http-status.js';
import ErrorCodes from '../common/constants/error-codes.js';
import ApiResponse from '../common/responses/api-response.js';

export const createRateLimiter = ({
  windowMs = 15 * 60 * 1000,
  max = 100,
  message = 'Too many requests. Please try again later.'
} = {}) => {
  return rateLimit({
    windowMs,
    max: config.NODE_ENV === 'test' ? 10000 : max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      return ApiResponse.error(res, {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message,
        errorCode: ErrorCodes.RATE_LIMIT_EXCEEDED,
        requestId: req.id
      });
    }
  });
};

export const globalRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: 'Global rate limit exceeded. Please wait a few minutes.'
});

export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: 'Too many authentication attempts. Please wait 15 minutes.'
});

export default {
  createRateLimiter,
  globalRateLimiter,
  authRateLimiter
};
