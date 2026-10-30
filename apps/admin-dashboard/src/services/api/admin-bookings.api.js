import apiClient from './axios.client';

export const adminBookingsApi = {
  getAllBookings: async (params = {}) => {
    const response = await apiClient.get('/owner/bookings', { params });
    return response.data?.data || response.data;
  },

  getBookingById: async (bookingId) => {
    const response = await apiClient.get(`/bookings/${bookingId}`);
    return response.data?.data || response.data;
  },

  cancelBooking: async (bookingId, reason = 'Administrative cancellation') => {
    const response = await apiClient.post(`/bookings/${bookingId}/cancel`, { reason });
    return response.data?.data || response.data;
  }
};

