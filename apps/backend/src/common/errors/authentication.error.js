import AppError from './app.error.js';
import HttpStatus from '../constants/http-status.js';
import ErrorCodes from '../constants/error-codes.js';

export class AuthenticationError extends AppError {
  constructor(
    message = 'Authentication is required or credentials are invalid',
    errorCode = ErrorCodes.AUTHENTICATION_ERROR,
    details = null
  ) {
    super(message, HttpStatus.UNAUTHORIZED, errorCode, details);
  }
}

export default AuthenticationError;

