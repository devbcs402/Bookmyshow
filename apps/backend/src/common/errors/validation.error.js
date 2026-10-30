import AppError from './app.error.js';
import HttpStatus from '../constants/http-status.js';
import ErrorCodes from '../constants/error-codes.js';

export class ValidationError extends AppError {
  constructor(message = 'Validation failed for the request payload', details = null) {
    super(message, HttpStatus.BAD_REQUEST, ErrorCodes.VALIDATION_ERROR, details);
  }
}

export default ValidationError;

