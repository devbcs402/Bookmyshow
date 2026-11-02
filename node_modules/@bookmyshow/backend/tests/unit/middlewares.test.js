import { jest } from '@jest/globals';
import { z } from 'zod';
import requestIdMiddleware from '../../src/middlewares/request-id.middleware.js';
import validate from '../../src/middlewares/validate.middleware.js';
import notFoundHandler from '../../src/middlewares/not-found.middleware.js';
import { NotFoundError } from '../../src/common/errors/not-found.error.js';
import { ValidationError } from '../../src/common/errors/validation.error.js';

describe('Middlewares Unit Tests', () => {
  describe('requestIdMiddleware', () => {
    it('should generate a new UUID when no header is provided', () => {
      const req = { headers: {} };
      const res = {
        locals: {},
        setHeader: jest.fn()
      };
      const next = jest.fn();

      requestIdMiddleware(req, res, next);

      expect(req.id).toBeDefined();
      expect(typeof req.id).toBe('string');
      expect(res.setHeader).toHaveBeenCalledWith('X-Request-ID', req.id);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should reuse valid incoming x-request-id header', () => {
      const validIncomingId = 'custom-request-id-12345';
      const req = { headers: { 'x-request-id': validIncomingId } };
      const res = {
        locals: {},
        setHeader: jest.fn()
      };
      const next = jest.fn();

      requestIdMiddleware(req, res, next);

      expect(req.id).toBe(validIncomingId);
      expect(res.setHeader).toHaveBeenCalledWith('X-Request-ID', validIncomingId);
      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe('validate middleware', () => {
    const testSchema = {
      body: z.object({
        email: z.string().email(),
        seats: z.number().int().min(1).max(10)
      })
    };

    it('should call next() when request body satisfies schema', async () => {
      const req = {
        body: { email: 'customer@example.com', seats: 2 }
      };
      const res = {};
      const next = jest.fn();

      const middleware = validate(testSchema);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should pass ValidationError to next() when request body is invalid', async () => {
      const req = {
        body: { email: 'invalid-email', seats: 20 }
      };
      const res = {};
      const next = jest.fn();

      const middleware = validate(testSchema);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      const calledError = next.mock.calls[0][0];
      expect(calledError).toBeInstanceOf(ValidationError);
      expect(calledError.details.length).toBe(2);
    });
  });

  describe('notFoundHandler', () => {
    it('should pass NotFoundError to next()', () => {
      const req = { method: 'GET', originalUrl: '/api/v1/non-existent' };
      const res = {};
      const next = jest.fn();

      notFoundHandler(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(NotFoundError);
      expect(err.statusCode).toBe(404);
    });
  });
});
