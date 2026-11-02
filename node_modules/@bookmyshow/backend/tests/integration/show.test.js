import request from 'supertest';
import { jest } from '@jest/globals';
import createApp from '../../src/app.js';
import ShowService from '../../src/modules/shows/show.service.js';
import ShowPricingService from '../../src/modules/shows/show-pricing/show-pricing.service.js';
import AuthRepository from '../../src/modules/auth/auth.repository.js';
import { Roles } from '../../src/modules/auth/auth.constants.js';
import { generateAccessToken } from '../../src/modules/auth/auth.utils.js';

describe('Show Management & Scheduling Integration Tests', () => {
  let app;
  let ownerToken;
  let customerToken;

  const mockOwnerId = '65f1a2b3c4d5e6f7a8b9c0o1';
  const mockCustomerId = '65f1a2b3c4d5e6f7a8b9c0c1';
  const mockPartnerId = '65f1a2b3c4d5e6f7a8b9c0p1';
  const mockSessionId = '65f1a2b3c4d5e6f7a8b9c0s1';
  const mockTheatreId = '65f1a2b3c4d5e6f7a8b9c0t1';
  const mockScreenId = '65f1a2b3c4d5e6f7a8b9c0e1';
  const mockMovieId = '65f1a2b3c4d5e6f7a8b9c0m1';
  const mockShowId = '65f1a2b3c4d5e6f7a8b9c0h1';

  beforeAll(() => {
    app = createApp();

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
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Show Owner Endpoints', () => {
    it('POST /api/v1/owner/shows - creates show in DRAFT status', async () => {
      jest.spyOn(ShowService, 'createShow').mockResolvedValue({
        _id: mockShowId,
        status: 'DRAFT',
        startTime: new Date('2026-11-06T19:30:00.000Z')
      });

      const res = await request(app)
        .post('/api/v1/owner/shows')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          theatreId: mockTheatreId,
          screenId: mockScreenId,
          movieId: mockMovieId,
          startTime: '2026-11-06T19:30:00.000Z'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('DRAFT');
    });

    it('GET /api/v1/owner/shows - lists partner shows', async () => {
      jest.spyOn(ShowService, 'getOwnerShows').mockResolvedValue({
        items: [{ _id: mockShowId, status: 'DRAFT' }],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1
      });

      const res = await request(app)
        .get('/api/v1/owner/shows')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });

    it('GET /api/v1/owner/shows/:showId - gets show details', async () => {
      jest.spyOn(ShowService, 'getShowById').mockResolvedValue({
        _id: mockShowId,
        status: 'DRAFT'
      });

      const res = await request(app)
        .get(`/api/v1/owner/shows/${mockShowId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data._id).toBe(mockShowId);
    });

    it('PATCH /api/v1/owner/shows/:showId - updates show details', async () => {
      jest.spyOn(ShowService, 'updateShow').mockResolvedValue({
        _id: mockShowId,
        audioFormat: 'Dolby Atmos'
      });

      const res = await request(app)
        .patch(`/api/v1/owner/shows/${mockShowId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ audioFormat: 'Dolby Atmos' });

      expect(res.status).toBe(200);
      expect(res.body.data.audioFormat).toBe('Dolby Atmos');
    });

    it('PATCH /api/v1/owner/shows/:showId/reschedule - reschedules show', async () => {
      jest.spyOn(ShowService, 'rescheduleShow').mockResolvedValue({
        _id: mockShowId,
        startTime: new Date('2026-11-06T20:30:00.000Z')
      });

      const res = await request(app)
        .patch(`/api/v1/owner/shows/${mockShowId}/reschedule`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          newStartTime: '2026-11-06T20:30:00.000Z',
          reason: 'Evening schedule delay'
        });

      expect(res.status).toBe(200);
      expect(res.body.data._id).toBe(mockShowId);
    });

    it('PUT /api/v1/owner/shows/:showId/pricing - sets pricing tiers', async () => {
      jest.spyOn(ShowPricingService, 'setShowPricing').mockResolvedValue({
        showId: mockShowId,
        pricingTiers: [{ categoryCode: 'REGULAR', basePrice: 150 }]
      });

      const res = await request(app)
        .put(`/api/v1/owner/shows/${mockShowId}/pricing`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          pricingTiers: [{ categoryCode: 'REGULAR', basePrice: 150 }]
        });

      expect(res.status).toBe(200);
      expect(res.body.data.pricingTiers).toHaveLength(1);
    });

    it('POST /api/v1/owner/shows/:showId/publish - publishes show', async () => {
      jest.spyOn(ShowService, 'publishShow').mockResolvedValue({
        _id: mockShowId,
        status: 'PUBLISHED'
      });

      const res = await request(app)
        .post(`/api/v1/owner/shows/${mockShowId}/publish`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('PUBLISHED');
    });

    it('POST /api/v1/owner/shows/:showId/cancel - cancels show', async () => {
      jest.spyOn(ShowService, 'cancelShow').mockResolvedValue({
        _id: mockShowId,
        status: 'CANCELLED'
      });

      const res = await request(app)
        .post(`/api/v1/owner/shows/${mockShowId}/cancel`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ reason: 'Auditorium AC failure' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('CANCELLED');
    });

    it('rejects customer role from creating a show with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/owner/shows')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          theatreId: mockTheatreId,
          screenId: mockScreenId,
          movieId: mockMovieId,
          startTime: '2026-11-06T19:30:00.000Z'
        });

      expect(res.status).toBe(403);
    });
  });

  describe('Public Show Endpoints', () => {
    it('GET /api/v1/shows - searches published shows', async () => {
      jest.spyOn(ShowService, 'searchPublicShows').mockResolvedValue({
        items: [{ _id: mockShowId, status: 'PUBLISHED' }],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1
      });

      const res = await request(app).get('/api/v1/shows');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });

    it('GET /api/v1/shows/:showId - gets public show details', async () => {
      jest.spyOn(ShowService, 'getPublicShowDetails').mockResolvedValue({
        _id: mockShowId,
        status: 'PUBLISHED',
        startTime: new Date()
      });

      const res = await request(app).get(`/api/v1/shows/${mockShowId}`);

      expect(res.status).toBe(200);
      expect(res.body.data._id).toBe(mockShowId);
    });

    it('GET /api/v1/movies/:movieId/shows - gets shows for a movie', async () => {
      jest.spyOn(ShowService, 'getMovieShows').mockResolvedValue({
        items: [{ _id: mockShowId }],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1
      });

      const res = await request(app).get(`/api/v1/movies/${mockMovieId}/shows`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });

    it('GET /api/v1/theatres/:theatreId/shows - gets shows for a theatre', async () => {
      jest.spyOn(ShowService, 'getTheatreShows').mockResolvedValue({
        items: [{ _id: mockShowId }],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1
      });

      const res = await request(app).get(`/api/v1/theatres/${mockTheatreId}/shows`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });
  });
});
