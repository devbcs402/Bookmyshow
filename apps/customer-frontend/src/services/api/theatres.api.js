import apiClient from './axios.client';

export const theatresApi = {
  /**
   * Fetches active cities
   * GET /api/v1/cities
   */
  async getCities() {
    const response = await apiClient.get('/cities');
    return response.data;
  },

  /**
   * Fetches active public theatres (filter by city, query)
   * GET /api/v1/theatres
   */
  async getTheatres(params = {}) {
    const response = await apiClient.get('/theatres', { params });
    return response.data;
  },

  /**
   * Fetches single theatre by ID
   * GET /api/v1/theatres/id/:theatreId
   */
  async getTheatreById(theatreId) {
    const response = await apiClient.get(`/theatres/id/${theatreId}`);
    return response.data;
  },

  /**
   * Fetches single theatre by slug
   * GET /api/v1/theatres/:slug
   */
  async getTheatreBySlug(slug) {
    const response = await apiClient.get(`/theatres/${slug}`);
    return response.data;
  },

  /**
   * Searches theatres by keyword or location
   * GET /api/v1/theatres/search
   */
  async searchTheatres(params = {}) {
    const response = await apiClient.get('/theatres/search', { params });
    return response.data;
  }
};

export default theatresApi;

