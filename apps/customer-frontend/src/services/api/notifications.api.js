import apiClient from './axios.client';

export const notificationsApi = {
  /**
   * Retrieves paginated notifications for the customer
   * GET /api/v1/notifications
   */
  async getNotifications(params = {}) {
    const response = await apiClient.get('/notifications', { params });
    return response.data;
  },

  /**
   * Retrieves count of unread notifications
   * GET /api/v1/notifications/unread-count
   */
  async getUnreadCount() {
    const response = await apiClient.get('/notifications/unread-count');
    return response.data;
  },

  /**
   * Marks a specific notification as read
   * PATCH /api/v1/notifications/:id/read
   */
  async markAsRead(id) {
    const response = await apiClient.patch(`/notifications/${id}/read`);
    return response.data;
  },

  /**
   * Marks all customer notifications as read
   * PATCH /api/v1/notifications/read-all
   */
  async markAllAsRead() {
    const response = await apiClient.patch('/notifications/read-all');
    return response.data;
  },

  /**
   * Deletes/dismisses an in-app notification
   * DELETE /api/v1/notifications/:id
   */
  async deleteNotification(id) {
    const response = await apiClient.delete(`/notifications/${id}`);
    return response.data;
  },

  /**
   * Retrieves notification preferences
   * GET /api/v1/notifications/preferences
   */
  async getPreferences() {
    const response = await apiClient.get('/notifications/preferences');
    return response.data;
  },

  /**
   * Updates notification preferences
   * PATCH /api/v1/notifications/preferences
   */
  async updatePreferences(preferences) {
    const response = await apiClient.patch('/notifications/preferences', preferences);
    return response.data;
  }
};

export default notificationsApi;

