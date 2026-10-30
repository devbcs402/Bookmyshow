import { jest } from '@jest/globals';
import DiscoveryService from '../../src/modules/discovery/services/discovery.service.js';
import DiscoveryRepository from '../../src/modules/discovery/repositories/discovery.repository.js';
import DiscoveryCacheService from '../../src/modules/discovery/services/discovery-cache.service.js';
import { Movie } from '../../src/modules/movies/model/movie.model.js';

describe('Trending and Popular Discovery Unit Tests', () => {
  const movieId1 = '65f1a2b3c4d5e6f7a8b9c001';
  const movieId2 = '65f1a2b3c4d5e6f7a8b9c002';

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getTrendingMovies', () => {
    it('should calculate trending velocity from confirmed bookings aggregation', async () => {
      jest.spyOn(DiscoveryCacheService, 'get').mockResolvedValue(null);
      jest.spyOn(DiscoveryCacheService, 'set').mockResolvedValue(true);

      // Aggregations: movie 1 has 5 bookings & 10 seats => score: 5*2 + 10 = 20
      jest.spyOn(DiscoveryRepository, 'aggregateTrendingBookings').mockResolvedValue([
        { movieId: movieId1, bookingCount: 5, totalSeats: 10 }
      ]);

      const movieDoc = {
        _id: movieId1,
        title: 'Trending Hit',
        avgRating: 8.5
      };

      jest.spyOn(Movie, 'find').mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([movieDoc])
          })
        })
      });

      const result = await DiscoveryService.getTrendingMovies({ limit: 1 });

      expect(result.movies).toHaveLength(1);
      expect(result.movies[0]._id).toBe(movieId1);
      expect(result.movies[0].trendingVelocity).toBe(20);
      expect(result.timeWindowHours).toBe(48);
    });

    it('should use fallback top-rated movies when booking volume is sparse', async () => {
      jest.spyOn(DiscoveryCacheService, 'get').mockResolvedValue(null);
      jest.spyOn(DiscoveryCacheService, 'set').mockResolvedValue(true);
      jest.spyOn(DiscoveryRepository, 'aggregateTrendingBookings').mockResolvedValue([]);

      const fallbackMovie = {
        _id: movieId2,
        title: 'Critically Acclaimed Movie',
        avgRating: 9.2
      };

      jest.spyOn(Movie, 'find').mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue([fallbackMovie])
              })
            })
          })
        })
      });

      const result = await DiscoveryService.getTrendingMovies({ limit: 1 });

      expect(result.movies).toHaveLength(1);
      expect(result.movies[0]._id).toBe(movieId2);
      expect(result.movies[0].isFallbackTrending).toBe(true);
      expect(result.movies[0].trendingVelocity).toBe(46.0); // 9.2 * 5
    });
  });

  describe('getPopularMovies', () => {
    it('should compute sustained popularity score from 30-day booking aggregation', async () => {
      jest.spyOn(DiscoveryCacheService, 'get').mockResolvedValue(null);
      jest.spyOn(DiscoveryCacheService, 'set').mockResolvedValue(true);

      jest.spyOn(DiscoveryRepository, 'aggregatePopularBookings').mockResolvedValue([
        { movieId: movieId1, totalBookings: 100, totalRevenue: 50000 }
      ]);

      const movieDoc = {
        _id: movieId1,
        title: 'Blockbuster',
        avgRating: 9.0
      };

      jest.spyOn(Movie, 'find').mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([movieDoc])
          })
        })
      });

      const result = await DiscoveryService.getPopularMovies({ limit: 1 });

      expect(result.movies).toHaveLength(1);
      expect(result.movies[0]._id).toBe(movieId1);
      expect(result.movies[0].totalBookings).toBe(100);
      // Popularity score: 100 * 0.7 + (9.0/10) * 30 = 70 + 27 = 97
      expect(result.movies[0].popularityScore).toBe(97.0);
      expect(result.timeWindowDays).toBe(30);
    });
  });
});

