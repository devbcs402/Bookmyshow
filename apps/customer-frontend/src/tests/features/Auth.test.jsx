import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import LoginPage from '../../features/auth/LoginPage';
import authApi from '../../services/api/auth.api';
import { useAuthStore } from '../../store/auth.store';

vi.mock('../../services/api/auth.api');

describe('Customer Auth Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ user: null, isAuthenticated: false, isLoading: false, error: null });
  });

  it('renders login form and validates mandatory fields', async () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    expect(screen.getByText('Sign In')).toBeInTheDocument();
    const submitBtn = screen.getByRole('button', { name: /Sign In/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/Please enter a valid email or 10-digit mobile number/i)
      ).toBeInTheDocument();
    });
  });

  it('submits credentials and updates auth store on success', async () => {
    authApi.login.mockResolvedValueOnce({
      data: {
        user: { _id: 'u-1', name: 'John Doe', email: 'john@example.com', role: 'CUSTOMER' },
        accessToken: 'mock-access-token-xyz'
      }
    });

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    const emailInput = screen.getByPlaceholderText(/patron@cinema.com/i);
    const passwordInput = screen.getByPlaceholderText(/••••••••/i);
    const submitBtn = screen.getByRole('button', { name: /Sign In/i });

    fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'Secret123' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'john@example.com',
          password: 'Secret123'
        })
      );
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().user.name).toBe('John Doe');
    });
  });
});

