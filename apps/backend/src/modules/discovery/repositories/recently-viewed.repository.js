import { RecentlyViewed } from '../models/recently-viewed.model.js';
import { PublicVisibleStatuses } from '../../movies/movie.constants.js';
import { DiscoveryDefaults } from '../constants/discovery.constants.js';

export class RecentlyViewedRepository {
  /**
   * Upsert a movie into user's recently viewed list and update timestamp.
   * Enforces history cap to maintain privacy and performance.
   */
  static async recordView(userId, movieId) {
    const entry = await RecentlyViewed.findOneAndUpdate(
      { userId, movieId },
      { $set: { viewedAt: new Date() } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Maintain history limit asynchronously
    this.trimHistory(userId, DiscoveryDefaults.RECENTLY_VIEWED_LIMIT).catch(() => {});

    return entry;
  }

  /**
   * Trim excess viewed records beyond maxLimit
   */
  static async trimHistory(userId, maxLimit = DiscoveryDefaults.RECENTLY_VIEWED_LIMIT) {
    const count = await RecentlyViewed.countDocuments({ userId });
    if (count > maxLimit) {
      const excessDocs = await RecentlyViewed.find({ userId })
        .sort({ viewedAt: -1 })
        .skip(maxLimit)
        .select('_id')
        .lean();

      if (excessDocs.length > 0) {
        const excessIds = excessDocs.map(d => d._id);
        await RecentlyViewed.deleteMany({ _id: { $in: excessIds } });
      }
    }
  }

  /**
   * Retrieve paginated recently viewed movies for user
   */
  static async getRecentlyViewed(userId, { page = 1, limit = 20 }) {
    const skip = (page - 1) * limit;

    const [entries, total] = await Promise.all([
      RecentlyViewed.find({ userId })
        .sort({ viewedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: 'movieId',
          select:
            'title slug posterUrl censorRating durationMins avgRating genreSlugs releaseDate status availableFormats isDeleted',
          match: {
            isDeleted: false,
            status: { $in: PublicVisibleStatuses }
          }
        })
        .lean(),
      RecentlyViewed.countDocuments({ userId })
    ]);

    // Filter out movies that have been deleted or archived after viewing
    const validMovies = entries
      .filter(item => item.movieId && !item.movieId.isDeleted)
      .map(item => ({
        ...item.movieId,
        viewedAt: item.viewedAt
      }));

    return {
      movies: validMovies,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1
    };
  }

  /**
   * Clear all recently viewed records for user
   */
  static async clearRecentlyViewed(userId) {
    const result = await RecentlyViewed.deleteMany({ userId });
    return result.deletedCount;
  }

  /**
   * Check if a specific movie exists in user's recently viewed
   */
  static async hasViewed(userId, movieId) {
    const count = await RecentlyViewed.countDocuments({ userId, movieId });
    return count > 0;
  }

  /**
   * Retrieve recent movie IDs for recommendation signals
   */
  static async getRecentMovieIds(userId, limit = 10) {
    const items = await RecentlyViewed.find({ userId })
      .sort({ viewedAt: -1 })
      .limit(limit)
      .select('movieId')
      .lean();
    return items.map(i => i.movieId);
  }
}

export default RecentlyViewedRepository;

