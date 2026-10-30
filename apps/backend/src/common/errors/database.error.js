import AppError from './app.error.js';
import HttpStatus from '../constants/http-status.js';
import ErrorCodes from '../constants/error-codes.js';

export class DatabaseError extends AppError {
  constructor(message = 'A persistent database operation failed', details = null) {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR, ErrorCodes.DATABASE_ERROR, details);
  }
}

export default DatabaseError;
