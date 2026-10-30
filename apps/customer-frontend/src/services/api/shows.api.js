import apiClient from './axios.client';

export const showsApi = {
  /**
   * Searches public shows with query parameters
   * GET /api/v1/shows
   * @param {Object} params { cityId, movieId, theatreId, date, page, limit }
   */
  async getShows(params = {}) {
    const response = await apiClient.get('/shows', { params });
    return response.data;
  },

  /**
   * Fetches single show details
   * GET /api/v1/shows/:showId
   */
  async getShowById(showId) {
    const response = await apiClient.get(`/shows/${showId}`);
    return response.data;
  },

  /**
   * Fetches showtimes for a specific movie
   * GET /api/v1/movies/:movieId/shows
   */
  async getMovieShows(movieId, params = {}) {
    const response = await apiClient.get(`/movies/${movieId}/shows`, { params });
    return response.data;
  },

  /**
   * Fetches showtimes at a specific theatre
   * GET /api/v1/theatres/:theatreId/shows
   */
  async getTheatreShows(theatreId, params = {}) {
    const response = await apiClient.get(`/theatres/${theatreId}/shows`, { params });
    return response.data;
  },

  /**
   * Retrieves complete seating grid layout, categories, pricing, and real-time availability
   * GET /api/v1/shows/:showId/seats
   */
  async getShowSeats(showId) {
    const response = await apiClient.get(`/shows/${showId}/seats`);
    return response.data;
  }
};

export default showsApi;

