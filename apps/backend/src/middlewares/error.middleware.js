import config from '../config/env.js';
import logger from '../config/logger.js';
import HttpStatus from '../common/constants/http-status.js';
import ErrorCodes from '../common/constants/error-codes.js';
import ApiResponse from '../common/responses/api-response.js';
import { AppError } from '../common/errors/app.error.js';

export const errorHandler = (err, req, res, _next) => {
  let statusCode = err.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
  let errorCode = err.errorCode || ErrorCodes.INTERNAL_SERVER_ERROR;
  let message = err.message || 'An unexpected internal server error occurred';
  let details = err.details || null;

  // 1. Handle SyntaxError for Malformed JSON Body
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = HttpStatus.BAD_REQUEST;
    errorCode = ErrorCodes.MALFORMED_JSON;
    message = 'Malformed JSON payload in request body';
    details = { error: err.message };
  }

  // 2. Handle Mongoose Validation Errors
  else if (err.name === 'ValidationError' && err.errors) {
    statusCode = HttpStatus.BAD_REQUEST;
    errorCode = ErrorCodes.VALIDATION_ERROR;
    message = 'Database validation failed for entity';
    details = Object.keys(err.errors).map(field => ({
      field,
      message: err.errors[field].message,
      kind: err.errors[field].kind
    }));
  }

  // 3. Handle Mongoose CastError (Invalid ObjectId)
  else if (err.name === 'CastError') {
    statusCode = HttpStatus.BAD_REQUEST;
    errorCode = ErrorCodes.INVALID_OBJECT_ID;
    message = `Invalid identifier format for field '${err.path}'`;
    details = { field: err.path, value: err.value };
  }

  // 4. Handle MongoDB Duplicate Key Error (E11000)
  else if (err.name === 'MongoServerError' && err.code === 11000) {
    statusCode = HttpStatus.CONFLICT;
    errorCode = ErrorCodes.DUPLICATE_RESOURCE;
    const duplicatedFields = Object.keys(err.keyPattern || err.keyValue || {});
    const fieldName = duplicatedFields[0] || 'field';
    const fieldValue = err.keyValue ? err.keyValue[fieldName] : 'value';
    message = `Duplicate resource: A record with ${fieldName} '${fieldValue}' already exists`;
    details = { duplicateField: fieldName, duplicateValue: fieldValue };
  }

  // 5. Handle CORS Errors
  else if (err.message && err.message.startsWith('CORS Error:')) {
    statusCode = HttpStatus.FORBIDDEN;
    errorCode = ErrorCodes.FORBIDDEN;
    message = err.message;
  }

  // 6. Handle generic non-operational errors in production
  else if (!(err instanceof AppError) && config.NODE_ENV === 'production') {
    message = 'An unexpected error occurred. Please contact system support.';
    details = null;
  }

  // Log error with correlation requestId
  logger.error({
    msg: 'HTTP Request Error',
    requestId: req.id,
    method: req.method,
    url: req.originalUrl,
    statusCode,
    errorCode,
    errorMessage: err.message,
    stack: config.NODE_ENV === 'development' ? err.stack : undefined
  });

  return ApiResponse.error(res, {
    statusCode,
    message,
    errorCode,
    details,
    requestId: req.id,
    stack: config.NODE_ENV === 'development' ? err.stack : undefined
  });
};

export default errorHandler;

