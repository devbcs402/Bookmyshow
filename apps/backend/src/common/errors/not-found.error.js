import AppError from './app.error.js';
import HttpStatus from '../constants/http-status.js';
import ErrorCodes from '../constants/error-codes.js';

export class NotFoundError extends AppError {
  constructor(message = 'Requested resource was not found', details = null) {
    super(message, HttpStatus.NOT_FOUND, ErrorCodes.NOT_FOUND, details);
  }
}

export default NotFoundError;

