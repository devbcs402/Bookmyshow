import request from 'supertest';
import { jest } from '@jest/globals';
import createApp from '../../src/app.js';
import SearchService from '../../src/modules/discovery/services/search.service.js';
import FilterService from '../../src/modules/discovery/services/filter.service.js';
import DiscoveryService from '../../src/modules/discovery/services/discovery.service.js';
import SimilarMoviesService from '../../src/modules/discovery/services/similar-movies.service.js';
import TheatreDiscoveryService from '../../src/modules/discovery/services/theatre-discovery.service.js';
import ShowDiscoveryService from '../../src/modules/discovery/services/show-discovery.service.js';
import RecommendationService from '../../src/modules/discovery/services/recommendation.service.js';
import RecentlyViewedService from '../../src/modules/discovery/services/recently-viewed.service.js';
import MovieService from '../../src/modules/movies/movie.service.js';
import AuthRepository from '../../src/modules/auth/auth.repository.js';
import { Roles } from '../../src/modules/auth/auth.constants.js';
import { generateAccessToken } from '../../src/modules/auth/auth.utils.js';

describe('Discovery & Search Integration Tests', () => {
  let app;
  let customerToken;
  const customerId = '65f1a2b3c4d5e6f7a8b9c001';
  const sampleMovieId = '65f1a2b3c4d5e6f7a8b9c0aa';

  const sampleMovie = {
    _id: sampleMovieId,
    title: 'Dune: Part Two',
    slug: 'dune-part-two',
    censorRating: 'UA',
    durationMins: 166,
    avgRating: 8.8,
    releaseDate: '2026-11-15T00:00:00.000Z',
    status: 'NOW_SHOWING',
    posterUrl: 'https://cdn.example.com/dune2.jpg'
  };

  beforeAll(() => {
    app = createApp();
    customerToken = generateAccessToken({
      userId: customerId,
      sessionId: 'sess_discovery_cust',
      role: Roles.CUSTOMER
    });
  });

  beforeEach(() => {
    jest.spyOn(AuthRepository, 'findSessionById').mockResolvedValue({
      _id: 'sess_discovery_cust',
      isRevoked: false,
      expiresAt: new Date(Date.now() + 100000)
    });

    jest.spyOn(AuthRepository, 'findUserById').mockResolvedValue({
      _id: customerId,
      email: 'customer@bms.com',
      role: Roles.CUSTOMER,
      isActive: true,
      deletedAt: null
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /api/v1/movies/search', () => {
    it('should search movies by query string and return results', async () => {
      jest.spyOn(SearchService, 'searchMovies').mockResolvedValue({
        movies: [sampleMovie],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1
      });

      const res = await request(app).get('/api/v1/movies/search?q=Dune');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].title).toBe('Dune: Part Two');
    });

    it('should reject search query exceeding maximum length', async () => {
      const res = await request(app).get(`/api/v1/movies/search?q=${'a'.repeat(101)}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/movies (Filtering)', () => {
    it('should filter movies by genre, language and certification', async () => {
      const mockResult = {
        movies: [sampleMovie],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1
      };
      jest.spyOn(FilterService, 'filterMovies').mockResolvedValue(mockResult);
      jest.spyOn(MovieService, 'getPublicMovies').mockResolvedValue(mockResult);

      const res = await request(app).get(
        '/api/v1/movies?genre=action&certification=UA&releaseYear=2026'
      );

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe('GET /api/v1/movies/upcoming', () => {
    it('should return upcoming approved movies', async () => {
      const mockResult = {
        movies: [{ ...sampleMovie, status: 'UPCOMING' }],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1
      };
      jest.spyOn(DiscoveryService, 'getUpcomingMovies').mockResolvedValue(mockResult);
      jest.spyOn(MovieService, 'getUpcomingMovies').mockResolvedValue(mockResult);

      const res = await request(app).get('/api/v1/movies/upcoming');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data[0].status).toBe('UPCOMING');
    });
  });

  describe('GET /api/v1/movies/now-showing', () => {
    it('should return now-showing movies backed by published shows', async () => {
      jest.spyOn(DiscoveryService, 'getNowShowingMovies').mockResolvedValue({
        movies: [sampleMovie],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1
      });

      const res = await request(app).get('/api/v1/movies/now-showing');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe('GET /api/v1/movies/trending', () => {
    it('should return trending movies with velocity score', async () => {
      jest.spyOn(DiscoveryService, 'getTrendingMovies').mockResolvedValue({
        movies: [{ ...sampleMovie, trendingVelocity: 35 }],
        timeWindowHours: 48,
        total: 1
      });

      const res = await request(app).get('/api/v1/movies/trending');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data[0].trendingVelocity).toBe(35);
    });
  });

  describe('GET /api/v1/movies/popular', () => {
    it('should return popular movies over 30-day window', async () => {
      jest.spyOn(DiscoveryService, 'getPopularMovies').mockResolvedValue({
        movies: [{ ...sampleMovie, popularityScore: 88.5 }],
        timeWindowDays: 30,
        total: 1
      });

      const res = await request(app).get('/api/v1/movies/popular');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data[0].popularityScore).toBe(88.5);
    });
  });

  describe('GET /api/v1/movies/:movieId/similar', () => {
    it('should return similar movies', async () => {
      jest
        .spyOn(SimilarMoviesService, 'getSimilarMovies')
        .mockResolvedValue([
          { ...sampleMovie, _id: '65f1a2b3c4d5e6f7a8b9c0bb', similarityScore: 0.75 }
        ]);

      const res = await request(app).get(`/api/v1/movies/${sampleMovieId}/similar`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data[0].similarityScore).toBe(0.75);
    });
  });

  describe('GET /api/v1/theatres/search', () => {
    it('should return theatres matching geographical and locality filters', async () => {
      const mockTheatre = {
        _id: '65f1a2b3c4d5e6f7a8b9c001',
        name: 'PVR Rajkot',
        address: { cityName: 'Rajkot', area: 'Kalawad Road', pincode: '360005' },
        amenities: ['DOLBY_ATMOS', 'PARKING']
      };

      jest.spyOn(TheatreDiscoveryService, 'searchTheatres').mockResolvedValue({
        theatres: [mockTheatre],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1
      });

      const res = await request(app).get('/api/v1/theatres/search?city=Rajkot&pincode=360005');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('PVR Rajkot');
    });
  });

  describe('GET /api/v1/shows/search', () => {
    it('should return published shows matching criteria', async () => {
      const mockShow = {
        _id: '65f1a2b3c4d5e6f7a8b9c001',
        movieId: sampleMovieId,
        startTime: '2026-11-15T18:00:00.000Z',
        format: 'IMAX_2D',
        status: 'PUBLISHED'
      };

      jest.spyOn(ShowDiscoveryService, 'searchShows').mockResolvedValue({
        shows: [mockShow],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1
      });

      const res = await request(app).get('/api/v1/shows/search?format=IMAX_2D');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data[0].format).toBe('IMAX_2D');
    });
  });

  describe('GET /api/v1/recommendations', () => {
    it('should return explainable recommendations for authenticated user', async () => {
      jest.spyOn(RecommendationService, 'getRecommendations').mockResolvedValue([
        {
          ...sampleMovie,
          recommendationScore: 85.0,
          explanation: 'Recommended because it matches your preferred genres (Action)'
        }
      ]);

      const res = await request(app)
        .get('/api/v1/recommendations')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data[0].explanation).toBeDefined();
    });

    it('should return anonymous recommendations for unauthenticated guest', async () => {
      jest.spyOn(RecommendationService, 'getRecommendations').mockResolvedValue([
        {
          ...sampleMovie,
          recommendationScore: 80.0,
          explanation: 'Trending near you'
        }
      ]);

      const res = await request(app).get('/api/v1/recommendations');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data[0].explanation).toBe('Trending near you');
    });
  });

  describe('GET /api/v1/search/suggestions', () => {
    it('should return autocomplete suggestions', async () => {
      jest.spyOn(SearchService, 'getSearchSuggestions').mockResolvedValue([
        { type: 'MOVIE', title: 'Dune: Part Two', slug: 'dune-part-two' },
        { type: 'GENRE', title: 'Action', slug: 'action' }
      ]);

      const res = await request(app).get('/api/v1/search/suggestions?q=du');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].type).toBe('MOVIE');
    });
  });

  describe('Customer Recently Viewed History (/api/v1/users/me/recently-viewed)', () => {
    it('POST /:movieId should add movie to user history', async () => {
      jest.spyOn(RecentlyViewedService, 'recordMovieView').mockResolvedValue({
        userId: customerId,
        movieId: sampleMovieId,
        viewedAt: new Date()
      });

      const res = await request(app)
        .post(`/api/v1/users/me/recently-viewed/${sampleMovieId}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('GET / should retrieve user recently viewed movies', async () => {
      jest.spyOn(RecentlyViewedService, 'getRecentlyViewed').mockResolvedValue({
        movies: [sampleMovie],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1
      });

      const res = await request(app)
        .get('/api/v1/users/me/recently-viewed')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
    });

    it('DELETE / should clear customer recently viewed history', async () => {
      jest.spyOn(RecentlyViewedService, 'clearRecentlyViewed').mockResolvedValue({
        message: 'Recently viewed movie history cleared successfully',
        deletedCount: 3
      });

      const res = await request(app)
        .delete('/api/v1/users/me/recently-viewed')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.deletedCount).toBe(3);
    });
  });
});
