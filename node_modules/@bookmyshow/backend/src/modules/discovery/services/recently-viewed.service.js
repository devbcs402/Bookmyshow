import { RecentlyViewedRepository } from '../repositories/recently-viewed.repository.js';
import { Movie } from '../../movies/model/movie.model.js';
import { PublicVisibleStatuses } from '../../movies/movie.constants.js';
import { NotFoundError } from '../../../common/errors/index.js';
import { ErrorCodes } from '../../../common/constants/error-codes.js';

export class RecentlyViewedService {
  /**
   * Add a movie to the customer's recently viewed list
   */
  static async recordMovieView(userId, movieId) {
    // 1. Verify movie exists and is publicly accessible
    const movie = await Movie.findOne({
      _id: movieId,
      status: { $in: PublicVisibleStatuses },
      isDeleted: false
    });

    if (!movie) {
      throw new NotFoundError(
        'Movie not found or is currently not publicly available',
        ErrorCodes.MOVIE_NOT_FOUND
      );
    }

    // 2. Upsert entry and update timestamp
    return RecentlyViewedRepository.recordView(userId, movieId);
  }

  /**
   * Retrieve paginated recently viewed movies for customer
   */
  static async getRecentlyViewed(userId, { page = 1, limit = 20 }) {
    return RecentlyViewedRepository.getRecentlyViewed(userId, { page, limit });
  }

  /**
   * Clear all recently viewed movies for customer
   */
  static async clearRecentlyViewed(userId) {
    const deletedCount = await RecentlyViewedRepository.clearRecentlyViewed(userId);
    return {
      message: 'Recently viewed movie history cleared successfully',
      deletedCount
    };
  }
}

export default RecentlyViewedService;
