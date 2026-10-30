import apiClient from './axios.client';

export const bookingsApi = {
  getPartnerBookings: async (params = {}) => {
    const response = await apiClient.get('/owner/bookings', { params });
    return response.data?.data || response.data;
  },

  getBookingById: async (bookingId) => {
    const response = await apiClient.get(`/bookings/${bookingId}`);
    return response.data?.data || response.data;
  }
};

