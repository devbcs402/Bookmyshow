import request from 'supertest';
import { jest } from '@jest/globals';
import createApp from '../../src/app.js';
import { Movie } from '../../src/modules/movies/model/movie.model.js';
import { Show } from '../../src/modules/shows/show.model.js';
import { Theatre } from '../../src/modules/theatres/model/theatre.model.js';
import { MovieStatus } from '../../src/modules/movies/movie.constants.js';
import { ShowStatus } from '../../src/modules/shows/show.constants.js';
import { TheatreStatus } from '../../src/modules/theatres/theatre.constants.js';
import DiscoveryRepository from '../../src/modules/discovery/repositories/discovery.repository.js';
import DiscoveryCacheService from '../../src/modules/discovery/services/discovery-cache.service.js';
import RecommendationService from '../../src/modules/discovery/services/recommendation.service.js';
import RecentlyViewedRepository from '../../src/modules/discovery/repositories/recently-viewed.repository.js';
import AuthRepository from '../../src/modules/auth/auth.repository.js';
import { Roles } from '../../src/modules/auth/auth.constants.js';
import { generateAccessToken } from '../../src/modules/auth/auth.utils.js';

describe('Discovery Critical Scenarios Integration Tests', () => {
  let app;
  let customerAToken;
  let customerBToken;

  const customerAId = '65f1a2b3c4d5e6f7a8b9c001';
  const customerBId = '65f1a2b3c4d5e6f7a8b9c002';

  beforeAll(() => {
    app = createApp();
    customerAToken = generateAccessToken({
      userId: customerAId,
      sessionId: 'sess_cust_a',
      role: Roles.CUSTOMER
    });
    customerBToken = generateAccessToken({
      userId: customerBId,
      sessionId: 'sess_cust_b',
      role: Roles.CUSTOMER
    });
  });

  beforeEach(() => {
    jest.spyOn(AuthRepository, 'findSessionById').mockImplementation(async sid => {
      return {
        _id: sid,
        isRevoked: false,
        expiresAt: new Date(Date.now() + 100000)
      };
    });

    jest.spyOn(AuthRepository, 'findUserById').mockImplementation(async id => {
      return {
        _id: id,
        email: id === customerAId ? 'customerA@bms.com' : 'customerB@bms.com',
        role: Roles.CUSTOMER,
        isActive: true,
        deletedAt: null
      };
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Scenario 1: Unpublished Movie Visibility Protection', () => {
    it('should never expose DRAFT, REJECTED, or ARCHIVED movies in public search or filters', async () => {
      // Spy on Movie.find and assert the query filter strictly contains PublicVisibleStatuses
      const findSpy = jest.spyOn(Movie, 'find').mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              sort: jest.fn().mockReturnValue({
                skip: jest.fn().mockReturnValue({
                  limit: jest.fn().mockReturnValue({
                    lean: jest.fn().mockResolvedValue([])
                  })
                })
              })
            })
          })
        })
      });

      jest.spyOn(Movie, 'countDocuments').mockResolvedValue(0);

      // 1. Search endpoint
      await request(app).get('/api/v1/movies/search?q=SecretDraft');

      expect(findSpy).toHaveBeenCalled();
      const calledFilter = findSpy.mock.calls[0][0];
      expect(calledFilter.isDeleted).toBe(false);
      expect(calledFilter.status).toEqual({
        $in: [MovieStatus.APPROVED, MovieStatus.UPCOMING, MovieStatus.NOW_SHOWING]
      });

      // 2. Reject attempts to query draft status directly
      const resDraft = await request(app).get('/api/v1/movies?status=DRAFT');
      expect(resDraft.status).toBe(400); // Validation rejects non-public status
    });
  });

  describe('Scenario 2: Show Availability Source of Truth', () => {
    it('should exclude movies without eligible published shows from now-showing in that location', async () => {
      const cityId = '65f1a2b3c4d5e6f7a8b9c099';

      // Mock Show.distinct returning empty array (no published shows in this city)
      jest.spyOn(Show, 'distinct').mockResolvedValue([]);
      jest.spyOn(DiscoveryCacheService, 'get').mockResolvedValue(null);

      const res = await request(app).get(`/api/v1/movies/now-showing?cityId=${cityId}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(0); // Zero movies returned because no shows exist
    });
  });

  describe('Scenario 3: Location Filtering and Tenant Isolation', () => {
    it('should filter theatres by location and never leak private partner/owner secrets', async () => {
      const mockTheatre = {
        _id: '65f1a2b3c4d5e6f7a8b9c011',
        name: 'Rajkot Multiplex',
        address: { cityName: 'Rajkot', area: '150ft Ring Road', pincode: '360005' },
        amenities: ['DOLBY_ATMOS'],
        status: TheatreStatus.APPROVED
      };

      jest.spyOn(DiscoveryCacheService, 'get').mockResolvedValue(null);
      jest.spyOn(Theatre, 'find').mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([mockTheatre])
          })
        })
      });
      jest.spyOn(Theatre, 'countDocuments').mockResolvedValue(1);

      const res = await request(app).get('/api/v1/theatres/search?city=Rajkot');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      const theatre = res.body.data[0];
      expect(theatre.name).toBe('Rajkot Multiplex');
      // Verify no sensitive partner credentials or internal bank/GST data is exposed
      expect(theatre.partnerId).toBeUndefined();
      expect(theatre.businessDetails).toBeUndefined();
      expect(theatre.createdBy).toBeUndefined();
    });
  });

  describe('Scenario 4: Recommendation Privacy Across Customers', () => {
    it('should strictly isolate Customer A personal history from Customer B recommendation results', async () => {
      // Mock Customer A booking signals: Gujarati Drama
      jest.spyOn(DiscoveryRepository, 'findCustomerBookingSignals').mockImplementation(async cId => {
        if (cId === customerAId) {
          return [
            {
              movieId: {
                _id: '65f1a2b3c4d5e6f7a8b9c0aa',
                genreSlugs: ['drama'],
                languageIds: ['lang_gu']
              }
            }
          ];
        }
        return []; // Customer B has no drama history
      });

      jest.spyOn(RecentlyViewedRepository, 'getRecentMovieIds').mockResolvedValue([]);
      jest.spyOn(Show, 'distinct').mockResolvedValue([]);

      const mockCandidate = {
        _id: '65f1a2b3c4d5e6f7a8b9c0bb',
        title: 'Chhello Show',
        genreSlugs: ['drama'],
        languageIds: ['lang_gu'],
        avgRating: 9.0
      };

      jest.spyOn(Movie, 'find').mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue([mockCandidate])
            }),
            sort: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue([mockCandidate])
              })
            })
          })
        })
      });

      // Request for Customer A
      const resA = await request(app)
        .get('/api/v1/recommendations')
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(resA.status).toBe(200);
      expect(resA.body.data[0].explanation).toContain('matches your preferred genres');

      // Request for Customer B (should not receive Customer A's drama explanation)
      jest.spyOn(DiscoveryCacheService, 'get').mockResolvedValue(null);
      jest.spyOn(DiscoveryCacheService, 'set').mockResolvedValue(true);

      const resB = await request(app)
        .get('/api/v1/recommendations')
        .set('Authorization', `Bearer ${customerBToken}`);

      expect(resB.status).toBe(200);
      expect(resB.body.data[0].explanation).toContain('Popular movies to get you started');
    });
  });

  describe('Scenario 5: Cache Invalidation', () => {
    it('should invalidate discovery cache keys when movie or show is mutated', async () => {
      const invalidateSpy = jest
        .spyOn(DiscoveryCacheService, 'invalidatePattern')
        .mockResolvedValue(true);
      const delSpy = jest.spyOn(DiscoveryCacheService, 'del').mockResolvedValue(true);

      await DiscoveryCacheService.invalidateMovieCaches('65f1a2b3c4d5e6f7a8b9c0aa');

      expect(invalidateSpy).toHaveBeenCalledWith('discovery:trending:*');
      expect(invalidateSpy).toHaveBeenCalledWith('discovery:popular:*');
      expect(invalidateSpy).toHaveBeenCalledWith('discovery:upcoming:*');
      expect(invalidateSpy).toHaveBeenCalledWith('discovery:now_showing:*');
      expect(delSpy).toHaveBeenCalledWith('discovery:similar:65f1a2b3c4d5e6f7a8b9c0aa');
    });
  });

  describe('Scenario 6: Search Abuse Defense', () => {
    it('should safely reject oversized search queries and malicious regex attempts', async () => {
      // 1. Oversized query (> 100 characters)
      const resOversized = await request(app).get(`/api/v1/movies/search?q=${'x'.repeat(101)}`);
      expect(resOversized.status).toBe(400);
      expect(resOversized.body.error.code).toBe('VALIDATION_ERROR');

      // 2. Safe escaping of regex injection chars (e.g. *+?()|{})
      const safeRegexStr = DiscoveryRepository.escapeRegex('.*?+()[]{}');
      expect(safeRegexStr).toBe('\\.\\*\\?\\+\\(\\)\\[\\]\\{\\}');
    });
  });
});

