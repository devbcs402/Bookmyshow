import express from 'express';
import request from 'supertest';
import { jest } from '@jest/globals';
import {
  authenticate,
  authorizeRoles,
  authorizePermission,
  requireTenantScope
} from '../../src/middlewares/auth.middleware.js';
import errorHandler from '../../src/middlewares/error.middleware.js';
import AuthRepository from '../../src/modules/auth/auth.repository.js';
import { Roles, Permissions } from '../../src/modules/auth/auth.constants.js';
import { generateAccessToken } from '../../src/modules/auth/auth.utils.js';
import ApiResponse from '../../src/common/responses/api-response.js';

describe('RBAC & Multi-Tenant Isolation Integration Tests', () => {
  let app;

  const customerId = '65f1a2b3c4d5e6f7a8b9c0d1';
  const ownerAId = '65f1a2b3c4d5e6f7a8b9c0d2';
  const superAdminId = '65f1a2b3c4d5e6f7a8b9c0d3';

  const partnerA = '65f1a2b3c4d5e6f7a8b9c0aa';
  const partnerB = '65f1a2b3c4d5e6f7a8b9c0bb';

  const customerToken = generateAccessToken({
    userId: customerId,
    sessionId: 'session_cust',
    role: Roles.CUSTOMER
  });
  const ownerAToken = generateAccessToken({
    userId: ownerAId,
    sessionId: 'session_owner_a',
    role: Roles.THEATRE_OWNER,
    partnerId: partnerA
  });
  const superAdminToken = generateAccessToken({
    userId: superAdminId,
    sessionId: 'session_admin',
    role: Roles.SUPER_ADMIN
  });

  beforeAll(() => {
    app = express();
    app.use(express.json());

    // Mock routes enforcing RBAC & Multi-tenancy
    app.get(
      '/api/test/owner-only',
      authenticate,
      authorizeRoles(Roles.THEATRE_OWNER, Roles.SUPER_ADMIN),
      (req, res) => ApiResponse.success(res, { message: 'Owner access granted' })
    );

    app.post(
      '/api/test/create-show',
      authenticate,
      authorizePermission(Permissions.SHOW_CREATE),
      (req, res) => ApiResponse.success(res, { message: 'Show created' })
    );

    app.get(
      '/api/test/partners/:partnerId/screens',
      authenticate,
      requireTenantScope('params.partnerId'),
      (req, res) =>
        ApiResponse.success(res, {
          message: `Screens for partner ${req.tenantPartnerId || 'admin'}`
        })
    );

    app.use(errorHandler);
  });

  beforeEach(() => {
    jest.spyOn(AuthRepository, 'touchSession').mockResolvedValue({});

    jest.spyOn(AuthRepository, 'findSessionById').mockImplementation(async sid => {
      return { _id: sid, isRevoked: false, expiresAt: new Date(Date.now() + 100000) };
    });

    jest.spyOn(AuthRepository, 'findUserById').mockImplementation(async uid => {
      if (uid === customerId) {
        return { _id: customerId, email: 'cust@mail.com', role: Roles.CUSTOMER, isActive: true };
      }
      if (uid === ownerAId) {
        return {
          _id: ownerAId,
          email: 'owner@mail.com',
          role: Roles.THEATRE_OWNER,
          partnerId: partnerA,
          isActive: true
        };
      }
      if (uid === superAdminId) {
        return {
          _id: superAdminId,
          email: 'admin@mail.com',
          role: Roles.SUPER_ADMIN,
          isActive: true
        };
      }
      return null;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Role-Based Access Control', () => {
    it('should deny CUSTOMER from accessing THEATRE_OWNER endpoint (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/test/owner-only')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should allow THEATRE_OWNER to access THEATRE_OWNER endpoint (200 OK)', async () => {
      const res = await request(app)
        .get('/api/test/owner-only')
        .set('Authorization', `Bearer ${ownerAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Owner access granted');
    });

    it('should allow SUPER_ADMIN to access THEATRE_OWNER endpoint (200 OK)', async () => {
      const res = await request(app)
        .get('/api/test/owner-only')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Granular Permission Authorization', () => {
    it('should reject CUSTOMER for SHOW_CREATE permission (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/test/create-show')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({});

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should permit THEATRE_OWNER for SHOW_CREATE permission (200 OK)', async () => {
      const res = await request(app)
        .post('/api/test/create-show')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should permit SUPER_ADMIN implicitly for any permission (200 OK)', async () => {
      const res = await request(app)
        .post('/api/test/create-show')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Multi-Tenant Data Isolation (Tenant Boundary)', () => {
    it('should allow Theatre Owner A to access their own partner resources (200 OK)', async () => {
      const res = await request(app)
        .get(`/api/test/partners/${partnerA}/screens`)
        .set('Authorization', `Bearer ${ownerAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should strictly deny Theatre Owner A from accessing Theatre Owner B resources (403 Forbidden / TENANT_ACCESS_DENIED)', async () => {
      const res = await request(app)
        .get(`/api/test/partners/${partnerB}/screens`)
        .set('Authorization', `Bearer ${ownerAToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('TENANT_ACCESS_DENIED');
      expect(res.body.message).toContain('Cross-tenant resource access is strictly prohibited');
    });

    it('should allow SUPER_ADMIN to access any partner resources (200 OK)', async () => {
      const res = await request(app)
        .get(`/api/test/partners/${partnerB}/screens`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
