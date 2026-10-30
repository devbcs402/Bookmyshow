import AppError from './app.error.js';
import HttpStatus from '../constants/http-status.js';
import ErrorCodes from '../constants/error-codes.js';

export class ConflictError extends AppError {
  constructor(
    message = 'Resource conflict occurred with current state',
    errorCode = ErrorCodes.CONFLICT,
    details = null
  ) {
    super(message, HttpStatus.CONFLICT, errorCode, details);
  }
}

export default ConflictError;
