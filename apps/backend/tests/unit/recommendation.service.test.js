import { jest } from '@jest/globals';
import RecommendationService from '../../src/modules/discovery/services/recommendation.service.js';
import DiscoveryRepository from '../../src/modules/discovery/repositories/discovery.repository.js';
import RecentlyViewedRepository from '../../src/modules/discovery/repositories/recently-viewed.repository.js';
import DiscoveryCacheService from '../../src/modules/discovery/services/discovery-cache.service.js';
import { Movie } from '../../src/modules/movies/model/movie.model.js';
import { Show } from '../../src/modules/shows/show.model.js';

describe('RecommendationService Unit Tests', () => {
  const userId = '65f1a2b3c4d5e6f7a8b9c001';
  const watchedMovieId = '65f1a2b3c4d5e6f7a8b9c0aa';
  const candidateMovieId = '65f1a2b3c4d5e6f7a8b9c0bb';

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Personalized Recommendations', () => {
    it('should recommend movies based on genres and languages from customer booking signals', async () => {
      // 1. Mock cache miss
      jest.spyOn(DiscoveryCacheService, 'get').mockResolvedValue(null);

      // 2. Mock customer booking signals
      jest.spyOn(DiscoveryRepository, 'findCustomerBookingSignals').mockResolvedValue([
        {
          movieId: {
            _id: watchedMovieId,
            genreSlugs: ['action', 'thriller'],
            languageIds: ['lang_gu'],
            crew: [{ role: 'DIRECTOR', name: 'Nikhil Sachan' }]
          }
        }
      ]);

      // 3. Mock recently viewed IDs
      jest.spyOn(RecentlyViewedRepository, 'getRecentMovieIds').mockResolvedValue([watchedMovieId]);

      // 4. Mock active shows
      jest.spyOn(Show, 'distinct').mockResolvedValue([candidateMovieId]);

      // 5. Mock candidate public movies
      const candidateMovie = {
        _id: candidateMovieId,
        title: 'Chhello Divas',
        genreSlugs: ['action'],
        languageIds: ['lang_gu'],
        crew: [{ role: 'DIRECTOR', name: 'Nikhil Sachan' }],
        avgRating: 8.5
      };

      jest.spyOn(Movie, 'find').mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue([candidateMovie])
            })
          })
        })
      });

      const recommendations = await RecommendationService.getRecommendations({
        userId,
        cityId: 'city_rajkot',
        limit: 5
      });

      expect(recommendations).toHaveLength(1);
      expect(recommendations[0]._id).toBe(candidateMovieId);
      // Score should have: Genre (30) + Language (20) + Director (15) + City Show (25) + Rating bonus (8.5) = 98.5
      expect(recommendations[0].recommendationScore).toBeGreaterThanOrEqual(90);
      expect(recommendations[0].explanation).toContain('Recommended because it');
    });

    it('should fallback to anonymous recommendations when customer has no history', async () => {
      jest.spyOn(DiscoveryRepository, 'findCustomerBookingSignals').mockResolvedValue([]);
      jest.spyOn(RecentlyViewedRepository, 'getRecentMovieIds').mockResolvedValue([]);
      jest.spyOn(DiscoveryCacheService, 'get').mockResolvedValue(null);
      jest.spyOn(DiscoveryCacheService, 'set').mockResolvedValue(true);

      const popularMovie = {
        _id: '65f1a2b3c4d5e6f7a8b9c0cc',
        title: 'Popular Movie',
        avgRating: 8.9
      };

      jest.spyOn(Movie, 'find').mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue([popularMovie])
              })
            })
          })
        })
      });

      const recommendations = await RecommendationService.getRecommendations({
        userId,
        limit: 5
      });

      expect(recommendations).toHaveLength(1);
      expect(recommendations[0].explanation).toContain('Popular movies to get you started');
    });
  });

  describe('Anonymous Recommendations', () => {
    it('should return explainable popular movies for unauthenticated guest', async () => {
      jest.spyOn(DiscoveryCacheService, 'get').mockResolvedValue(null);
      jest.spyOn(DiscoveryCacheService, 'set').mockResolvedValue(true);

      const guestMovie = {
        _id: '65f1a2b3c4d5e6f7a8b9c0dd',
        title: 'Guest Discovery',
        avgRating: 9.0
      };

      jest.spyOn(Movie, 'find').mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue([guestMovie])
              })
            })
          })
        })
      });

      const recommendations = await RecommendationService.getRecommendations({
        userId: null,
        limit: 5
      });

      expect(recommendations).toHaveLength(1);
      expect(recommendations[0].explanation).toBe('Trending near you');
    });
  });
});

