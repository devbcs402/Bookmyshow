import HttpStatus from '../constants/http-status.js';

export class ApiResponse {
  static success(
    res,
    {
      statusCode = HttpStatus.OK,
      message = 'Request completed successfully',
      data = null,
      meta = null
    } = {}
  ) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      meta
    });
  }

  static created(
    res,
    { message = 'Resource created successfully', data = null, meta = null } = {}
  ) {
    return this.success(res, {
      statusCode: HttpStatus.CREATED,
      message,
      data,
      meta
    });
  }

  static error(
    res,
    {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR,
      message = 'Something went wrong',
      errorCode = 'INTERNAL_SERVER_ERROR',
      details = null,
      requestId = null,
      stack = null
    } = {}
  ) {
    const responsePayload = {
      success: false,
      message,
      errorCode,
      error: {
        code: errorCode,
        ...(details ? { details } : {})
      },
      requestId: requestId || res?.locals?.requestId || null
    };

    if (stack) {
      responsePayload.stack = stack;
    }

    return res.status(statusCode).json(responsePayload);
  }
}

export default ApiResponse;
