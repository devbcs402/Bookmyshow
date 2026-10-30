import apiClient from './axios.client';

export const moviesApi = {
  getApprovedMovies: async (params = {}) => {
    const response = await apiClient.get('/movies', { params });
    return response.data?.data || response.data;
  },

  getMovieById: async (movieId) => {
    const response = await apiClient.get(`/movies/${movieId}`);
    return response.data?.data || response.data;
  }
};

