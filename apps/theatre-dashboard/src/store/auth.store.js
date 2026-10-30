import { create } from 'zustand';

export const Roles = Object.freeze({
  CUSTOMER: 'CUSTOMER',
  THEATRE_OWNER: 'THEATRE_OWNER',
  THEATRE_MANAGER: 'THEATRE_MANAGER',
  THEATRE_STAFF: 'THEATRE_STAFF',
  SUPER_ADMIN: 'SUPER_ADMIN'
});

export const Permissions = Object.freeze({
  USER_READ: 'USER_READ',
  USER_UPDATE: 'USER_UPDATE',
  MOVIE_READ: 'MOVIE_READ',
  THEATRE_READ: 'THEATRE_READ',
  THEATRE_CREATE: 'THEATRE_CREATE',
  THEATRE_UPDATE: 'THEATRE_UPDATE',
  THEATRE_DELETE: 'THEATRE_DELETE',
  SCREEN_MANAGE: 'SCREEN_MANAGE',
  SHOW_READ: 'SHOW_READ',
  SHOW_CREATE: 'SHOW_CREATE',
  SHOW_UPDATE: 'SHOW_UPDATE',
  SHOW_DELETE: 'SHOW_DELETE',
  BOOKING_READ: 'BOOKING_READ',
  BOOKING_MANAGE: 'BOOKING_MANAGE',
  PAYMENT_READ: 'PAYMENT_READ',
  REPORT_READ: 'REPORT_READ',
  STAFF_MANAGE: 'STAFF_MANAGE'
});

const STORE_KEY = 'theatre_portal_auth';

const getInitialState = () => {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        user: parsed.user || null,
        accessToken: parsed.accessToken || null,
        isAuthenticated: !!parsed.accessToken
      };
    }
  } catch (e) {
    console.error('Failed to parse cached auth state', e);
  }
  return {
    user: null,
    accessToken: null,
    isAuthenticated: false
  };
};

export const useAuthStore = create((set, get) => ({
  ...getInitialState(),

  setAuth: (user, accessToken) => {
    localStorage.setItem(
      STORE_KEY,
      JSON.stringify({ user, accessToken })
    );
    set({ user, accessToken, isAuthenticated: !!accessToken });
  },

  setAccessToken: (accessToken) => {
    const current = get();
    localStorage.setItem(
      STORE_KEY,
      JSON.stringify({ user: current.user, accessToken })
    );
    set({ accessToken, isAuthenticated: !!accessToken });
  },

  setUser: (user) => {
    const current = get();
    localStorage.setItem(
      STORE_KEY,
      JSON.stringify({ user, accessToken: current.accessToken })
    );
    set({ user });
  },

  logout: () => {
    localStorage.removeItem(STORE_KEY);
    set({ user: null, accessToken: null, isAuthenticated: false });
  },

  hasRole: (...roles) => {
    const { user } = get();
    if (!user || !user.role) return false;
    if (user.role === Roles.SUPER_ADMIN) return true;
    return roles.includes(user.role);
  },

  hasPermission: (permission) => {
    const { user } = get();
    if (!user) return false;
    if (user.role === Roles.SUPER_ADMIN) return true;
    const permissions = user.permissions || [];
    return permissions.includes(permission);
  }
}));

