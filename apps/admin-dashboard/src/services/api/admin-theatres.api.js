import apiClient from './axios.client';

export const adminTheatresApi = {
  getAllTheatres: async (params = {}) => {
    const response = await apiClient.get('/admin/theatres', { params });
    return response.data?.data || response.data;
  },

  getTheatreById: async (theatreId) => {
    const response = await apiClient.get(`/admin/theatres/${theatreId}`);
    return response.data?.data || response.data;
  },

  approveTheatre: async (theatreId) => {
    const response = await apiClient.patch(`/admin/theatres/${theatreId}/approve`);
    return response.data?.data || response.data;
  },

  rejectTheatre: async (theatreId, reason) => {
    const response = await apiClient.patch(`/admin/theatres/${theatreId}/reject`, { reason });
    return response.data?.data || response.data;
  },

  suspendTheatre: async (theatreId) => {
    const response = await apiClient.patch(`/admin/theatres/${theatreId}/suspend`);
    return response.data?.data || response.data;
  },

  reactivateTheatre: async (theatreId) => {
    const response = await apiClient.patch(`/admin/theatres/${theatreId}/reactivate`);
    return response.data?.data || response.data;
  },

  updateTheatre: async (theatreId, payload) => {
    const response = await apiClient.patch(`/admin/theatres/${theatreId}`, payload);
    return response.data?.data || response.data;
  },

  getBranches: async (theatreId) => {
    const response = await apiClient.get(`/owner/theatres/${theatreId}/branches`);
    return response.data?.data || response.data;
  }
};

