import apiClient from './axios.client';

export const staffApi = {
  getTheatreStaff: async (theatreId) => {
    const response = await apiClient.get(`/owner/theatres/${theatreId}/staff`);
    return response.data?.data || response.data;
  },

  assignStaff: async (theatreId, staffData) => {
    const response = await apiClient.post(`/owner/theatres/${theatreId}/staff`, staffData);
    return response.data?.data || response.data;
  },

  removeStaff: async (theatreId, userId) => {
    const response = await apiClient.delete(`/owner/theatres/${theatreId}/staff/${userId}`);
    return response.data?.data || response.data;
  }
};

