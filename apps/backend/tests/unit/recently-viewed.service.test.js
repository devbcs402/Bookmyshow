import { jest } from '@jest/globals';
import RecentlyViewedService from '../../src/modules/discovery/services/recently-viewed.service.js';
import RecentlyViewedRepository from '../../src/modules/discovery/repositories/recently-viewed.repository.js';
import { Movie } from '../../src/modules/movies/model/movie.model.js';
import { NotFoundError } from '../../src/common/errors/not-found.error.js';

describe('RecentlyViewedService Unit Tests', () => {
  const userId = '65f1a2b3c4d5e6f7a8b9c001';
  const movieId = '65f1a2b3c4d5e6f7a8b9c0aa';

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('recordMovieView', () => {
    it('should throw NotFoundError if movie does not exist or is not public', async () => {
      jest.spyOn(Movie, 'findOne').mockResolvedValue(null);

      await expect(RecentlyViewedService.recordMovieView(userId, movieId)).rejects.toThrow(
        NotFoundError
      );
    });

    it('should record movie view and update timestamp on existing movie', async () => {
      jest.spyOn(Movie, 'findOne').mockResolvedValue({
        _id: movieId,
        title: 'Public Movie',
        status: 'NOW_SHOWING',
        isDeleted: false
      });

      const mockEntry = {
        _id: '65f1a2b3c4d5e6f7a8b9c099',
        userId,
        movieId,
        viewedAt: new Date()
      };

      jest.spyOn(RecentlyViewedRepository, 'recordView').mockResolvedValue(mockEntry);

      const entry = await RecentlyViewedService.recordMovieView(userId, movieId);

      expect(entry).toBeDefined();
      expect(entry.userId).toBe(userId);
      expect(entry.movieId).toBe(movieId);
    });
  });

  describe('getRecentlyViewed', () => {
    it('should return paginated recently viewed movies', async () => {
      jest.spyOn(RecentlyViewedRepository, 'getRecentlyViewed').mockResolvedValue({
        movies: [
          {
            _id: movieId,
            title: 'Recently Viewed Movie',
            viewedAt: new Date()
          }
        ],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1
      });

      const result = await RecentlyViewedService.getRecentlyViewed(userId, { page: 1, limit: 20 });

      expect(result.movies).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('clearRecentlyViewed', () => {
    it('should clear customer history and return deleted count', async () => {
      jest.spyOn(RecentlyViewedRepository, 'clearRecentlyViewed').mockResolvedValue(5);

      const result = await RecentlyViewedService.clearRecentlyViewed(userId);

      expect(result.deletedCount).toBe(5);
      expect(result.message).toContain('cleared successfully');
    });
  });
});
