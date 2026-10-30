import apiClient from './axios.client';

export const authApi = {
  login: async (identifier, password) => {
    const response = await apiClient.post('/auth/login', { identifier, password });
    return response.data;
  },

  registerTheatreOwner: async (partnerData) => {
    const response = await apiClient.post('/auth/theatre-owner/register', partnerData);
    return response.data;
  },

  logout: async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (e) {
      console.warn('Logout API invocation failed', e);
    }
  },

  getProfile: async () => {
    const response = await apiClient.get('/users/me');
    return response.data?.data || response.data;
  },

  updateProfile: async (userData) => {
    const response = await apiClient.patch('/users/me', userData);
    return response.data?.data || response.data;
  },

  changePassword: async (currentPassword, newPassword) => {
    const response = await apiClient.post('/auth/change-password', {
      currentPassword,
      newPassword
    });
    return response.data;
  }
};

