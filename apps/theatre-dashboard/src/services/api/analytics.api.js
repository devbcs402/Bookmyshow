import apiClient from './axios.client';

export const analyticsApi = {
  getOverview: async (params = {}) => {
    const response = await apiClient.get('/owner/analytics/overview', { params });
    return response.data?.data || response.data;
  },

  getBookingsAnalytics: async (params = {}) => {
    const response = await apiClient.get('/owner/analytics/bookings', { params });
    return response.data?.data || response.data;
  },

  getRevenueAnalytics: async (params = {}) => {
    const response = await apiClient.get('/owner/analytics/revenue', { params });
    return response.data?.data || response.data;
  }
};

