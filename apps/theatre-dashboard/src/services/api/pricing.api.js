import apiClient from './axios.client';

export const pricingApi = {
  getShowPricing: async (showId) => {
    const response = await apiClient.get(`/owner/shows/${showId}/pricing`);
    return response.data?.data || response.data;
  },

  setShowPricing: async (showId, pricingPayload) => {
    const response = await apiClient.put(`/owner/shows/${showId}/pricing`, pricingPayload);
    return response.data?.data || response.data;
  },

  updateCategoryPrice: async (showId, categoryCode, pricePayload) => {
    const response = await apiClient.patch(`/owner/shows/${showId}/pricing/${categoryCode}`, pricePayload);
    return response.data?.data || response.data;
  }
};

