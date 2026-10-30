import apiClient from './axios.client';

export const seatLayoutsApi = {
  getLayout: async (screenId) => {
    const response = await apiClient.get(`/owner/screens/${screenId}/layout`);
    return response.data?.data || response.data;
  },

  saveLayoutDraft: async (screenId, layoutPayload) => {
    const response = await apiClient.post(`/owner/screens/${screenId}/layout`, layoutPayload);
    return response.data?.data || response.data;
  },

  validateLayout: async (screenId, layoutPayload) => {
    const response = await apiClient.post(`/owner/screens/${screenId}/layout/validate`, layoutPayload);
    return response.data?.data || response.data;
  },

  generateBulkSeats: async (screenId, generationPayload) => {
    const response = await apiClient.post(`/owner/screens/${screenId}/layout/generate`, generationPayload);
    return response.data?.data || response.data;
  },

  previewLayout: async (screenId) => {
    const response = await apiClient.get(`/owner/screens/${screenId}/layout/preview`);
    return response.data?.data || response.data;
  },

  publishLayout: async (screenId) => {
    const response = await apiClient.post(`/owner/screens/${screenId}/layout/publish`);
    return response.data?.data || response.data;
  },

  getLayoutVersions: async (screenId) => {
    const response = await apiClient.get(`/owner/screens/${screenId}/layout/versions`);
    return response.data?.data || response.data;
  },

  getLayoutByVersion: async (screenId, version) => {
    const response = await apiClient.get(`/owner/screens/${screenId}/layout/versions/${version}`);
    return response.data?.data || response.data;
  }
};

