import SimilarMoviesService from '../../src/modules/discovery/services/similar-movies.service.js';

describe('SimilarMoviesService Unit Tests', () => {
  describe('calculateJaccardSimilarity', () => {
    it('should return 1.0 for identical sets', () => {
      const setA = ['action', 'thriller'];
      const setB = ['thriller', 'action'];
      const similarity = SimilarMoviesService.calculateJaccardSimilarity(setA, setB);
      expect(similarity).toBe(1.0);
    });

    it('should return 0.0 for completely disjoint sets', () => {
      const setA = ['action', 'comedy'];
      const setB = ['horror', 'drama'];
      const similarity = SimilarMoviesService.calculateJaccardSimilarity(setA, setB);
      expect(similarity).toBe(0.0);
    });

    it('should calculate accurate fraction for partial overlap', () => {
      // Intersection = ['action'] (1), Union = ['action', 'drama', 'comedy'] (3) => 1/3 = 0.333...
      const setA = ['action', 'drama'];
      const setB = ['action', 'comedy'];
      const similarity = SimilarMoviesService.calculateJaccardSimilarity(setA, setB);
      expect(similarity).toBeCloseTo(0.333, 2);
    });
  });

  describe('calculateSimilarityScore', () => {
    const sourceMovie = {
      genreSlugs: ['action', 'sci-fi'],
      languageIds: ['lang_en'],
      cast: [{ name: 'Tom Cruise' }, { name: 'Emily Blunt' }],
      crew: [{ role: 'DIRECTOR', name: 'Doug Liman' }]
    };

    const identicalCandidate = {
      genreSlugs: ['action', 'sci-fi'],
      languageIds: ['lang_en'],
      cast: [{ name: 'Tom Cruise' }, { name: 'Emily Blunt' }],
      crew: [{ role: 'DIRECTOR', name: 'Doug Liman' }]
    };

    const differentCandidate = {
      genreSlugs: ['romance', 'comedy'],
      languageIds: ['lang_fr'],
      cast: [{ name: 'Audrey Tautou' }],
      crew: [{ role: 'DIRECTOR', name: 'Jean-Pierre Jeunet' }]
    };

    it('should return 1.0 similarity for completely identical characteristics', () => {
      const score = SimilarMoviesService.calculateSimilarityScore(sourceMovie, identicalCandidate);
      expect(score).toBe(1.0);
    });

    it('should return 0.0 for candidate with zero common signals', () => {
      const score = SimilarMoviesService.calculateSimilarityScore(sourceMovie, differentCandidate);
      expect(score).toBe(0.0);
    });

    it('should give high score when candidate shares genres and director', () => {
      const sharedCandidate = {
        genreSlugs: ['action', 'sci-fi'],
        languageIds: ['lang_es'],
        cast: [{ name: 'Other Actor' }],
        crew: [{ role: 'DIRECTOR', name: 'Doug Liman' }]
      };
      const score = SimilarMoviesService.calculateSimilarityScore(sourceMovie, sharedCandidate);
      // 0.40 (genre) + 0.15 (director) = 0.55
      expect(score).toBeCloseTo(0.55, 2);
    });
  });
});

