import apiClient from './axios.client';

export const branchesApi = {
  getBranchesByTheatre: async (theatreId) => {
    const response = await apiClient.get(`/owner/theatres/${theatreId}/branches`);
    return response.data?.data || response.data;
  },

  getBranchById: async (branchId) => {
    const response = await apiClient.get(`/owner/branches/${branchId}`);
    return response.data?.data || response.data;
  },

  createBranch: async (theatreId, branchData) => {
    const response = await apiClient.post(`/owner/theatres/${theatreId}/branches`, branchData);
    return response.data?.data || response.data;
  },

  updateBranch: async (branchId, branchData) => {
    const response = await apiClient.patch(`/owner/branches/${branchId}`, branchData);
    return response.data?.data || response.data;
  },

  toggleBranchStatus: async (branchId, status) => {
    const response = await apiClient.patch(`/owner/branches/${branchId}/status`, { status });
    return response.data?.data || response.data;
  },

  deleteBranch: async (branchId) => {
    const response = await apiClient.delete(`/owner/branches/${branchId}`);
    return response.data?.data || response.data;
  }
};

