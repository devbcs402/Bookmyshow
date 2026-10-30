import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore, Roles } from '../store/auth.store';

describe('Super Admin Auth Store & RBAC Validation', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
  });

  it('successfully authorizes an authentic SUPER_ADMIN account', () => {
    const superAdminUser = {
      _id: 'sa-001',
      name: 'Root Platform Admin',
      email: 'admin@bookmyshow.platform',
      role: Roles.SUPER_ADMIN,
    };
    const token = 'jwt-super-admin-access-token';

    useAuthStore.getState().setAuth(superAdminUser, token);

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user.role).toBe(Roles.SUPER_ADMIN);
    expect(state.accessToken).toBe(token);
    expect(state.isSuperAdmin()).toBe(true);
  });

  it('strictly rejects CUSTOMER role from logging into Super Admin console', () => {
    const customerUser = {
      _id: 'cust-999',
      name: 'John Customer',
      email: 'john@gmail.com',
      role: Roles.CUSTOMER,
    };
    const token = 'customer-jwt';

    expect(() => {
      useAuthStore.getState().setAuth(customerUser, token);
    }).toThrow('Access denied: User account is not authorized as a Super Administrator.');

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
  });

  it('strictly rejects THEATRE_OWNER role from logging into Super Admin console', () => {
    const ownerUser = {
      _id: 'owner-123',
      name: 'PVR Cinema Partner',
      email: 'pvr@cinema.com',
      role: Roles.THEATRE_OWNER,
    };
    const token = 'owner-jwt';

    expect(() => {
      useAuthStore.getState().setAuth(ownerUser, token);
    }).toThrow('Access denied: User account is not authorized as a Super Administrator.');

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
  });

  it('logout completely purges session memory and storage', async () => {
    const superAdminUser = {
      _id: 'sa-001',
      name: 'Root Platform Admin',
      email: 'admin@bookmyshow.platform',
      role: Roles.SUPER_ADMIN,
    };
    useAuthStore.getState().setAuth(superAdminUser, 'test-token');

    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    await useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(localStorage.getItem('super_admin_portal_auth')).toBeNull();
  });
});
