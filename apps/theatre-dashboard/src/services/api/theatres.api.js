import apiClient from './axios.client';

export const theatresApi = {
  getMyTheatres: async (params = {}) => {
    const response = await apiClient.get('/owner/theatres', { params });
    return response.data?.data || response.data;
  },

  getTheatreById: async (theatreId) => {
    const response = await apiClient.get(`/owner/theatres/${theatreId}`);
    return response.data?.data || response.data;
  },

  registerTheatre: async (theatreData) => {
    const response = await apiClient.post('/owner/theatres', theatreData);
    return response.data?.data || response.data;
  },

  updateTheatre: async (theatreId, theatreData) => {
    const response = await apiClient.patch(`/owner/theatres/${theatreId}`, theatreData);
    return response.data?.data || response.data;
  },

  updateOperations: async (theatreId, operationsData) => {
    const response = await apiClient.patch(`/owner/theatres/${theatreId}/operations`, operationsData);
    return response.data?.data || response.data;
  },

  updateMedia: async (theatreId, mediaData) => {
    const response = await apiClient.patch(`/owner/theatres/${theatreId}/media`, mediaData);
    return response.data?.data || response.data;
  },

  deleteTheatre: async (theatreId) => {
    const response = await apiClient.delete(`/owner/theatres/${theatreId}`);
    return response.data?.data || response.data;
  }
};

