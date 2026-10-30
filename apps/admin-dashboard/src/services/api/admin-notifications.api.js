import apiClient from './axios.client';

export const adminNotificationsApi = {
  broadcastAnnouncement: async (announcementData) => {
    const response = await apiClient.post('/admin/notifications/broadcast', announcementData);
    return response.data?.data || response.data;
  },

  getStats: async () => {
    const response = await apiClient.get('/admin/notifications/stats');
    return response.data?.data || response.data;
  },

  getAllNotifications: async (params = {}) => {
    const response = await apiClient.get('/admin/notifications', { params });
    return response.data?.data || response.data;
  },

  getNotificationById: async (id) => {
    const response = await apiClient.get(`/admin/notifications/${id}`);
    return response.data?.data || response.data;
  }
};

