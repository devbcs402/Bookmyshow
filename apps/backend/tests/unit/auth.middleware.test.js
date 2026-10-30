import { jest } from '@jest/globals';
import { authenticate, authorize } from '../../src/middlewares/auth.middleware.js';
import { AuthenticationError } from '../../src/common/errors/authentication.error.js';
import { AuthorizationError } from '../../src/common/errors/authorization.error.js';

describe('Auth Middleware Unit Tests', () => {
  describe('authenticate', () => {
    it('should throw AuthenticationError when no Authorization header is present', () => {
      const req = { headers: {} };
      const res = {};
      const next = jest.fn();

      authenticate(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AuthenticationError);
      expect(err.statusCode).toBe(401);
    });

    it('should throw AuthenticationError when Bearer token is missing after prefix', () => {
      const req = { headers: { authorization: 'Bearer ' } };
      const res = {};
      const next = jest.fn();

      authenticate(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AuthenticationError);
    });

    it('should attach user payload to req when valid Bearer token provided', () => {
      const req = { headers: { authorization: 'Bearer valid.jwt.token' } };
      const res = {};
      const next = jest.fn();

      authenticate(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.user).toBeDefined();
      expect(req.user.role).toBe('CUSTOMER');
    });
  });

  describe('authorize', () => {
    it('should throw AuthenticationError if req.user is undefined', () => {
      const req = {};
      const res = {};
      const next = jest.fn();

      const middleware = authorize('ADMIN');
      middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AuthenticationError);
    });

    it('should throw AuthorizationError if user role is not permitted', () => {
      const req = { user: { role: 'CUSTOMER' } };
      const res = {};
      const next = jest.fn();

      const middleware = authorize('SUPER_ADMIN', 'THEATRE_OWNER');
      middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AuthorizationError);
      expect(err.statusCode).toBe(403);
    });

    it('should call next() without error if user role is permitted', () => {
      const req = { user: { role: 'SUPER_ADMIN' } };
      const res = {};
      const next = jest.fn();

      const middleware = authorize('SUPER_ADMIN', 'THEATRE_OWNER');
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });
  });
});
