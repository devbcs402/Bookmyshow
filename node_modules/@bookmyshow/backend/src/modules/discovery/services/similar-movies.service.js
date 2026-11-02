import { Movie } from '../../movies/model/movie.model.js';
import { DiscoveryRepository } from '../repositories/discovery.repository.js';
import { DiscoveryCacheService } from './discovery-cache.service.js';
import { PublicVisibleStatuses } from '../../movies/movie.constants.js';
import {
  DiscoveryCacheKeys,
  DiscoveryTTLs,
  SimilarityWeights
} from '../constants/discovery.constants.js';
import { NotFoundError } from '../../../common/errors/index.js';
import { ErrorCodes } from '../../../common/constants/error-codes.js';

export class SimilarMoviesService {
  /**
   * Calculate Jaccard similarity coefficient between two sets
   */
  static calculateJaccardSimilarity(setA, setB) {
    if (!setA || !setB || setA.length === 0 || setB.length === 0) {
      return 0;
    }
    const set1 = new Set(setA.map(item => String(item).toLowerCase().trim()));
    const set2 = new Set(setB.map(item => String(item).toLowerCase().trim()));

    const intersection = [...set1].filter(x => set2.has(x)).length;
    const union = new Set([...set1, ...set2]).size;

    return union === 0 ? 0 : intersection / union;
  }

  /**
   * Calculate similarity score between source movie and candidate movie
   */
  static calculateSimilarityScore(source, candidate) {
    // 1. Genre similarity (40%)
    const genreScore = this.calculateJaccardSimilarity(
      source.genreSlugs || [],
      candidate.genreSlugs || []
    );

    // 2. Language similarity (25%)
    const sourceLangs = (source.languageIds || []).map(l => (l._id || l).toString());
    const candLangs = (candidate.languageIds || []).map(l => (l._id || l).toString());
    const langScore = this.calculateJaccardSimilarity(sourceLangs, candLangs);

    // 3. Cast overlap (20%)
    const sourceActors = (source.cast || []).map(c => c.name);
    const candActors = (candidate.cast || []).map(c => c.name);
    const castScore = this.calculateJaccardSimilarity(sourceActors, candActors);

    // 4. Director match (15%)
    const sourceDirectors = (source.crew || [])
      .filter(c => c.role === 'DIRECTOR')
      .map(c => (c.name || '').toLowerCase());
    const candDirectors = (candidate.crew || [])
      .filter(c => c.role === 'DIRECTOR')
      .map(c => (c.name || '').toLowerCase());
    const directorScore = this.calculateJaccardSimilarity(sourceDirectors, candDirectors);

    // Weighted composite similarity
    const score =
      SimilarityWeights.GENRE_OVERLAP * genreScore +
      SimilarityWeights.LANGUAGE_MATCH * langScore +
      SimilarityWeights.CAST_OVERLAP * castScore +
      SimilarityWeights.DIRECTOR_MATCH * directorScore;

    return Number(score.toFixed(4));
  }

  /**
   * Discover movies similar to the given movie ID
   */
  static async getSimilarMovies(movieId, { limit = 10 } = {}) {
    // 1. Check Redis cache
    const cacheKey = `${DiscoveryCacheKeys.SIMILAR_PREFIX}${movieId}:${limit}`;
    const cached = await DiscoveryCacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    // 2. Fetch target movie
    const targetMovie = await Movie.findOne({
      _id: movieId,
      status: { $in: PublicVisibleStatuses },
      isDeleted: false
    })
      .populate('genreIds', 'name slug')
      .populate('languageIds', 'name code')
      .lean();

    if (!targetMovie) {
      throw new NotFoundError(
        'Movie not found or is currently not publicly available',
        ErrorCodes.MOVIE_NOT_FOUND
      );
    }

    // 3. Find candidates sharing genres or languages
    const candidates = await DiscoveryRepository.findSimilarCandidates({
      movieId: targetMovie._id,
      genreSlugs: targetMovie.genreSlugs || [],
      languageIds: targetMovie.languageIds || [],
      limit: 50
    });

    // 4. Score and sort candidates
    const scoredCandidates = candidates
      .map(candidate => ({
        ...candidate,
        similarityScore: this.calculateSimilarityScore(targetMovie, candidate)
      }))
      .filter(c => c.similarityScore > 0)
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, limit);

    // 5. Cache result in Redis
    await DiscoveryCacheService.set(cacheKey, scoredCandidates, DiscoveryTTLs.SIMILAR_SECONDS);

    return scoredCandidates;
  }
}

export default SimilarMoviesService;
