import request from 'supertest';
import { jest } from '@jest/globals';
import createApp from '../../src/app.js';
import ScreenService from '../../src/modules/screens/screen.service.js';
import SeatCategoryService from '../../src/modules/screens/seat-category/seat-category.service.js';
import SeatingLayoutService from '../../src/modules/screens/seating-layout/seating-layout.service.js';
import SeatService from '../../src/modules/screens/seat/seat.service.js';
import AuthRepository from '../../src/modules/auth/auth.repository.js';
import { Roles } from '../../src/modules/auth/auth.constants.js';
import { generateAccessToken } from '../../src/modules/auth/auth.utils.js';

describe('Screen & Seat Layout Integration Tests', () => {
  let app;
  let ownerToken;
  let adminToken;
  let customerToken;

  const mockOwnerId = '65f1a2b3c4d5e6f7a8b9c0o1';
  const mockAdminId = '65f1a2b3c4d5e6f7a8b9c0a1';
  const mockCustomerId = '65f1a2b3c4d5e6f7a8b9c0c1';
  const mockPartnerId = '65f1a2b3c4d5e6f7a8b9c0p1';
  const mockSessionId = '65f1a2b3c4d5e6f7a8b9c0s1';
  const mockTheatreId = '65f1a2b3c4d5e6f7a8b9c0t1';
  const mockScreenId = '65f1a2b3c4d5e6f7a8b9c0e1';
  const mockCategoryId = '65f1a2b3c4d5e6f7a8b9c0f1';

  beforeAll(() => {
    app = createApp();

    ownerToken = generateAccessToken({
      userId: mockOwnerId,
      sessionId: mockSessionId,
      role: Roles.THEATRE_OWNER,
      partnerId: mockPartnerId
    });

    adminToken = generateAccessToken({
      userId: mockAdminId,
      sessionId: mockSessionId,
      role: Roles.SUPER_ADMIN,
      partnerId: null
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
      if (userId === mockOwnerId) {
        return Promise.resolve({
          _id: mockOwnerId,
          role: Roles.THEATRE_OWNER,
          partnerId: mockPartnerId,
          isActive: true
        });
      }
      if (userId === mockAdminId) {
        return Promise.resolve({
          _id: mockAdminId,
          role: Roles.SUPER_ADMIN,
          isActive: true
        });
      }
      return Promise.resolve({
        _id: mockCustomerId,
        role: Roles.CUSTOMER,
        isActive: true
      });
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Screen Management API', () => {
    it('POST /api/v1/owner/theatres/:theatreId/screens - creates screen', async () => {
      jest.spyOn(ScreenService, 'createScreen').mockResolvedValue({
        _id: mockScreenId,
        theatreId: mockTheatreId,
        screenNumber: 1,
        name: 'Screen 1 - Atmos'
      });

      const res = await request(app)
        .post(`/api/v1/owner/theatres/${mockTheatreId}/screens`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Screen 1 - Atmos',
          screenNumber: 1,
          screenType: 'DOLBY_ATMOS'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Screen 1 - Atmos');
    });

    it('GET /api/v1/owner/theatres/:theatreId/screens - lists screens for theatre', async () => {
      jest.spyOn(ScreenService, 'getScreensByTheatre').mockResolvedValue({
        items: [{ _id: mockScreenId, screenNumber: 1, name: 'Screen 1' }],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1
      });

      const res = await request(app)
        .get(`/api/v1/owner/theatres/${mockTheatreId}/screens`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });

    it('GET /api/v1/owner/screens/:screenId - gets single screen', async () => {
      jest.spyOn(ScreenService, 'getScreenById').mockResolvedValue({
        _id: mockScreenId,
        screenNumber: 1,
        name: 'Screen 1'
      });

      const res = await request(app)
        .get(`/api/v1/owner/screens/${mockScreenId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data._id).toBe(mockScreenId);
    });

    it('PATCH /api/v1/owner/screens/:screenId - updates screen', async () => {
      jest.spyOn(ScreenService, 'updateScreen').mockResolvedValue({
        _id: mockScreenId,
        name: 'Screen 1 IMAX Remastered'
      });

      const res = await request(app)
        .patch(`/api/v1/owner/screens/${mockScreenId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Screen 1 IMAX Remastered'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Screen 1 IMAX Remastered');
    });

    it('PATCH /api/v1/owner/screens/:screenId/status - updates screen status', async () => {
      jest.spyOn(ScreenService, 'updateScreenStatus').mockResolvedValue({
        _id: mockScreenId,
        status: 'MAINTENANCE'
      });

      const res = await request(app)
        .patch(`/api/v1/owner/screens/${mockScreenId}/status`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          status: 'MAINTENANCE'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('MAINTENANCE');
    });

    it('DELETE /api/v1/owner/screens/:screenId - deletes screen', async () => {
      jest.spyOn(ScreenService, 'deleteScreen').mockResolvedValue({
        success: true,
        message: 'Screen deleted successfully'
      });

      const res = await request(app)
        .delete(`/api/v1/owner/screens/${mockScreenId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Seat Category API', () => {
    it('POST /api/v1/owner/seat-categories - creates custom category', async () => {
      jest.spyOn(SeatCategoryService, 'createCategory').mockResolvedValue({
        _id: mockCategoryId,
        code: 'VIP_SOFA',
        name: 'VIP Sofa',
        basePrice: 500
      });

      const res = await request(app)
        .post('/api/v1/owner/seat-categories')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'VIP Sofa',
          code: 'VIP_SOFA',
          basePrice: 500,
          displayColor: '#EC4899',
          sortOrder: 1
        });

      expect(res.status).toBe(201);
      expect(res.body.data.code).toBe('VIP_SOFA');
    });

    it('GET /api/v1/owner/seat-categories - retrieves categories for partner', async () => {
      jest.spyOn(SeatCategoryService, 'getCategoriesForPartner').mockResolvedValue([
        { code: 'REGULAR', basePrice: 150 },
        { code: 'VIP_SOFA', basePrice: 500 }
      ]);

      const res = await request(app)
        .get('/api/v1/owner/seat-categories')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
    });
  });

  describe('Layout Builder & Engine API', () => {
    it('POST /api/v1/owner/screens/:screenId/layout - saves draft layout', async () => {
      jest.spyOn(SeatingLayoutService, 'saveLayoutDraft').mockResolvedValue({
        screenId: mockScreenId,
        layoutVersion: 1,
        status: 'DRAFT',
        totalSeats: 2,
        seats: [
          { seatLabel: 'A1', rowLabel: 'A', columnNumber: 1, gridRow: 0, gridCol: 0 },
          { seatLabel: 'A2', rowLabel: 'A', columnNumber: 2, gridRow: 0, gridCol: 1 }
        ]
      });

      const res = await request(app)
        .post(`/api/v1/owner/screens/${mockScreenId}/layout`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Draft Layout',
          seats: [
            {
              seatLabel: 'A1',
              rowLabel: 'A',
              columnNumber: 1,
              categoryCode: 'REGULAR',
              gridRow: 0,
              gridCol: 0
            },
            {
              seatLabel: 'A2',
              rowLabel: 'A',
              columnNumber: 2,
              categoryCode: 'REGULAR',
              gridRow: 0,
              gridCol: 1
            }
          ]
        });

      expect(res.status).toBe(200);
      expect(res.body.data.totalSeats).toBe(2);
    });

    it('POST /api/v1/owner/screens/:screenId/layout/publish - publishes draft layout', async () => {
      jest.spyOn(SeatingLayoutService, 'publishLayout').mockResolvedValue({
        message: 'Seating layout successfully published',
        layout: { screenId: mockScreenId, status: 'PUBLISHED', layoutVersion: 1 },
        version: 1,
        totalSeats: 100,
        bookableSeats: 98
      });

      const res = await request(app)
        .post(`/api/v1/owner/screens/${mockScreenId}/layout/publish`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.version).toBe(1);
      expect(res.body.data.totalSeats).toBe(100);
    });

    it('GET /api/v1/owner/screens/:screenId/seats - gets physical seats', async () => {
      jest.spyOn(SeatService, 'getSeatsByScreen').mockResolvedValue({
        screenId: mockScreenId,
        layoutVersion: 1,
        totalSeats: 2,
        seats: [
          { _id: 's1', seatLabel: 'A1', status: 'ACTIVE' },
          { _id: 's2', seatLabel: 'A2', status: 'ACTIVE' }
        ]
      });

      const res = await request(app)
        .get(`/api/v1/owner/screens/${mockScreenId}/seats`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.meta.totalSeats).toBe(2);
    });
  });

  describe('Admin Screen API', () => {
    it('GET /api/v1/admin/screens - returns all screens for admin', async () => {
      jest.spyOn(ScreenService, 'adminListScreens').mockResolvedValue({
        items: [{ _id: mockScreenId, screenNumber: 1 }],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1
      });

      const res = await request(app)
        .get('/api/v1/admin/screens')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });

    it('rejects customer from admin screen endpoint with 403', async () => {
      const res = await request(app)
        .get('/api/v1/admin/screens')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
    });
  });
});
