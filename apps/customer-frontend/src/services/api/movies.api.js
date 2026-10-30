import apiClient from './axios.client';

export const moviesApi = {
  /**
   * Fetches paginated catalog of movies with filter support
   * GET /api/v1/movies
   */
  async getMovies(params = {}) {
    const response = await apiClient.get('/movies', { params });
    return response.data;
  },

  /**
   * Fetches single movie by slug or ID
   * GET /api/v1/movies/:slug
   */
  async getMovieBySlug(slug) {
    const response = await apiClient.get(`/movies/${slug}`);
    return response.data;
  },

  /**
   * Fetches now-showing movies in theatres
   * GET /api/v1/movies/now-showing
   */
  async getNowShowing(params = {}) {
    const response = await apiClient.get('/movies/now-showing', { params });
    return response.data;
  },

  /**
   * Fetches upcoming movies
   * GET /api/v1/movies/upcoming
   */
  async getUpcoming(params = {}) {
    const response = await apiClient.get('/movies/upcoming', { params });
    return response.data;
  },

  /**
   * Fetches top trending movies
   * GET /api/v1/movies/trending
   */
  async getTrending(params = {}) {
    const response = await apiClient.get('/movies/trending', { params });
    return response.data;
  },

  /**
   * Fetches popular movies
   * GET /api/v1/movies/popular
   */
  async getPopular(params = {}) {
    const response = await apiClient.get('/movies/popular', { params });
    return response.data;
  },

  /**
   * Fetches similar movies
   * GET /api/v1/movies/:movieId/similar
   */
  async getSimilarMovies(movieId) {
    const response = await apiClient.get(`/movies/${movieId}/similar`);
    return response.data;
  },

  /**
   * Fetches all active genres
   * GET /api/v1/genres
   */
  async getGenres() {
    const response = await apiClient.get('/genres');
    return response.data;
  },

  /**
   * Fetches supported movie languages
   * GET /api/v1/languages
   */
  async getLanguages() {
    const response = await apiClient.get('/languages');
    return response.data;
  }
};

export default moviesApi;

