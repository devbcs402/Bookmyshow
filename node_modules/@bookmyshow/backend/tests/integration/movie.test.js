import request from 'supertest';
import { jest } from '@jest/globals';
import createApp from '../../src/app.js';
import MovieService from '../../src/modules/movies/movie.service.js';
import AuthRepository from '../../src/modules/auth/auth.repository.js';
import { Roles } from '../../src/modules/auth/auth.constants.js';
import { MovieStatus, CensorRating } from '../../src/modules/movies/movie.constants.js';
import { generateAccessToken } from '../../src/modules/auth/auth.utils.js';

describe('Movie Endpoints Integration Tests', () => {
  let app;
  let adminToken;
  let ownerToken;
  let customerToken;

  const adminId = '65f1a2b3c4d5e6f7a8b9c0d1';
  const ownerId = '65f1a2b3c4d5e6f7a8b9c0d2';
  const customerId = '65f1a2b3c4d5e6f7a8b9c0d3';
  const partnerId = '65f1a2b3c4d5e6f7a8b9c0d4';

  const sampleMovie = {
    _id: '65f1a2b3c4d5e6f7a8b9c0aa',
    title: 'Dune: Part Two',
    slug: 'dune-part-two',
    synopsis:
      'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators.',
    durationMins: 166,
    releaseDate: '2026-11-15T00:00:00.000Z',
    censorRating: CensorRating.UA_13_PLUS,
    genreIds: ['65f1a2b3c4d5e6f7a8b9c0f1'],
    languageIds: ['65f1a2b3c4d5e6f7a8b9c0e1'],
    posterUrl: 'https://res.cloudinary.com/bms/dune2-poster.jpg',
    status: MovieStatus.NOW_SHOWING,
    avgRating: 8.8,
    totalReviews: 3200
  };

  beforeAll(() => {
    app = createApp();
    adminToken = generateAccessToken({
      userId: adminId,
      sessionId: 'sess_admin',
      role: Roles.SUPER_ADMIN
    });
    ownerToken = generateAccessToken({
      userId: ownerId,
      sessionId: 'sess_owner',
      role: Roles.THEATRE_OWNER,
      partnerId
    });
    customerToken = generateAccessToken({
      userId: customerId,
      sessionId: 'sess_cust',
      role: Roles.CUSTOMER
    });
  });

  beforeEach(() => {
    jest.spyOn(AuthRepository, 'findSessionById').mockResolvedValue({
      _id: 'mock_session',
      isRevoked: false,
      expiresAt: new Date(Date.now() + 100000)
    });

    jest.spyOn(AuthRepository, 'findUserById').mockImplementation(async id => {
      if (id === adminId) {
        return {
          _id: adminId,
          email: 'admin@bms.com',
          role: Roles.SUPER_ADMIN,
          isActive: true
        };
      }
      if (id === ownerId) {
        return {
          _id: ownerId,
          email: 'owner@cinema.com',
          role: Roles.THEATRE_OWNER,
          partnerId,
          isActive: true
        };
      }
      return {
        _id: customerId,
        email: 'customer@bms.com',
        role: Roles.CUSTOMER,
        isActive: true
      };
    });

    jest.spyOn(AuthRepository, 'touchSession').mockResolvedValue({});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Admin Movie APIs', () => {
    const validCreatePayload = {
      title: 'Dune: Part Two',
      synopsis:
        'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators.',
      durationMins: 166,
      releaseDate: '2026-11-15T00:00:00.000Z',
      censorRating: CensorRating.UA_13_PLUS,
      genreIds: ['65f1a2b3c4d5e6f7a8b9c0f1'],
      languageIds: ['65f1a2b3c4d5e6f7a8b9c0e1'],
      posterUrl: 'https://res.cloudinary.com/bms/dune2-poster.jpg'
    };

    it('POST /api/v1/admin/movies should create movie when user has MOVIE_CREATE permission', async () => {
      jest.spyOn(MovieService, 'createMovie').mockResolvedValue(sampleMovie);

      const res = await request(app)
        .post('/api/v1/admin/movies')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validCreatePayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe(sampleMovie.title);
    });

    it('POST /api/v1/admin/movies should deny CUSTOMER with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/admin/movies')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(validCreatePayload);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('POST /api/v1/admin/movies should deny THEATRE_OWNER with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/admin/movies')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(validCreatePayload);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('GET /api/v1/admin/movies should return paginated admin movie list', async () => {
      jest.spyOn(MovieService, 'getAdminMovies').mockResolvedValue({
        movies: [sampleMovie],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1
      });

      const res = await request(app)
        .get('/api/v1/admin/movies?page=1&limit=20')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.meta.total).toBe(1);
    });

    it('PATCH /api/v1/admin/movies/:movieId/approve should approve movie', async () => {
      jest.spyOn(MovieService, 'approveMovie').mockResolvedValue({
        ...sampleMovie,
        status: MovieStatus.NOW_SHOWING
      });

      const res = await request(app)
        .patch(`/api/v1/admin/movies/${sampleMovie._id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('approved successfully');
    });

    it('PATCH /api/v1/admin/movies/:movieId/reject should reject movie with reason', async () => {
      jest.spyOn(MovieService, 'rejectMovie').mockResolvedValue({
        ...sampleMovie,
        status: MovieStatus.REJECTED,
        rejectionReason: 'Missing official poster certification'
      });

      const res = await request(app)
        .patch(`/api/v1/admin/movies/${sampleMovie._id}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Missing official poster certification' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('DELETE /api/v1/admin/movies/:movieId should soft-delete movie', async () => {
      jest.spyOn(MovieService, 'deleteMovie').mockResolvedValue({
        message: 'Movie archived and removed from catalog successfully'
      });

      const res = await request(app)
        .delete(`/api/v1/admin/movies/${sampleMovie._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Public Movie APIs', () => {
    it('GET /api/v1/movies should return public movie list', async () => {
      jest.spyOn(MovieService, 'getPublicMovies').mockResolvedValue({
        movies: [sampleMovie],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1
      });

      const res = await request(app).get('/api/v1/movies');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
    });

    it('GET /api/v1/movies/upcoming should return upcoming movies', async () => {
      jest.spyOn(MovieService, 'getUpcomingMovies').mockResolvedValue({
        movies: [{ ...sampleMovie, status: MovieStatus.UPCOMING }],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1
      });

      const res = await request(app).get('/api/v1/movies/upcoming');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('GET /api/v1/movies/:slug should return movie details for public slug', async () => {
      jest.spyOn(MovieService, 'getMovieBySlug').mockResolvedValue({
        id: sampleMovie._id,
        title: sampleMovie.title,
        slug: sampleMovie.slug,
        synopsis: sampleMovie.synopsis,
        durationMins: sampleMovie.durationMins,
        status: sampleMovie.status
      });

      const res = await request(app).get(`/api/v1/movies/${sampleMovie.slug}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.slug).toBe(sampleMovie.slug);
    });
  });
});
