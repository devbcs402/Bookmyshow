import request from 'supertest';
import { jest } from '@jest/globals';
import createApp from '../../src/app.js';
import AuthService from '../../src/modules/auth/auth.service.js';
import AuthRepository from '../../src/modules/auth/auth.repository.js';
import { Roles, ApprovalStatus } from '../../src/modules/auth/auth.constants.js';
import { generateAccessToken } from '../../src/modules/auth/auth.utils.js';

describe('Auth Endpoints Integration Tests', () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('POST /api/v1/auth/register', () => {
    const validPayload = {
      name: 'Aditi Sharma',
      email: 'aditi.sharma@example.com',
      mobile: '+919876543210',
      password: 'StrongPassword@123',
      confirmPassword: 'StrongPassword@123',
      acceptedTerms: true
    };

    it('should return 201 Created on valid customer registration', async () => {
      jest.spyOn(AuthService, 'registerCustomer').mockResolvedValue({
        user: {
          id: '65f1a2b3c4d5e6f7a8b9c0d1',
          name: validPayload.name,
          email: validPayload.email,
          phone: validPayload.mobile,
          role: Roles.CUSTOMER,
          approvalStatus: ApprovalStatus.APPROVED,
          isEmailVerified: false,
          isPhoneVerified: false
        },
        requiresVerification: true
      });

      const res = await request(app).post('/api/v1/auth/register').send(validPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(validPayload.email);
    });

    it('should return 400 Bad Request on schema validation failure', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        name: 'A', // too short
        email: 'invalid-email',
        mobile: '12345',
        password: 'weak',
        confirmPassword: 'mismatch',
        acceptedTerms: false
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(Array.isArray(res.body.error.details)).toBe(true);
    });
  });

  describe('POST /api/v1/auth/theatre-owner/register', () => {
    const validOwnerPayload = {
      ownerName: 'Sunil Shetty',
      businessEmail: 'sunil@shettycinemas.com',
      mobile: '+919876543211',
      businessName: 'Shetty Cinema Chain',
      businessAddress: 'MG Road, Bengaluru, KA',
      password: 'OwnerPassword@123',
      confirmPassword: 'OwnerPassword@123',
      acceptedTerms: true
    };

    it('should return 201 Created with PENDING_APPROVAL for theatre partner onboarding', async () => {
      jest.spyOn(AuthService, 'registerTheatreOwner').mockResolvedValue({
        user: {
          id: '65f1a2b3c4d5e6f7a8b9c0d2',
          name: validOwnerPayload.ownerName,
          email: validOwnerPayload.businessEmail,
          role: Roles.THEATRE_OWNER
        },
        partnerId: '65f1a2b3c4d5e6f7a8b9c0d3',
        approvalStatus: ApprovalStatus.PENDING_APPROVAL
      });

      const res = await request(app)
        .post('/api/v1/auth/theatre-owner/register')
        .send(validOwnerPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.approvalStatus).toBe(ApprovalStatus.PENDING_APPROVAL);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should return 200 OK and set HttpOnly refreshToken cookie on successful login', async () => {
      const mockTokens = {
        accessToken: 'mock.access.token',
        refreshToken: 'mock.refresh.token'
      };
      const mockUser = {
        id: '65f1a2b3c4d5e6f7a8b9c0d1',
        name: 'Aditi Sharma',
        email: 'aditi.sharma@example.com',
        role: Roles.CUSTOMER
      };

      jest.spyOn(AuthService, 'login').mockResolvedValue({
        user: mockUser,
        tokens: mockTokens
      });

      const res = await request(app).post('/api/v1/auth/login').send({
        identifier: 'aditi.sharma@example.com',
        password: 'StrongPassword@123'
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBe(mockTokens.accessToken);
      expect(res.headers['set-cookie']).toBeDefined();
      expect(res.headers['set-cookie'][0]).toContain('refreshToken');
      expect(res.headers['set-cookie'][0]).toContain('HttpOnly');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should rotate tokens and return 200 OK', async () => {
      jest.spyOn(AuthService, 'refreshTokens').mockResolvedValue({
        accessToken: 'new.access.token',
        refreshToken: 'new.refresh.token',
        user: { id: '65f1a2b3c4d5e6f7a8b9c0d1', role: Roles.CUSTOMER }
      });

      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', ['refreshToken=valid.refresh.token'])
        .send();

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBe('new.access.token');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should revoke session and clear cookie for authenticated user', async () => {
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
        email: 'user@example.com',
        role: Roles.CUSTOMER,
        isActive: true
      });
      jest.spyOn(AuthRepository, 'touchSession').mockResolvedValue({});
      jest.spyOn(AuthService, 'logout').mockResolvedValue({ success: true });

      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .send();

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Logged out successfully');
    });
  });

  describe('POST /api/v1/auth/password/forgot', () => {
    it('should return 200 OK with anti-enumeration message', async () => {
      jest.spyOn(AuthService, 'forgotPassword').mockResolvedValue({
        message:
          'If an account matches that identifier, password reset instructions have been dispatched.'
      });

      const res = await request(app).post('/api/v1/auth/password/forgot').send({
        identifier: 'anyuser@example.com'
      });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('password reset instructions have been dispatched');
    });
  });
});
