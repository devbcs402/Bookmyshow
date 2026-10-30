import apiClient from './axios.client';

export const adminMoviesApi = {
  getAllMovies: async (params = {}) => {
    const response = await apiClient.get('/admin/movies', { params });
    return response.data?.data || response.data;
  },

  getMovieById: async (movieId) => {
    const response = await apiClient.get(`/admin/movies/${movieId}`);
    return response.data?.data || response.data;
  },

  createMovie: async (movieData) => {
    const response = await apiClient.post('/admin/movies', movieData);
    return response.data?.data || response.data;
  },

  updateMovie: async (movieId, movieData) => {
    const response = await apiClient.patch(`/admin/movies/${movieId}`, movieData);
    return response.data?.data || response.data;
  },

  deleteMovie: async (movieId) => {
    const response = await apiClient.delete(`/admin/movies/${movieId}`);
    return response.data?.data || response.data;
  },

  approveMovie: async (movieId) => {
    const response = await apiClient.patch(`/admin/movies/${movieId}/approve`);
    return response.data?.data || response.data;
  },

  rejectMovie: async (movieId, reason) => {
    const response = await apiClient.patch(`/admin/movies/${movieId}/reject`, { reason });
    return response.data?.data || response.data;
  }
};

