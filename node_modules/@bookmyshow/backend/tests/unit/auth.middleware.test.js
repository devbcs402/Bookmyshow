import { jest } from '@jest/globals';
import {
  authenticate,
  authorize,
  authorizeRoles,
  authorizePermission,
  requireTenantScope
} from '../../src/middlewares/auth.middleware.js';
import { AuthenticationError } from '../../src/common/errors/authentication.error.js';
import { AuthorizationError } from '../../src/common/errors/authorization.error.js';
import { generateAccessToken } from '../../src/modules/auth/auth.utils.js';
import AuthRepository from '../../src/modules/auth/auth.repository.js';
import { Roles, Permissions } from '../../src/modules/auth/auth.constants.js';

describe('Auth Middleware Unit Tests', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('authenticate', () => {
    it('should throw AuthenticationError when no Authorization header or cookie is present', async () => {
      const req = { headers: {} };
      const res = {};
      const next = jest.fn();

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AuthenticationError);
      expect(err.statusCode).toBe(401);
    });

    it('should reject invalid or malformed access token', async () => {
      const req = { headers: { authorization: 'Bearer completely-invalid-jwt-token' } };
      const res = {};
      const next = jest.fn();

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AuthenticationError);
      expect(err.statusCode).toBe(401);
    });

    it('should reject if session does not exist or has been revoked', async () => {
      const token = generateAccessToken({
        userId: '65f1a2b3c4d5e6f7a8b9c0d1',
        sessionId: '65f1a2b3c4d5e6f7a8b9c0d2',
        role: Roles.CUSTOMER
      });

      jest.spyOn(AuthRepository, 'findSessionById').mockResolvedValue(null);

      const req = { headers: { authorization: `Bearer ${token}` } };
      const res = {};
      const next = jest.fn();

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AuthenticationError);
      expect(err.message).toContain('Session has expired or been revoked');
    });

    it('should reject if user account is deactivated', async () => {
      const token = generateAccessToken({
        userId: '65f1a2b3c4d5e6f7a8b9c0d1',
        sessionId: '65f1a2b3c4d5e6f7a8b9c0d2',
        role: Roles.CUSTOMER
      });

      jest.spyOn(AuthRepository, 'findSessionById').mockResolvedValue({
        _id: '65f1a2b3c4d5e6f7a8b9c0d2',
        isRevoked: false,
        expiresAt: new Date(Date.now() + 100000)
      });
      jest.spyOn(AuthRepository, 'findUserById').mockResolvedValue({
        _id: '65f1a2b3c4d5e6f7a8b9c0d1',
        isActive: false
      });

      const req = { headers: { authorization: `Bearer ${token}` } };
      const res = {};
      const next = jest.fn();

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AuthenticationError);
      expect(err.message).toContain('disabled or deactivated');
    });

    it('should hydrate req.user and call next() on valid token and active session', async () => {
      const token = generateAccessToken({
        userId: '65f1a2b3c4d5e6f7a8b9c0d1',
        sessionId: '65f1a2b3c4d5e6f7a8b9c0d2',
        role: Roles.CUSTOMER
      });

      jest.spyOn(AuthRepository, 'findSessionById').mockResolvedValue({
        _id: '65f1a2b3c4d5e6f7a8b9c0d2',
        isRevoked: false,
        expiresAt: new Date(Date.now() + 100000)
      });
      jest.spyOn(AuthRepository, 'findUserById').mockResolvedValue({
        _id: '65f1a2b3c4d5e6f7a8b9c0d1',
        email: 'customer@example.com',
        role: Roles.CUSTOMER,
        isActive: true
      });
      jest.spyOn(AuthRepository, 'touchSession').mockResolvedValue({});

      const req = { headers: { authorization: `Bearer ${token}` } };
      const res = {};
      const next = jest.fn();

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.user).toBeDefined();
      expect(req.user.id).toBe('65f1a2b3c4d5e6f7a8b9c0d1');
      expect(req.user.role).toBe(Roles.CUSTOMER);
      expect(req.user.permissions).toContain(Permissions.MOVIE_READ);
    });
  });

  describe('authorizeRoles', () => {
    it('should throw AuthenticationError if req.user is undefined', () => {
      const req = {};
      const next = jest.fn();
      authorizeRoles(Roles.SUPER_ADMIN)(req, {}, next);

      expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
    });

    it('should throw AuthorizationError if user role is not permitted', () => {
      const req = { user: { role: Roles.CUSTOMER } };
      const next = jest.fn();
      authorize(Roles.SUPER_ADMIN, Roles.THEATRE_OWNER)(req, {}, next);

      expect(next).toHaveBeenCalledWith(expect.any(AuthorizationError));
    });

    it('should call next() if user role is permitted', () => {
      const req = { user: { role: Roles.THEATRE_OWNER } };
      const next = jest.fn();
      authorizeRoles(Roles.SUPER_ADMIN, Roles.THEATRE_OWNER)(req, {}, next);

      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('authorizePermission', () => {
    it('should allow SUPER_ADMIN for any permission', () => {
      const req = { user: { role: Roles.SUPER_ADMIN, permissions: [] } };
      const next = jest.fn();

      authorizePermission(Permissions.THEATRE_CREATE)(req, {}, next);
      expect(next).toHaveBeenCalledWith();
    });

    it('should allow user if role grants permission', () => {
      const req = {
        user: {
          role: Roles.THEATRE_OWNER,
          permissions: [Permissions.THEATRE_CREATE, Permissions.SHOW_CREATE]
        }
      };
      const next = jest.fn();

      authorizePermission(Permissions.THEATRE_CREATE)(req, {}, next);
      expect(next).toHaveBeenCalledWith();
    });

    it('should reject user if role lacks permission', () => {
      const req = {
        user: {
          role: Roles.CUSTOMER,
          permissions: [Permissions.MOVIE_READ]
        }
      };
      const next = jest.fn();

      authorizePermission(Permissions.THEATRE_CREATE)(req, {}, next);
      expect(next).toHaveBeenCalledWith(expect.any(AuthorizationError));
    });
  });

  describe('requireTenantScope', () => {
    it('should allow SUPER_ADMIN regardless of tenant target', () => {
      const req = {
        user: { role: Roles.SUPER_ADMIN },
        params: { partnerId: 'partner-123' }
      };
      const next = jest.fn();

      requireTenantScope()(req, {}, next);
      expect(next).toHaveBeenCalledWith();
    });

    it('should allow THEATRE_OWNER when target partnerId matches user partnerId', () => {
      const req = {
        user: { role: Roles.THEATRE_OWNER, partnerId: 'partner-123' },
        params: { partnerId: 'partner-123' }
      };
      const next = jest.fn();

      requireTenantScope()(req, {}, next);
      expect(next).toHaveBeenCalledWith();
      expect(req.tenantPartnerId).toBe('partner-123');
    });

    it('should deny THEATRE_OWNER when trying to access cross-tenant partnerId', () => {
      const req = {
        user: { role: Roles.THEATRE_OWNER, partnerId: 'partner-123' },
        params: { partnerId: 'partner-999' }
      };
      const next = jest.fn();

      requireTenantScope()(req, {}, next);
      expect(next).toHaveBeenCalledWith(expect.any(AuthorizationError));
      const err = next.mock.calls[0][0];
      expect(err.message).toContain('Cross-tenant resource access is strictly prohibited');
    });

    it('should reject tenant user who has no partnerId assigned', () => {
      const req = {
        user: { role: Roles.THEATRE_OWNER, partnerId: null },
        params: { partnerId: 'partner-123' }
      };
      const next = jest.fn();

      requireTenantScope()(req, {}, next);
      expect(next).toHaveBeenCalledWith(expect.any(AuthorizationError));
      const err = next.mock.calls[0][0];
      expect(err.message).toContain('not associated with an approved theatre partner');
    });
  });
});
