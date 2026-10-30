import apiClient from './axios.client';

export const adminShowsApi = {
  getAllShows: async (params = {}) => {
    const response = await apiClient.get('/owner/shows', { params });
    return response.data?.data || response.data;
  },

  getShowById: async (showId) => {
    const response = await apiClient.get(`/owner/shows/${showId}`);
    return response.data?.data || response.data;
  },

  publishShow: async (showId) => {
    const response = await apiClient.post(`/owner/shows/${showId}/publish`);
    return response.data?.data || response.data;
  },

  cancelShow: async (showId, reason) => {
    const response = await apiClient.post(`/owner/shows/${showId}/cancel`, { reason });
    return response.data?.data || response.data;
  },

  getShowPricing: async (showId) => {
    const response = await apiClient.get(`/owner/shows/${showId}/pricing`);
    return response.data?.data || response.data;
  }
};

