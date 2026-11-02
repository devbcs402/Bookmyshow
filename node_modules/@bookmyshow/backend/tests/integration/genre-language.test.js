import request from 'supertest';
import { jest } from '@jest/globals';
import createApp from '../../src/app.js';
import GenreService from '../../src/modules/movies/genre.service.js';
import LanguageService from '../../src/modules/movies/language.service.js';
import AuthRepository from '../../src/modules/auth/auth.repository.js';
import { Roles } from '../../src/modules/auth/auth.constants.js';
import { generateAccessToken } from '../../src/modules/auth/auth.utils.js';

describe('Genre and Language Endpoints Integration Tests', () => {
  let app;
  let adminToken;
  let customerToken;

  const adminUserId = '65f1a2b3c4d5e6f7a8b9c0d1';
  const customerUserId = '65f1a2b3c4d5e6f7a8b9c0d2';

  beforeAll(() => {
    app = createApp();
    adminToken = generateAccessToken({
      userId: adminUserId,
      sessionId: 'sess_admin',
      role: Roles.SUPER_ADMIN
    });
    customerToken = generateAccessToken({
      userId: customerUserId,
      sessionId: 'sess_cust',
      role: Roles.CUSTOMER
    });
  });

  beforeEach(() => {
    jest.spyOn(AuthRepository, 'findSessionById').mockResolvedValue({
      _id: 'sess_admin',
      isRevoked: false,
      expiresAt: new Date(Date.now() + 100000)
    });
    jest.spyOn(AuthRepository, 'findUserById').mockImplementation(async id => {
      if (id === adminUserId) {
        return {
          _id: adminUserId,
          email: 'admin@bms.com',
          role: Roles.SUPER_ADMIN,
          isActive: true
        };
      }
      return { _id: customerUserId, email: 'cust@bms.com', role: Roles.CUSTOMER, isActive: true };
    });
    jest.spyOn(AuthRepository, 'touchSession').mockResolvedValue({});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Genres Endpoints', () => {
    it('GET /api/v1/genres should return public genres list', async () => {
      jest.spyOn(GenreService, 'getGenres').mockResolvedValue([
        { _id: 'g1', name: 'Action', slug: 'action' },
        { _id: 'g2', name: 'Comedy', slug: 'comedy' }
      ]);

      const res = await request(app).get('/api/v1/genres');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
    });

    it('POST /api/v1/admin/genres should create genre when authenticated as SUPER_ADMIN', async () => {
      jest.spyOn(GenreService, 'createGenre').mockResolvedValue({
        _id: 'g3',
        name: 'Thriller',
        slug: 'thriller'
      });

      const res = await request(app)
        .post('/api/v1/admin/genres')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Thriller' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Thriller');
    });

    it('POST /api/v1/admin/genres should deny CUSTOMER with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/admin/genres')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ name: 'Thriller' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Languages Endpoints', () => {
    it('GET /api/v1/languages should return public languages list', async () => {
      jest.spyOn(LanguageService, 'getLanguages').mockResolvedValue([
        { _id: 'l1', name: 'Hindi', code: 'hi' },
        { _id: 'l2', name: 'English', code: 'en' }
      ]);

      const res = await request(app).get('/api/v1/languages');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
    });

    it('POST /api/v1/admin/languages should create language when authenticated as SUPER_ADMIN', async () => {
      jest.spyOn(LanguageService, 'createLanguage').mockResolvedValue({
        _id: 'l3',
        name: 'Tamil',
        code: 'ta'
      });

      const res = await request(app)
        .post('/api/v1/admin/languages')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Tamil', code: 'ta' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.code).toBe('ta');
    });

    it('POST /api/v1/admin/languages should deny CUSTOMER with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/admin/languages')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ name: 'Tamil', code: 'ta' });

      expect(res.status).toBe(403);
    });
  });
});
