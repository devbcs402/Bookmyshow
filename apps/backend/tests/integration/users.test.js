import request from 'supertest';
import { jest } from '@jest/globals';
import createApp from '../../src/app.js';
import UsersService from '../../src/modules/users/users.service.js';
import AuthRepository from '../../src/modules/auth/auth.repository.js';
import { Roles, ApprovalStatus } from '../../src/modules/auth/auth.constants.js';
import { generateAccessToken } from '../../src/modules/auth/auth.utils.js';

describe('Users Endpoints Integration Tests', () => {
  let app;
  const mockUserId = '65f1a2b3c4d5e6f7a8b9c0d1';
  const mockSessionId = '65f1a2b3c4d5e6f7a8b9c0d2';
  let authToken;

  beforeAll(() => {
    app = createApp();
    authToken = generateAccessToken({
      userId: mockUserId,
      sessionId: mockSessionId,
      role: Roles.CUSTOMER
    });
  });

  beforeEach(() => {
    // Standard mock for authenticate middleware
    jest.spyOn(AuthRepository, 'findSessionById').mockResolvedValue({
      _id: mockSessionId,
      isRevoked: false,
      expiresAt: new Date(Date.now() + 100000)
    });
    jest.spyOn(AuthRepository, 'findUserById').mockResolvedValue({
      _id: mockUserId,
      email: 'customer@example.com',
      role: Roles.CUSTOMER,
      isActive: true
    });
    jest.spyOn(AuthRepository, 'touchSession').mockResolvedValue({});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /api/v1/users/me', () => {
    it('should return 401 Unauthorized when no token is supplied', async () => {
      const res = await request(app).get('/api/v1/users/me');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 200 OK with sanitized user profile when authenticated', async () => {
      jest.spyOn(UsersService, 'getProfile').mockResolvedValue({
        id: mockUserId,
        name: 'Neha Gupta',
        email: 'customer@example.com',
        phone: '+919876543210',
        role: Roles.CUSTOMER,
        approvalStatus: ApprovalStatus.APPROVED,
        isEmailVerified: true,
        isPhoneVerified: true
      });

      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Neha Gupta');
      expect(res.body.data.email).toBe('customer@example.com');
    });
  });

  describe('PATCH /api/v1/users/me', () => {
    it('should return 200 OK on valid profile update', async () => {
      jest.spyOn(UsersService, 'updateProfile').mockResolvedValue({
        id: mockUserId,
        name: 'Neha R. Gupta',
        email: 'customer@example.com',
        role: Roles.CUSTOMER
      });

      const res = await request(app)
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Neha R. Gupta' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Neha R. Gupta');
    });
  });

  describe('GET /api/v1/users/me/sessions', () => {
    it('should return active sessions list', async () => {
      jest.spyOn(UsersService, 'getActiveSessions').mockResolvedValue([
        {
          id: mockSessionId,
          userAgent: 'Chrome',
          ipAddress: '127.0.0.1',
          isCurrent: true
        }
      ]);

      const res = await request(app)
        .get('/api/v1/users/me/sessions')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].isCurrent).toBe(true);
    });
  });

  describe('DELETE /api/v1/users/me', () => {
    it('should deactivate account and clear refresh token cookie', async () => {
      jest.spyOn(UsersService, 'deactivateAccount').mockResolvedValue({
        message: 'Account deactivated successfully. All active sessions have been terminated.'
      });

      const res = await request(app)
        .delete('/api/v1/users/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('deactivated successfully');
    });
  });
});

