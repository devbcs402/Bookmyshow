import apiClient from './axios.client';

export const adminScreensApi = {
  getAllScreens: async (params = {}) => {
    const response = await apiClient.get('/admin/screens', { params });
    return response.data?.data || response.data;
  },

  getScreenById: async (screenId) => {
    const response = await apiClient.get(`/admin/screens/${screenId}`);
    return response.data?.data || response.data;
  },

  getScreenLayout: async (screenId) => {
    const response = await apiClient.get(`/owner/screens/${screenId}/layout`);
    return response.data?.data || response.data;
  },

  getLayoutVersions: async (screenId) => {
    const response = await apiClient.get(`/owner/screens/${screenId}/layout/versions`);
    return response.data?.data || response.data;
  }
};

