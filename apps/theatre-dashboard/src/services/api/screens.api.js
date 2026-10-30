import apiClient from './axios.client';

export const screensApi = {
  getScreensByTheatre: async (theatreId, params = {}) => {
    const response = await apiClient.get(`/owner/theatres/${theatreId}/screens`, { params });
    return response.data?.data || response.data;
  },

  getScreenById: async (screenId) => {
    const response = await apiClient.get(`/owner/screens/${screenId}`);
    return response.data?.data || response.data;
  },

  createScreen: async (theatreId, screenData) => {
    const response = await apiClient.post(`/owner/theatres/${theatreId}/screens`, screenData);
    return response.data?.data || response.data;
  },

  updateScreen: async (screenId, screenData) => {
    const response = await apiClient.patch(`/owner/screens/${screenId}`, screenData);
    return response.data?.data || response.data;
  },

  updateScreenStatus: async (screenId, status) => {
    const response = await apiClient.patch(`/owner/screens/${screenId}/status`, { status });
    return response.data?.data || response.data;
  },

  deleteScreen: async (screenId) => {
    const response = await apiClient.delete(`/owner/screens/${screenId}`);
    return response.data?.data || response.data;
  }
};

