import AppError from './app.error.js';
import HttpStatus from '../constants/http-status.js';
import ErrorCodes from '../constants/error-codes.js';

export class RateLimitError extends AppError {
  constructor(
    message = 'Too many requests. Please slow down and try again later.',
    details = null
  ) {
    super(message, HttpStatus.TOO_MANY_REQUESTS, ErrorCodes.RATE_LIMIT_EXCEEDED, details);
  }
}

export default RateLimitError;

