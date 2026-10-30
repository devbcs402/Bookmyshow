import {
  movieSearchQueryValidation,
  movieFilterQueryValidation,
  theatreSearchQueryValidation,
  showSearchQueryValidation,
  searchSuggestionsQueryValidation
} from '../../src/modules/discovery/validators/discovery.validation.js';

describe('Discovery Validation Unit Tests', () => {
  describe('Movie Search Query Validation', () => {
    it('should pass with valid search query and default options', () => {
      const result = movieSearchQueryValidation.safeParse({ q: 'Oppenheimer' });
      expect(result.success).toBe(true);
      expect(result.data.q).toBe('Oppenheimer');
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
      expect(result.data.sortBy).toBe('relevance');
    });

    it('should reject search query exceeding 100 characters', () => {
      const longQuery = 'a'.repeat(101);
      const result = movieSearchQueryValidation.safeParse({ q: longQuery });
      expect(result.success).toBe(false);
      expect(result.error.errors[0].message).toContain('cannot exceed 100 characters');
    });

    it('should allow valid sorting fields and orders', () => {
      const result = movieSearchQueryValidation.safeParse({
        q: 'Dune',
        sortBy: 'releaseDate',
        sortOrder: 'asc'
      });
      expect(result.success).toBe(true);
      expect(result.data.sortBy).toBe('releaseDate');
      expect(result.data.sortOrder).toBe('asc');
    });

    it('should reject invalid sorting field', () => {
      const result = movieSearchQueryValidation.safeParse({
        q: 'Dune',
        sortBy: 'unsupportedField'
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Movie Filter Query Validation', () => {
    it('should validate multi-criteria filters', () => {
      const result = movieFilterQueryValidation.safeParse({
        genre: 'action',
        language: 'gujarati',
        releaseYear: 2026,
        certification: 'UA',
        status: 'NOW_SHOWING',
        durationMin: 90,
        durationMax: 180,
        page: 2,
        limit: 15
      });
      expect(result.success).toBe(true);
      expect(result.data.genre).toBe('action');
      expect(result.data.releaseYear).toBe(2026);
      expect(result.data.status).toBe('NOW_SHOWING');
    });

    it('should reject non-public movie status in filter', () => {
      const result = movieFilterQueryValidation.safeParse({
        status: 'DRAFT'
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Theatre Search Query Validation', () => {
    it('should accept valid geographical coordinates', () => {
      const result = theatreSearchQueryValidation.safeParse({
        latitude: 22.3039,
        longitude: 70.8022,
        radiusKm: 25
      });
      expect(result.success).toBe(true);
      expect(result.data.latitude).toBe(22.3039);
      expect(result.data.longitude).toBe(70.8022);
    });

    it('should reject out-of-range latitude (> 90)', () => {
      const result = theatreSearchQueryValidation.safeParse({
        latitude: 95.0,
        longitude: 70.8
      });
      expect(result.success).toBe(false);
    });

    it('should validate 6-digit Indian pincode', () => {
      const valid = theatreSearchQueryValidation.safeParse({ pincode: '360001' });
      expect(valid.success).toBe(true);

      const invalid = theatreSearchQueryValidation.safeParse({ pincode: '3600' });
      expect(invalid.success).toBe(false);
    });
  });

  describe('Show Search Query Validation', () => {
    it('should validate YYYY-MM-DD date format', () => {
      const valid = showSearchQueryValidation.safeParse({ date: '2026-11-15' });
      expect(valid.success).toBe(true);

      const invalid = showSearchQueryValidation.safeParse({ date: '15-11-2026' });
      expect(invalid.success).toBe(false);
    });
  });

  describe('Search Suggestions Query Validation', () => {
    it('should require non-empty query parameter q', () => {
      const empty = searchSuggestionsQueryValidation.safeParse({ q: '' });
      expect(empty.success).toBe(false);

      const valid = searchSuggestionsQueryValidation.safeParse({ q: 'dune' });
      expect(valid.success).toBe(true);
    });

    it('should reject suggestion queries exceeding 50 characters', () => {
      const result = searchSuggestionsQueryValidation.safeParse({ q: 'x'.repeat(51) });
      expect(result.success).toBe(false);
    });
  });
});

