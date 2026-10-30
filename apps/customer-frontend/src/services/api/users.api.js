import apiClient from './axios.client';

export const usersApi = {
  /**
   * Retrieves profile of authenticated customer
   * GET /api/v1/users/me
   */
  async getProfile() {
    const response = await apiClient.get('/users/me');
    return response.data;
  },

  /**
   * Updates profile information (name, phone, preferences)
   * PATCH /api/v1/users/me
   */
  async updateProfile(data) {
    const response = await apiClient.patch('/users/me', data);
    return response.data;
  },

  /**
   * Retrieves customer's active login sessions
   * GET /api/v1/users/me/sessions
   */
  async getSessions() {
    const response = await apiClient.get('/users/me/sessions');
    return response.data;
  },

  /**
   * Revokes a specific session
   * DELETE /api/v1/users/me/sessions/:sessionId
   */
  async revokeSession(sessionId) {
    const response = await apiClient.delete(`/users/me/sessions/${sessionId}`);
    return response.data;
  },

  /**
   * Deactivates customer account
   * DELETE /api/v1/users/me
   */
  async deactivateAccount() {
    const response = await apiClient.delete('/users/me');
    return response.data;
  }
};

export default usersApi;

