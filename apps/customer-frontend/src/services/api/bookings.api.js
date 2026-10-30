import apiClient from './axios.client';

export const bookingsApi = {
  /**
   * Atomically creates a pending booking from valid seat locks
   * POST /api/v1/bookings
   * @param {Object} payload { showId, seatIds }
   * @param {string} [idempotencyKey]
   */
  async createBooking(payload, idempotencyKey = null) {
    const headers = {};
    if (idempotencyKey) {
      headers['idempotency-key'] = idempotencyKey;
    }
    const response = await apiClient.post('/bookings', payload, { headers });
    return response.data;
  },

  /**
   * Retrieves authenticated customer's personal booking history
   * GET /api/v1/bookings/me
   * @param {Object} params { status, page, limit }
   */
  async getMyBookings(params = {}) {
    const response = await apiClient.get('/bookings/me', { params });
    return response.data;
  },

  /**
   * Retrieves full details, ticket QR code, and pricing breakdown for a booking
   * GET /api/v1/bookings/:bookingId
   * @param {string} bookingId
   */
  async getBookingById(bookingId) {
    const response = await apiClient.get(`/bookings/${bookingId}`);
    return response.data;
  },

  /**
   * Cancels an eligible booking according to platform business rules
   * POST /api/v1/bookings/:bookingId/cancel
   * @param {string} bookingId
   * @param {string} [reason]
   */
  async cancelBooking(bookingId, reason = 'Customer requested cancellation') {
    const response = await apiClient.post(`/bookings/${bookingId}/cancel`, { reason });
    return response.data;
  },

  /**
   * Retrieves payment transactions associated with a booking
   * GET /api/v1/bookings/:bookingId/payments
   * @param {string} bookingId
   */
  async getBookingPayments(bookingId) {
    const response = await apiClient.get(`/bookings/${bookingId}/payments`);
    return response.data;
  }
};

export default bookingsApi;

