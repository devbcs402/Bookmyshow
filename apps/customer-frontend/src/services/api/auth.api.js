import apiClient from './axios.client';

export const authApi = {
  /**
   * Registers a customer account
   * POST /api/v1/auth/register
   */
  async register(data) {
    const response = await apiClient.post('/auth/register', data);
    return response.data;
  },

  /**
   * Logs in customer with email or phone + password
   * POST /api/v1/auth/login
   */
  async login(credentials) {
    const response = await apiClient.post('/auth/login', credentials);
    return response.data;
  },

  /**
   * Explicitly rotates tokens via refresh cookie
   * POST /api/v1/auth/refresh
   */
  async refreshToken() {
    const response = await apiClient.post('/auth/refresh');
    return response.data;
  },

  /**
   * Ends current session
   * POST /api/v1/auth/logout
   */
  async logout() {
    try {
      await apiClient.post('/auth/logout');
    } catch (_e) {
      // Ignore network errors on logout to allow client reset
    }
  },

  /**
   * Sends OTP for verification
   * POST /api/v1/auth/otp/send
   */
  async sendOtp(payload) {
    const response = await apiClient.post('/auth/otp/send', payload);
    return response.data;
  },

  /**
   * Verifies OTP
   * POST /api/v1/auth/otp/verify
   */
  async verifyOtp(payload) {
    const response = await apiClient.post('/auth/otp/verify', payload);
    return response.data;
  },

  /**
   * Initiates forgot password email
   * POST /api/v1/auth/password/forgot
   */
  async forgotPassword(payload) {
    const response = await apiClient.post('/auth/password/forgot', payload);
    return response.data;
  },

  /**
   * Resets password using token
   * POST /api/v1/auth/password/reset
   */
  async resetPassword(payload) {
    const response = await apiClient.post('/auth/password/reset', payload);
    return response.data;
  },

  /**
   * Changes current password for logged-in user
   * POST /api/v1/auth/password/change
   */
  async changePassword(payload) {
    const response = await apiClient.post('/auth/password/change', payload);
    return response.data;
  }
};

export default authApi;

