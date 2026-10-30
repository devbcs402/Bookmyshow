import AppError from './app.error.js';
import HttpStatus from '../constants/http-status.js';
import ErrorCodes from '../constants/error-codes.js';

export class AuthorizationError extends AppError {
  constructor(
    message = 'You do not have permission to perform this action',
    errorCode = ErrorCodes.FORBIDDEN,
    details = null
  ) {
    super(message, HttpStatus.FORBIDDEN, errorCode, details);
  }
}

export default AuthorizationError;
