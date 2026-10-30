import { create } from 'zustand';
import { STORAGE_KEYS } from '../constants';
import authApi from '../services/api/auth.api';
import usersApi from '../services/api/users.api';
import socketService from '../services/socket/socket.client';

export const useAuthStore = create((set, get) => ({
  user: null,
  accessToken: localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN) || null,
  isAuthenticated: !!localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN),
  isLoading: false,
  error: null,

  initAuth: async () => {
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (!token) {
      set({ user: null, isAuthenticated: false, isLoading: false });
      return;
    }

    try {
      set({ isLoading: true });
      const res = await usersApi.getProfile();
      if (res?.data) {
        set({ user: res.data, isAuthenticated: true, error: null });
        socketService.updateAuth(token);
      }
    } catch (_err) {
      // Token might be expired or invalid
      set({ user: null, accessToken: null, isAuthenticated: false });
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER_DATA);
    } finally {
      set({ isLoading: false });
    }
  },

  login: async credentials => {
    set({ isLoading: true, error: null });
    try {
      const res = await authApi.login(credentials);
      const { user, accessToken } = res.data;

      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
      localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));

      set({
        user,
        accessToken,
        isAuthenticated: true,
        isLoading: false,
        error: null
      });

      socketService.updateAuth(accessToken);
      return { success: true, user };
    } catch (err) {
      const message = err.message || 'Login failed. Please check your credentials.';
      set({ isLoading: false, error: message });
      return { success: false, error: message };
    }
  },

  register: async data => {
    set({ isLoading: true, error: null });
    try {
      const res = await authApi.register(data);
      const { user, accessToken } = res.data;

      if (accessToken) {
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
        localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
        set({
          user,
          accessToken,
          isAuthenticated: true,
          isLoading: false,
          error: null
        });
        socketService.updateAuth(accessToken);
      } else {
        set({ isLoading: false });
      }

      return { success: true, data: res.data };
    } catch (err) {
      const message = err.message || 'Registration failed.';
      set({ isLoading: false, error: message });
      return { success: false, error: message };
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch (_e) {}

    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER_DATA);

    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      error: null
    });

    socketService.updateAuth(null);
  },

  updateUserProfile: updatedUser => {
    set(state => ({
      user: { ...state.user, ...updatedUser }
    }));
    localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(get().user));
  }
}));

export default useAuthStore;

