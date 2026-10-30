import request from 'supertest';
import { jest } from '@jest/globals';
import createApp from '../../src/app.js';
import TheatreService from '../../src/modules/theatres/theatre.service.js';
import AuthRepository from '../../src/modules/auth/auth.repository.js';
import { Roles } from '../../src/modules/auth/auth.constants.js';
import { TheatreStatus } from '../../src/modules/theatres/theatre.constants.js';
import { generateAccessToken } from '../../src/modules/auth/auth.utils.js';

describe('Theatre Endpoints Integration Tests', () => {
  let app;
  let adminToken;
  let ownerToken;
  let customerToken;

  const mockAdminId = '65f1a2b3c4d5e6f7a8b9c0a1';
  const mockOwnerId = '65f1a2b3c4d5e6f7a8b9c0o1';
  const mockCustomerId = '65f1a2b3c4d5e6f7a8b9c0c1';
  const mockPartnerId = '65f1a2b3c4d5e6f7a8b9c0p1';
  const mockSessionId = '65f1a2b3c4d5e6f7a8b9c0s1';
  const mockCityId = '65f1a2b3c4d5e6f7a8b9c0f1';
  const mockTheatreId = '65f1a2b3c4d5e6f7a8b9c0e1';

  beforeAll(() => {
    app = createApp();

    adminToken = generateAccessToken({
      userId: mockAdminId,
      sessionId: mockSessionId,
      role: Roles.SUPER_ADMIN,
      partnerId: null
    });

    ownerToken = generateAccessToken({
      userId: mockOwnerId,
      sessionId: mockSessionId,
      role: Roles.THEATRE_OWNER,
      partnerId: mockPartnerId
    });

    customerToken = generateAccessToken({
      userId: mockCustomerId,
      sessionId: mockSessionId,
      role: Roles.CUSTOMER,
      partnerId: null
    });
  });

  beforeEach(() => {
    jest.spyOn(AuthRepository, 'findSessionById').mockResolvedValue({
      _id: mockSessionId,
      isRevoked: false,
      expiresAt: new Date(Date.now() + 86400000)
    });

    jest.spyOn(AuthRepository, 'findUserById').mockImplementation(userId => {
      if (userId === mockAdminId) {
        return Promise.resolve({
          _id: mockAdminId,
          role: Roles.SUPER_ADMIN,
          isActive: true
        });
      }
      if (userId === mockOwnerId) {
        return Promise.resolve({
          _id: mockOwnerId,
          role: Roles.THEATRE_OWNER,
          partnerId: mockPartnerId,
          isActive: true
        });
      }
      return Promise.resolve({
        _id: mockCustomerId,
        role: Roles.CUSTOMER,
        isActive: true
      });
    });

    jest.spyOn(AuthRepository, 'touchSession').mockResolvedValue({});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('POST /api/v1/owner/theatres', () => {
    const validTheatrePayload = {
      name: 'PVR ICON Phoenix',
      theatreCode: 'PVR-PHX-01',
      description: 'Multiplex in Mumbai',
      contactEmail: 'phoenix@pvr.com',
      contactPhone: '+912224989100',
      address: {
        street: '462, Senapati Bapat Marg',
        area: 'Lower Parel',
        cityId: mockCityId,
        state: 'Maharashtra',
        country: 'India',
        pincode: '400013'
      },
      location: {
        type: 'Point',
        coordinates: [72.8258, 18.9953]
      },
      amenities: ['PARKING', 'FOOD_BEVERAGES', 'DOLBY_ATMOS']
    };

    it('should register a theatre with 201 Created for authenticated THEATRE_OWNER', async () => {
      jest.spyOn(TheatreService, 'registerTheatre').mockResolvedValue({
        _id: mockTheatreId,
        name: 'PVR ICON Phoenix',
        slug: 'pvr-icon-phoenix-mumbai',
        partnerId: mockPartnerId,
        status: TheatreStatus.PENDING_APPROVAL
      });

      const res = await request(app)
        .post('/api/v1/owner/theatres')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(validTheatrePayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(TheatreStatus.PENDING_APPROVAL);
    });

    it('should reject registration with 403 Forbidden for CUSTOMER role', async () => {
      const res = await request(app)
        .post('/api/v1/owner/theatres')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(validTheatrePayload);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/owner/theatres', () => {
    it('should return 200 OK with paginated theatres for owner', async () => {
      jest.spyOn(TheatreService, 'getMyTheatres').mockResolvedValue({
        theatres: [{ _id: mockTheatreId, name: 'PVR ICON' }],
        pagination: { page: 1, limit: 20, totalRecords: 1, totalPages: 1 }
      });

      const res = await request(app)
        .get('/api/v1/owner/theatres')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe('PATCH /api/v1/admin/theatres/:theatreId/approve', () => {
    it('should approve theatre with 200 OK when requested by SUPER_ADMIN', async () => {
      jest.spyOn(TheatreService, 'approveTheatre').mockResolvedValue({
        _id: mockTheatreId,
        name: 'PVR ICON',
        status: TheatreStatus.APPROVED
      });

      const res = await request(app)
        .patch(`/api/v1/admin/theatres/${mockTheatreId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(TheatreStatus.APPROVED);
    });

    it('should return 403 Forbidden when requested by THEATRE_OWNER', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/theatres/${mockTheatreId}/approve`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/v1/admin/theatres/:theatreId/reject', () => {
    it('should reject theatre with 200 OK and record rejectionReason', async () => {
      jest.spyOn(TheatreService, 'rejectTheatre').mockResolvedValue({
        _id: mockTheatreId,
        status: TheatreStatus.REJECTED,
        rejectionReason: 'Invalid municipality trade license'
      });

      const res = await request(app)
        .patch(`/api/v1/admin/theatres/${mockTheatreId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ rejectionReason: 'Invalid municipality trade license' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(TheatreStatus.REJECTED);
    });
  });

  describe('GET /api/v1/theatres (Public Discovery)', () => {
    it('should return 200 OK with public approved theatres', async () => {
      jest.spyOn(TheatreService, 'getPublicTheatres').mockResolvedValue({
        theatres: [
          { _id: mockTheatreId, name: 'PVR ICON Phoenix', status: TheatreStatus.APPROVED }
        ],
        pagination: { page: 1, limit: 20, totalRecords: 1, totalPages: 1 }
      });

      const res = await request(app).get('/api/v1/theatres?citySlug=mumbai');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data[0].status).toBe(TheatreStatus.APPROVED);
    });

    it('should return theatre details for public slug', async () => {
      jest.spyOn(TheatreService, 'getPublicTheatreBySlug').mockResolvedValue({
        _id: mockTheatreId,
        name: 'PVR ICON Phoenix',
        slug: 'pvr-icon-phoenix-mumbai',
        status: TheatreStatus.APPROVED
      });

      const res = await request(app).get('/api/v1/theatres/pvr-icon-phoenix-mumbai');

      expect(res.status).toBe(200);
      expect(res.body.data.slug).toBe('pvr-icon-phoenix-mumbai');
    });
  });

  describe('POST /api/v1/owner/theatres/:theatreId/staff', () => {
    it('should assign a manager to the theatre', async () => {
      jest.spyOn(TheatreService, 'assignStaff').mockResolvedValue({
        userId: '65f1a2b3c4d5e6f7a8b9c0d9',
        name: 'Cinema Manager',
        role: Roles.THEATRE_MANAGER
      });

      const res = await request(app)
        .post(`/api/v1/owner/theatres/${mockTheatreId}/staff`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          userId: '65f1a2b3c4d5e6f7a8b9c0d9',
          role: Roles.THEATRE_MANAGER
        });

      expect(res.status).toBe(200);
      expect(res.body.data.role).toBe(Roles.THEATRE_MANAGER);
    });
  });
});
