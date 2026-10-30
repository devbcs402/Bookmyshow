import { jest } from '@jest/globals';
import { errorHandler } from '../../src/middlewares/error.middleware.js';
import { AppError } from '../../src/common/errors/app.error.js';
import HttpStatus from '../../src/common/constants/http-status.js';
import ErrorCodes from '../../src/common/constants/error-codes.js';

describe('Global Error Handler Middleware Unit Tests', () => {
  let mockReq;
  let mockRes;
  let next;

  beforeEach(() => {
    mockReq = {
      id: 'req-err-test',
      method: 'GET',
      originalUrl: '/api/v1/test'
    };
    mockRes = {
      statusCode: null,
      jsonData: null,
      locals: { requestId: 'req-err-test' },
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.jsonData = data;
        return this;
      }
    };
    next = jest.fn();
  });

  it('should format AppError correctly', () => {
    const error = new AppError(
      'Custom conflict occurred',
      HttpStatus.CONFLICT,
      ErrorCodes.CONFLICT
    );
    errorHandler(error, mockReq, mockRes, next);

    expect(mockRes.statusCode).toBe(HttpStatus.CONFLICT);
    expect(mockRes.jsonData.success).toBe(false);
    expect(mockRes.jsonData.error.code).toBe(ErrorCodes.CONFLICT);
    expect(mockRes.jsonData.message).toBe('Custom conflict occurred');
  });

  it('should format Mongoose ValidationError correctly', () => {
    const error = {
      name: 'ValidationError',
      errors: {
        email: { message: 'Email is required', kind: 'required' },
        title: { message: 'Title is too short', kind: 'minlength' }
      }
    };

    errorHandler(error, mockReq, mockRes, next);

    expect(mockRes.statusCode).toBe(HttpStatus.BAD_REQUEST);
    expect(mockRes.jsonData.error.code).toBe(ErrorCodes.VALIDATION_ERROR);
    expect(mockRes.jsonData.error.details.length).toBe(2);
  });

  it('should format Mongoose CastError (invalid ObjectId) correctly', () => {
    const error = {
      name: 'CastError',
      path: '_id',
      value: 'invalid-id'
    };

    errorHandler(error, mockReq, mockRes, next);

    expect(mockRes.statusCode).toBe(HttpStatus.BAD_REQUEST);
    expect(mockRes.jsonData.error.code).toBe(ErrorCodes.INVALID_OBJECT_ID);
    expect(mockRes.jsonData.message).toContain('Invalid identifier format');
  });

  it('should format MongoDB duplicate key error (code 11000) correctly', () => {
    const error = {
      name: 'MongoServerError',
      code: 11000,
      keyValue: { email: 'duplicate@example.com' }
    };

    errorHandler(error, mockReq, mockRes, next);

    expect(mockRes.statusCode).toBe(HttpStatus.CONFLICT);
    expect(mockRes.jsonData.error.code).toBe(ErrorCodes.DUPLICATE_RESOURCE);
    expect(mockRes.jsonData.message).toContain('duplicate@example.com');
  });

  it('should format CORS Error correctly', () => {
    const error = new Error("CORS Error: Origin 'http://malicious.com' is not permitted by policy");

    errorHandler(error, mockReq, mockRes, next);

    expect(mockRes.statusCode).toBe(HttpStatus.FORBIDDEN);
    expect(mockRes.jsonData.error.code).toBe(ErrorCodes.FORBIDDEN);
  });
});
