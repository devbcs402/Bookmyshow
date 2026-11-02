import { Movie } from '../../movies/model/movie.model.js';
import { Show } from '../../shows/show.model.js';
import { DiscoveryRepository } from '../repositories/discovery.repository.js';
import { RecentlyViewedRepository } from '../repositories/recently-viewed.repository.js';
import { DiscoveryCacheService } from './discovery-cache.service.js';
import { PublicVisibleStatuses } from '../../movies/movie.constants.js';
import { ShowStatus } from '../../shows/show.constants.js';
import {
  DiscoveryRecommendationTypes,
  RecommendationScores,
  DiscoveryCacheKeys,
  DiscoveryTTLs
} from '../constants/discovery.constants.js';

export class RecommendationService {
  /**
   * Generate explainable, rule-based movie recommendations
   */
  static async getRecommendations({
    userId = null,
    type: _type = DiscoveryRecommendationTypes.FOR_YOU,
    cityId = null,
    limit = 10
  }) {
    // 1. If anonymous user, return non-personalized explainable discovery
    if (!userId) {
      return this.getAnonymousRecommendations({ cityId, limit });
    }

    // 2. Fetch customer's signals: past bookings & recently viewed
    const [bookingSignals, recentMovieIds] = await Promise.all([
      DiscoveryRepository.findCustomerBookingSignals(userId, 20),
      RecentlyViewedRepository.getRecentMovieIds(userId, 10)
    ]);

    // If user has no history yet, fallback gracefully to anonymous recommendations
    if (bookingSignals.length === 0 && recentMovieIds.length === 0) {
      return this.getAnonymousRecommendations({
        cityId,
        limit,
        fallbackReason: 'Popular movies to get you started'
      });
    }

    // 3. Extract preferred genres, languages, and watched movie IDs
    const watchedMovieIds = new Set();
    const genreFrequency = new Map();
    const languageFrequency = new Map();
    const directorFrequency = new Map();

    bookingSignals.forEach(b => {
      if (b.movieId) {
        watchedMovieIds.add(b.movieId._id.toString());
        (b.movieId.genreSlugs || []).forEach(g => {
          genreFrequency.set(g, (genreFrequency.get(g) || 0) + 2);
        });
        (b.movieId.languageIds || []).forEach(l => {
          const lId = (l._id || l).toString();
          languageFrequency.set(lId, (languageFrequency.get(lId) || 0) + 2);
        });
        (b.movieId.crew || []).forEach(c => {
          if (c.role === 'DIRECTOR') {
            directorFrequency.set(
              c.name.toLowerCase(),
              (directorFrequency.get(c.name.toLowerCase()) || 0) + 1
            );
          }
        });
      }
    });

    recentMovieIds.forEach(id => {
      watchedMovieIds.add(id.toString());
    });

    // Top preferred genres and languages
    const topGenres = [...genreFrequency.entries()].sort((a, b) => b[1] - a[1]).map(e => e[0]);

    // 4. Discover active shows in customer's city if provided
    let activeMovieIdsInCity = new Set();
    if (cityId) {
      const activeShows = await Show.distinct('movieId', {
        cityId,
        status: ShowStatus.PUBLISHED,
        startTime: { $gte: new Date() },
        isDeleted: false
      });
      activeMovieIdsInCity = new Set(activeShows.map(id => id.toString()));
    }

    // 5. Query candidate public movies excluding watched ones
    const candidateQuery = {
      _id: { $nin: [...watchedMovieIds] },
      status: { $in: PublicVisibleStatuses },
      isDeleted: false
    };

    if (topGenres.length > 0) {
      candidateQuery.genreSlugs = { $in: topGenres.slice(0, 3) };
    }

    const candidateMovies = await Movie.find(candidateQuery)
      .populate('genreIds', 'name slug')
      .populate('languageIds', 'name code nativeName')
      .limit(40)
      .lean();

    // 6. Score candidate movies using the explainable scoring formula
    const scoredMovies = candidateMovies.map(movie => {
      let score = 0;
      const reasons = [];

      // Genre match (+30 max)
      const matchingGenres = (movie.genreSlugs || []).filter(g => genreFrequency.has(g));
      if (matchingGenres.length > 0) {
        score += RecommendationScores.GENRE_MATCH;
        reasons.push(`matches your preferred genres (${matchingGenres.join(', ')})`);
      }

      // Language match (+20)
      const movieLangIds = (movie.languageIds || []).map(l => (l._id || l).toString());
      const hasLangMatch = movieLangIds.some(id => languageFrequency.has(id));
      if (hasLangMatch) {
        score += RecommendationScores.LANGUAGE_MATCH;
        reasons.push('available in your preferred language');
      }

      // Director match (+15)
      const hasDirectorMatch = (movie.crew || []).some(
        c => c.role === 'DIRECTOR' && directorFrequency.has((c.name || '').toLowerCase())
      );
      if (hasDirectorMatch) {
        score += RecommendationScores.DIRECTOR_MATCH;
        reasons.push('directed by a filmmaker you enjoyed');
      }

      // Show availability in user city (+25)
      if (activeMovieIdsInCity.has(movie._id.toString())) {
        score += RecommendationScores.SHOW_AVAILABLE_IN_CITY;
        reasons.push('currently showing in theatres near you');
      }

      // Rating bonus (up to +10)
      const ratingBonus = ((movie.avgRating || 0) / 10) * RecommendationScores.RATING_MAX_POINTS;
      score += Number(ratingBonus.toFixed(1));

      const explanation =
        reasons.length > 0
          ? `Recommended because it ${reasons.join(' and ')}`
          : 'Recommended based on high viewer ratings';

      return {
        ...movie,
        recommendationScore: Number(score.toFixed(1)),
        explanation
      };
    });

    // 7. Sort by score descending and cap at requested limit
    return scoredMovies
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, limit);
  }

  /**
   * Anonymous explainable recommendations based on popularity and show availability
   */
  static async getAnonymousRecommendations({
    cityId = null,
    limit = 10,
    fallbackReason = 'Trending near you'
  }) {
    const cacheKey = `${DiscoveryCacheKeys.RECOMMENDATIONS_PREFIX}anon:${cityId || 'all'}:${limit}`;
    const cached = await DiscoveryCacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const filter = {
      status: { $in: PublicVisibleStatuses },
      isDeleted: false
    };

    // If city provided, discover movies with published shows
    if (cityId) {
      const activeShows = await Show.distinct('movieId', {
        cityId,
        status: ShowStatus.PUBLISHED,
        startTime: { $gte: new Date() },
        isDeleted: false
      });
      if (activeShows.length > 0) {
        filter._id = { $in: activeShows };
      }
    }

    const movies = await Movie.find(filter)
      .populate('genreIds', 'name slug')
      .populate('languageIds', 'name code nativeName')
      .sort({ avgRating: -1, releaseDate: -1 })
      .limit(limit)
      .lean();

    const result = movies.map(m => ({
      ...m,
      recommendationScore: Number(((m.avgRating || 5) * 10).toFixed(1)),
      explanation: fallbackReason
    }));

    await DiscoveryCacheService.set(cacheKey, result, DiscoveryTTLs.RECOMMENDATIONS_SECONDS);

    return result;
  }
}

export default RecommendationService;
