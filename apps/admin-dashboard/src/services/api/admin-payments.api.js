import apiClient from './axios.client';

export const adminPaymentsApi = {
  getPaymentById: async (paymentId) => {
    const response = await apiClient.get(`/payments/${paymentId}`);
    return response.data?.data || response.data;
  },

  initiateRefund: async (paymentId, payload) => {
    const response = await apiClient.post(`/payments/${paymentId}/refunds`, payload);
    return response.data?.data || response.data;
  }
};

