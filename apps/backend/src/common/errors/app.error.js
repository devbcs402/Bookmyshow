import HttpStatus from '../constants/http-status.js';
import ErrorCodes from '../constants/error-codes.js';

export class AppError extends Error {
  constructor(
    message = 'An unexpected internal error occurred',
    statusCode = HttpStatus.INTERNAL_SERVER_ERROR,
    errorCode = ErrorCodes.INTERNAL_SERVER_ERROR,
    details = null
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;
