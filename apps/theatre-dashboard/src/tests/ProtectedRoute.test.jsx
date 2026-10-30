import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../components/layout/ProtectedRoute';
import { useAuthStore, Roles, Permissions } from '../store/auth.store';

describe('ProtectedRoute Guard Component', () => {
  beforeEach(() => {
    useAuthStore.getState().logout();
  });

  it('redirects unauthenticated users to /login', () => {
    render(
      <MemoryRouter initialEntries={['/revenue']}>
        <Routes>
          <Route path="/login" element={<div>LOGIN_PAGE</div>} />
          <Route
            path="/revenue"
            element={
              <ProtectedRoute>
                <div>FINANCIAL_DASHBOARD</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('LOGIN_PAGE')).toBeInTheDocument();
    expect(screen.queryByText('FINANCIAL_DASHBOARD')).not.toBeInTheDocument();
  });

  it('blocks access if user role is not allowed', () => {
    // Authenticate as THEATRE_STAFF
    useAuthStore.getState().setAuth(
      {
        id: 'staff_1',
        name: 'Desk Operator',
        role: Roles.THEATRE_STAFF,
        permissions: [Permissions.BOOKING_READ]
      },
      'staff_token'
    );

    render(
      <MemoryRouter initialEntries={['/revenue']}>
        <Routes>
          <Route
            path="/revenue"
            element={
              <ProtectedRoute allowedRoles={[Roles.THEATRE_OWNER]}>
                <div>SECRET_REVENUE_PAGE</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Access Restricted')).toBeInTheDocument();
    expect(screen.queryByText('SECRET_REVENUE_PAGE')).not.toBeInTheDocument();
  });

  it('renders children when user possesses required role and permission', () => {
    useAuthStore.getState().setAuth(
      {
        id: 'owner_1',
        name: 'Cinema Owner',
        role: Roles.THEATRE_OWNER,
        permissions: [Permissions.REPORT_READ]
      },
      'owner_token'
    );

    render(
      <MemoryRouter initialEntries={['/revenue']}>
        <Routes>
          <Route
            path="/revenue"
            element={
              <ProtectedRoute allowedRoles={[Roles.THEATRE_OWNER]} requiredPermission={Permissions.REPORT_READ}>
                <div>AUTHORIZED_REVENUE_PAGE</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('AUTHORIZED_REVENUE_PAGE')).toBeInTheDocument();
  });
});

