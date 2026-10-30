import { create } from 'zustand';
import { authApi } from '../services/api/auth.api';

export const Roles = Object.freeze({
  CUSTOMER: 'CUSTOMER',
  THEATRE_OWNER: 'THEATRE_OWNER',
  THEATRE_MANAGER: 'THEATRE_MANAGER',
  THEATRE_STAFF: 'THEATRE_STAFF',
  SUPER_ADMIN: 'SUPER_ADMIN'
});

const STORE_KEY = 'super_admin_portal_auth';

const getInitialState = () => {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.user?.role === Roles.SUPER_ADMIN) {
        return {
          user: parsed.user,
          accessToken: parsed.accessToken,
          isAuthenticated: !!parsed.accessToken,
          isLoading: false
        };
      }
    }
  } catch (e) {
    console.error('Failed to parse cached admin auth state', e);
  }
  return {
    user: null,
    accessToken: null,
    isAuthenticated: false,
    isLoading: false
  };
};

export const useAuthStore = create((set, get) => ({
  ...getInitialState(),

  initializeAuth: async () => {
    const { accessToken, user } = get();
    if (!accessToken || !user) {
      set({ isLoading: false, isAuthenticated: false });
      return;
    }
    // Access token already in memory – session is valid until token expires
    set({ isLoading: false });
  },

  login: async (identifier, password) => {
    const data = await authApi.login({ identifier, password });
    const { user, accessToken } = data;
    if (user.role !== Roles.SUPER_ADMIN) {
      throw new Error('Access denied: This console is restricted to Super Administrators.');
    }
    localStorage.setItem(STORE_KEY, JSON.stringify({ user, accessToken }));
    set({ user, accessToken, isAuthenticated: true, isLoading: false });
    return data;
  },

  setAuth: (user, accessToken) => {
    if (user.role !== Roles.SUPER_ADMIN) {
      throw new Error('Access denied: User account is not authorized as a Super Administrator.');
    }
    localStorage.setItem(STORE_KEY, JSON.stringify({ user, accessToken }));
    set({ user, accessToken, isAuthenticated: !!accessToken, isLoading: false });
  },

  setAccessToken: (accessToken) => {
    const current = get();
    localStorage.setItem(STORE_KEY, JSON.stringify({ user: current.user, accessToken }));
    set({ accessToken, isAuthenticated: !!accessToken });
  },

  setUser: (user) => {
    const current = get();
    localStorage.setItem(STORE_KEY, JSON.stringify({ user, accessToken: current.accessToken }));
    set({ user });
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch (_) {
      // swallow – always clear local state
    }
    localStorage.removeItem(STORE_KEY);
    set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false });
  },

  isSuperAdmin: () => {
    const { user } = get();
    return user?.role === Roles.SUPER_ADMIN;
  }
}));
