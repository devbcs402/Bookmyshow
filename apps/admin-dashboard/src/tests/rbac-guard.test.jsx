import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../components/layout/ProtectedRoute';
import { useAuthStore, Roles } from '../store/auth.store';

describe('ProtectedRoute RBAC Guard', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
  });

  it('redirects unauthenticated users to /login', () => {
    render(
      <MemoryRouter initialEntries={['/admin-console']}>
        <Routes>
          <Route
            path="/admin-console"
            element={
              <ProtectedRoute>
                <div>Restricted Super Admin Area</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>Admin Login Screen</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Admin Login Screen')).toBeInTheDocument();
    expect(screen.queryByText('Restricted Super Admin Area')).not.toBeInTheDocument();
  });

  it('redirects non-SUPER_ADMIN users to /unauthorized', () => {
    useAuthStore.setState({
      user: { _id: 'cust-1', role: Roles.CUSTOMER, name: 'Normal User' },
      accessToken: 'valid-customer-jwt',
      isAuthenticated: true,
      isLoading: false,
    });

    render(
      <MemoryRouter initialEntries={['/admin-console']}>
        <Routes>
          <Route
            path="/admin-console"
            element={
              <ProtectedRoute>
                <div>Restricted Super Admin Area</div>
              </ProtectedRoute>
            }
          />
          <Route path="/unauthorized" element={<div>403 Unauthorized Platform Screen</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('403 Unauthorized Platform Screen')).toBeInTheDocument();
    expect(screen.queryByText('Restricted Super Admin Area')).not.toBeInTheDocument();
  });

  it('renders children smoothly for authorized SUPER_ADMIN users', () => {
    useAuthStore.setState({
      user: { _id: 'sa-1', role: Roles.SUPER_ADMIN, name: 'Root Admin' },
      accessToken: 'valid-super-admin-jwt',
      isAuthenticated: true,
      isLoading: false,
    });

    render(
      <MemoryRouter initialEntries={['/admin-console']}>
        <Routes>
          <Route
            path="/admin-console"
            element={
              <ProtectedRoute>
                <div>Restricted Super Admin Area</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Restricted Super Admin Area')).toBeInTheDocument();
  });
});
