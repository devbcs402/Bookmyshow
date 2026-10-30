import ApiResponse from '../../src/common/responses/api-response.js';
import PaginationMeta from '../../src/common/responses/pagination-meta.js';
import HttpStatus from '../../src/common/constants/http-status.js';

describe('Standard API Response Unit Tests', () => {
  let mockRes;

  beforeEach(() => {
    mockRes = {
      statusCode: null,
      jsonData: null,
      locals: { requestId: 'req-mock-123' },
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.jsonData = data;
        return this;
      }
    };
  });

  it('ApiResponse.success should return structured standard success format', () => {
    ApiResponse.success(mockRes, {
      message: 'Movies retrieved',
      data: [{ id: 1, title: 'Inception' }]
    });

    expect(mockRes.statusCode).toBe(HttpStatus.OK);
    expect(mockRes.jsonData.success).toBe(true);
    expect(mockRes.jsonData.message).toBe('Movies retrieved');
    expect(mockRes.jsonData.data).toEqual([{ id: 1, title: 'Inception' }]);
    expect(mockRes.jsonData.meta).toBeNull();
  });

  it('ApiResponse.created should return 201 Created', () => {
    ApiResponse.created(mockRes, {
      message: 'Booking created',
      data: { id: 'bk-123' }
    });

    expect(mockRes.statusCode).toBe(HttpStatus.CREATED);
    expect(mockRes.jsonData.success).toBe(true);
    expect(mockRes.jsonData.message).toBe('Booking created');
  });

  it('ApiResponse.error should return structured standard error format with requestId', () => {
    ApiResponse.error(mockRes, {
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'Invalid payload',
      errorCode: 'VALIDATION_ERROR',
      details: [{ field: 'email', message: 'Required' }],
      requestId: 'custom-req-id'
    });

    expect(mockRes.statusCode).toBe(HttpStatus.BAD_REQUEST);
    expect(mockRes.jsonData.success).toBe(false);
    expect(mockRes.jsonData.message).toBe('Invalid payload');
    expect(mockRes.jsonData.error.code).toBe('VALIDATION_ERROR');
    expect(mockRes.jsonData.error.details).toEqual([{ field: 'email', message: 'Required' }]);
    expect(mockRes.jsonData.requestId).toBe('custom-req-id');
  });

  it('PaginationMeta should calculate pages and flags accurately', () => {
    const meta = new PaginationMeta({
      totalRecords: 95,
      currentPage: 2,
      pageSize: 20
    });

    expect(meta.totalRecords).toBe(95);
    expect(meta.currentPage).toBe(2);
    expect(meta.pageSize).toBe(20);
    expect(meta.totalPages).toBe(5);
    expect(meta.hasNextPage).toBe(true);
    expect(meta.hasPrevPage).toBe(true);
  });
});

