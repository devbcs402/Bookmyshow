import apiClient from './axios.client';

export const healthApi = {
  getSystemHealth: async () => {
    const response = await apiClient.get('/health');
    return response.data?.data || response.data;
  },

  // alias used by Header.jsx
  getLive: async () => {
    const response = await apiClient.get('/health/live');
    return response.data;
  },

  getLiveness: async () => {
    const response = await apiClient.get('/health/live');
    return response.data;
  },

  getReadiness: async () => {
    const response = await apiClient.get('/health/ready');
    return response.data;
  },

  getMetrics: async () => {
    const response = await apiClient.get('/health/metrics');
    return response.data?.data || response.data;
  }
};
