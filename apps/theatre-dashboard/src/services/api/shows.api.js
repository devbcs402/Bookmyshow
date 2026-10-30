import apiClient from './axios.client';

export const showsApi = {
  getShows: async (params = {}) => {
    const response = await apiClient.get('/owner/shows', { params });
    return response.data?.data || response.data;
  },

  getShowById: async (showId) => {
    const response = await apiClient.get(`/owner/shows/${showId}`);
    return response.data?.data || response.data;
  },

  createShow: async (showData) => {
    const response = await apiClient.post('/owner/shows', showData);
    return response.data?.data || response.data;
  },

  updateShow: async (showId, showData) => {
    const response = await apiClient.patch(`/owner/shows/${showId}`, showData);
    return response.data?.data || response.data;
  },

  rescheduleShow: async (showId, rescheduleData) => {
    const response = await apiClient.patch(`/owner/shows/${showId}/reschedule`, rescheduleData);
    return response.data?.data || response.data;
  },

  publishShow: async (showId) => {
    const response = await apiClient.post(`/owner/shows/${showId}/publish`);
    return response.data?.data || response.data;
  },

  cancelShow: async (showId, cancelData = {}) => {
    const response = await apiClient.post(`/owner/shows/${showId}/cancel`, cancelData);
    return response.data?.data || response.data;
  }
};

