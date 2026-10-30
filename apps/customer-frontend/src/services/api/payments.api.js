import apiClient from './axios.client';

export const paymentsApi = {
  /**
   * Generates a Razorpay Gateway Order for a pending booking
   * POST /api/v1/payments/create-order
   * @param {string} bookingId
   * @param {string} [idempotencyKey]
   */
  async createPaymentOrder(bookingId, idempotencyKey = null) {
    const headers = {};
    if (idempotencyKey) {
      headers['idempotency-key'] = idempotencyKey;
    }
    const response = await apiClient.post(
      '/payments/create-order',
      { bookingId },
      { headers }
    );
    return response.data;
  },

  /**
   * Submits Razorpay checkout HMAC signature to backend for cryptographic verification
   * POST /api/v1/payments/verify
   * @param {Object} verificationData { razorpay_order_id, razorpay_payment_id, razorpay_signature }
   */
  async verifyPayment(verificationData) {
    const response = await apiClient.post('/payments/verify', verificationData);
    return response.data;
  },

  /**
   * Retrieves transaction details for a payment record
   * GET /api/v1/payments/:paymentId
   * @param {string} paymentId
   */
  async getPaymentDetails(paymentId) {
    const response = await apiClient.get(`/payments/${paymentId}`);
    return response.data;
  }
};

export default paymentsApi;

