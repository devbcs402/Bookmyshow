import apiClient from './axios.client';

export const discoveryApi = {
  /**
   * Fetches personalized movie recommendations
   * GET /api/v1/recommendations
   */
  async getRecommendations(params = {}) {
    const response = await apiClient.get('/recommendations', { params });
    return response.data;
  },

  /**
   * Fetches debounced search autocomplete suggestions
   * GET /api/v1/search/suggestions?q=...
   */
  async getSearchSuggestions(query) {
    if (!query || query.trim().length === 0) return { data: [] };
    const response = await apiClient.get('/search/suggestions', {
      params: { q: query.trim() }
    });
    return response.data;
  },

  /**
   * Multi-facet search across movies
   * GET /api/v1/movies/search?q=...
   */
  async searchMovies(params = {}) {
    const response = await apiClient.get('/movies/search', { params });
    return response.data;
  },

  /**
   * Geolocation-assisted city/theatre discovery
   * GET /api/v1/discovery/location
   */
  async getLocationDiscovery(params = {}) {
    const response = await apiClient.get('/discovery/location', { params });
    return response.data;
  },

  /**
   * Fetches user's recently viewed movies from backend
   * GET /api/v1/users/me/recently-viewed
   */
  async getRecentlyViewed() {
    const response = await apiClient.get('/users/me/recently-viewed');
    return response.data;
  },

  /**
   * Tracks customer movie impression
   * POST /api/v1/users/me/recently-viewed/:movieId
   */
  async trackMovieView(movieId) {
    try {
      const response = await apiClient.post(`/users/me/recently-viewed/${movieId}`);
      return response.data;
    } catch (_err) {
      // Non-blocking tracking
      return null;
    }
  }
};

export default discoveryApi;

