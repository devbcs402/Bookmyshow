import apiClient from './axios.client';

export const adminAnalyticsApi = {
  getOverview: async (params = {}) => {
    const response = await apiClient.get('/admin/analytics/overview', { params });
    return response.data?.data || response.data;
  },

  getBookings: async (params = {}) => {
    const response = await apiClient.get('/admin/analytics/bookings', { params });
    return response.data?.data || response.data;
  },

  getRevenue: async (params = {}) => {
    const response = await apiClient.get('/admin/analytics/revenue', { params });
    return response.data?.data || response.data;
  },

  getTopMovies: async (params = {}) => {
    const response = await apiClient.get('/admin/analytics/movies', { params });
    return response.data?.data || response.data;
  },

  getTopTheatres: async (params = {}) => {
    const response = await apiClient.get('/admin/analytics/theatres', { params });
    return response.data?.data || response.data;
  }
};

