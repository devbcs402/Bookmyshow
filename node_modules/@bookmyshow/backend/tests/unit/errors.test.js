import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  DatabaseError
} from '../../src/common/errors/index.js';
import HttpStatus from '../../src/common/constants/http-status.js';
import ErrorCodes from '../../src/common/constants/error-codes.js';

describe('Custom Error Classes Unit Tests', () => {
  it('AppError should set defaults correctly', () => {
    const error = new AppError('Server error occurred');
    expect(error.message).toBe('Server error occurred');
    expect(error.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(error.errorCode).toBe(ErrorCodes.INTERNAL_SERVER_ERROR);
    expect(error.isOperational).toBe(true);
    expect(error.name).toBe('AppError');
  });

  it('ValidationError should default to 400 Bad Request', () => {
    const details = [{ field: 'email', message: 'Invalid email' }];
    const error = new ValidationError('Validation failed', details);
    expect(error.statusCode).toBe(HttpStatus.BAD_REQUEST);
    expect(error.errorCode).toBe(ErrorCodes.VALIDATION_ERROR);
    expect(error.details).toEqual(details);
    expect(error.name).toBe('ValidationError');
  });

  it('AuthenticationError should default to 401 Unauthorized', () => {
    const error = new AuthenticationError('Token invalid', ErrorCodes.TOKEN_INVALID);
    expect(error.statusCode).toBe(HttpStatus.UNAUTHORIZED);
    expect(error.errorCode).toBe(ErrorCodes.TOKEN_INVALID);
    expect(error.name).toBe('AuthenticationError');
  });

  it('AuthorizationError should default to 403 Forbidden', () => {
    const error = new AuthorizationError('Forbidden action');
    expect(error.statusCode).toBe(HttpStatus.FORBIDDEN);
    expect(error.errorCode).toBe(ErrorCodes.FORBIDDEN);
    expect(error.name).toBe('AuthorizationError');
  });

  it('NotFoundError should default to 404 Not Found', () => {
    const error = new NotFoundError('User not found');
    expect(error.statusCode).toBe(HttpStatus.NOT_FOUND);
    expect(error.errorCode).toBe(ErrorCodes.NOT_FOUND);
    expect(error.name).toBe('NotFoundError');
  });

  it('ConflictError should default to 409 Conflict', () => {
    const error = new ConflictError('Seat is locked', ErrorCodes.SEAT_ALREADY_LOCKED);
    expect(error.statusCode).toBe(HttpStatus.CONFLICT);
    expect(error.errorCode).toBe(ErrorCodes.SEAT_ALREADY_LOCKED);
    expect(error.name).toBe('ConflictError');
  });

  it('RateLimitError should default to 429 Too Many Requests', () => {
    const error = new RateLimitError('Too many attempts');
    expect(error.statusCode).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect(error.errorCode).toBe(ErrorCodes.RATE_LIMIT_EXCEEDED);
    expect(error.name).toBe('RateLimitError');
  });

  it('DatabaseError should default to 500 Internal Server Error', () => {
    const error = new DatabaseError('Query failed');
    expect(error.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(error.errorCode).toBe(ErrorCodes.DATABASE_ERROR);
    expect(error.name).toBe('DatabaseError');
  });
});
