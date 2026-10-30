import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore, Roles, Permissions } from '../store/auth.store';

describe('useAuthStore (RBAC & Session Management)', () => {
  beforeEach(() => {
    useAuthStore.getState().logout();
  });

  it('initializes with unauthenticated empty state', () => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
  });

  it('correctly sets authentication and permissions on login', () => {
    const mockUser = {
      id: 'usr_owner_1',
      name: 'Exhibitor Owner',
      role: Roles.THEATRE_OWNER,
      partnerId: 'partner_org_99',
      permissions: [Permissions.THEATRE_CREATE, Permissions.REPORT_READ, Permissions.SCREEN_MANAGE]
    };
    const mockToken = 'mock_jwt_access_token_123';

    useAuthStore.getState().setAuth(mockUser, mockToken);

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user.id).toBe('usr_owner_1');
    expect(state.hasRole(Roles.THEATRE_OWNER)).toBe(true);
    expect(state.hasRole(Roles.CUSTOMER)).toBe(false);
    expect(state.hasPermission(Permissions.REPORT_READ)).toBe(true);
    expect(state.hasPermission(Permissions.USER_DELETE)).toBe(false);
  });

  it('Super Admin bypasses all role and permission restrictions', () => {
    const mockAdmin = {
      id: 'admin_1',
      name: 'Super Admin',
      role: Roles.SUPER_ADMIN,
      permissions: []
    };
    useAuthStore.getState().setAuth(mockAdmin, 'token_admin');

    const state = useAuthStore.getState();
    expect(state.hasRole(Roles.THEATRE_OWNER)).toBe(true);
    expect(state.hasPermission(Permissions.THEATRE_DELETE)).toBe(true);
    expect(state.hasPermission('ANY_ARBITRARY_PERMISSION')).toBe(true);
  });

  it('clears state on logout', () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: Roles.THEATRE_STAFF }, 'tok');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    useAuthStore.getState().logout();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
  });
});

