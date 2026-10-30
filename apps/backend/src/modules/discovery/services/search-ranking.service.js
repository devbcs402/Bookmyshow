import { RankingWeights } from '../constants/discovery.constants.js';

export class SearchRankingService {
  /**
   * Calculate relevance and ranking score for a movie against search context
   */
  static calculateMovieScore(movie, { query = '', activeMovieIds = new Set(), weights = RankingWeights }) {
    let textScore = 0;
    const lowerQuery = query.toLowerCase().trim();

    if (lowerQuery) {
      const lowerTitle = (movie.title || '').toLowerCase();
      if (lowerTitle === lowerQuery) {
        textScore = 1.0; // Exact match
      } else if (lowerTitle.startsWith(lowerQuery)) {
        textScore = 0.85; // Prefix match
      } else if (lowerTitle.includes(lowerQuery)) {
        textScore = 0.65; // Substring match
      } else {
        // Cast or crew match
        const hasCastMatch = (movie.cast || []).some(c =>
          (c.name || '').toLowerCase().includes(lowerQuery)
        );
        const hasCrewMatch = (movie.crew || []).some(c =>
          (c.name || '').toLowerCase().includes(lowerQuery)
        );
        if (hasCastMatch) {
          textScore = 0.45;
        } else if (hasCrewMatch) {
          textScore = 0.35;
        } else {
          textScore = 0.2;
        }
      }
    } else {
      textScore = 0.5; // Neutral text score if no text query provided
    }

    // Popularity score (normalized based on avgRating and totalReviews)
    const rating = Math.min(Math.max(movie.avgRating || 0, 0), 10);
    const reviews = Math.max(movie.totalReviews || 0, 0);
    // Logarithmic scale for reviews so a movie with 10k reviews doesn't completely break scaling
    const reviewFactor = Math.min(Math.log10(reviews + 1) / 4, 1.0);
    const popularityScore = (rating / 10) * 0.7 + reviewFactor * 0.3;

    // Show availability score: 1.0 if currently has active published shows, else 0.0
    const movieIdStr = (movie._id || movie.id || '').toString();
    const showScore = activeMovieIds.has(movieIdStr) ? 1.0 : 0.0;

    // Rating score (0 to 1)
    const ratingScore = rating / 10;

    // Recency score (decay over release date)
    let recencyScore = 0.5;
    if (movie.releaseDate) {
      const releaseTime = new Date(movie.releaseDate).getTime();
      const now = Date.now();
      const daysDiff = Math.abs(now - releaseTime) / (1000 * 60 * 60 * 24);
      // Exponential decay: full score if released today, 0.5 at 60 days
      recencyScore = Math.max(0, Math.exp(-daysDiff / 90));
    }

    // Composite weighted score
    const finalScore =
      weights.TEXT_RELEVANCE * textScore +
      weights.POPULARITY * popularityScore +
      weights.SHOW_AVAILABILITY * showScore +
      weights.RATING * ratingScore +
      weights.RECENCY * recencyScore;

    return Number(finalScore.toFixed(4));
  }

  /**
   * Sort array of movies using calculated ranking score with deterministic tie-breaking
   */
  static rankMovies(movies, { query = '', activeMovieIds = new Set(), weights = RankingWeights }) {
    if (!movies || movies.length === 0) {
      return [];
    }

    const scored = movies.map(movie => ({
      ...movie,
      _rankingScore: this.calculateMovieScore(movie, { query, activeMovieIds, weights })
    }));

    return scored.sort((a, b) => {
      if (b._rankingScore !== a._rankingScore) {
        return b._rankingScore - a._rankingScore;
      }
      // Tie breaker 1: newer release date first
      const dateA = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
      const dateB = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
      if (dateB !== dateA) {
        return dateB - dateA;
      }
      // Tie breaker 2: alphabetical deterministic sort
      return (a.title || '').localeCompare(b.title || '');
    });
  }
}

export default SearchRankingService;

