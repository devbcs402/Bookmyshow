import SearchRankingService from '../../src/modules/discovery/services/search-ranking.service.js';

describe('SearchRankingService Unit Tests', () => {
  const movieExact = {
    _id: '65f1a2b3c4d5e6f7a8b9c001',
    title: 'Inception',
    avgRating: 8.8,
    totalReviews: 2000,
    releaseDate: new Date('2026-01-01')
  };

  const moviePrefix = {
    _id: '65f1a2b3c4d5e6f7a8b9c002',
    title: 'Inception: The Beginning',
    avgRating: 7.5,
    totalReviews: 500,
    releaseDate: new Date('2026-02-01')
  };

  const movieCastMatch = {
    _id: '65f1a2b3c4d5e6f7a8b9c003',
    title: 'Shutter Island',
    cast: [{ name: 'Leonardo DiCaprio' }],
    avgRating: 8.2,
    totalReviews: 1200,
    releaseDate: new Date('2026-03-01')
  };

  describe('calculateMovieScore', () => {
    it('should award exact title match higher score than prefix match', () => {
      const scoreExact = SearchRankingService.calculateMovieScore(movieExact, {
        query: 'Inception',
        activeMovieIds: new Set()
      });
      const scorePrefix = SearchRankingService.calculateMovieScore(moviePrefix, {
        query: 'Inception',
        activeMovieIds: new Set()
      });

      expect(scoreExact).toBeGreaterThan(scorePrefix);
    });

    it('should grant relevance score for actor/cast matches', () => {
      const score = SearchRankingService.calculateMovieScore(movieCastMatch, {
        query: 'Leonardo',
        activeMovieIds: new Set()
      });

      expect(score).toBeGreaterThan(0.3);
    });

    it('should boost score when movie has active published shows', () => {
      const activeSet = new Set([movieExact._id]);
      const scoreWithShows = SearchRankingService.calculateMovieScore(movieExact, {
        query: 'Inception',
        activeMovieIds: activeSet
      });
      const scoreWithoutShows = SearchRankingService.calculateMovieScore(movieExact, {
        query: 'Inception',
        activeMovieIds: new Set()
      });

      expect(scoreWithShows).toBeGreaterThan(scoreWithoutShows);
    });
  });

  describe('rankMovies', () => {
    it('should rank movies in descending order of calculated score', () => {
      const movies = [movieCastMatch, moviePrefix, movieExact];
      const ranked = SearchRankingService.rankMovies(movies, {
        query: 'Inception',
        activeMovieIds: new Set([movieExact._id])
      });

      expect(ranked[0]._id).toBe(movieExact._id);
      expect(ranked[0]._rankingScore).toBeGreaterThanOrEqual(ranked[1]._rankingScore);
    });

    it('should use deterministic tie-breaking (newer release date first)', () => {
      const movieA = {
        _id: '65f1a2b3c4d5e6f7a8b9c00a',
        title: 'Movie Alpha',
        avgRating: 8.0,
        totalReviews: 100,
        releaseDate: new Date('2026-05-01')
      };
      const movieB = {
        _id: '65f1a2b3c4d5e6f7a8b9c00b',
        title: 'Movie Beta',
        avgRating: 8.0,
        totalReviews: 100,
        releaseDate: new Date('2026-06-01') // Newer
      };

      const ranked = SearchRankingService.rankMovies([movieA, movieB], {
        query: '',
        activeMovieIds: new Set()
      });

      expect(ranked[0]._id).toBe(movieB._id);
    });
  });
});
