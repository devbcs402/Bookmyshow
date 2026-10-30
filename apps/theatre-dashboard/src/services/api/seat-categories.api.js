import apiClient from './axios.client';

export const seatCategoriesApi = {
  getCategories: async () => {
    const response = await apiClient.get('/owner/seat-categories');
    return response.data?.data || response.data;
  },

  getCategoryById: async (id) => {
    const response = await apiClient.get(`/owner/seat-categories/${id}`);
    return response.data?.data || response.data;
  },

  createCategory: async (categoryData) => {
    const response = await apiClient.post('/owner/seat-categories', categoryData);
    return response.data?.data || response.data;
  },

  updateCategory: async (id, categoryData) => {
    const response = await apiClient.patch(`/owner/seat-categories/${id}`, categoryData);
    return response.data?.data || response.data;
  },

  deleteCategory: async (id) => {
    const response = await apiClient.delete(`/owner/seat-categories/${id}`);
    return response.data?.data || response.data;
  }
};

