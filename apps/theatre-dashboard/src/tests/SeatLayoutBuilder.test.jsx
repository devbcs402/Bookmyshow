import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SeatLayoutBuilderPage from '../features/screens/SeatLayoutBuilderPage';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false }
    }
  });

describe('SeatLayoutBuilderPage Component', () => {
  it('renders builder toolbar and canvas screen banner', () => {
    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/screens/screen_123/layout']}>
          <Routes>
            <Route path="/screens/:screenId/layout" element={<SeatLayoutBuilderPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText(/Seating Layout Builder & Engine/i)).toBeInTheDocument();
    expect(screen.getByText(/AUDITORIUM SCREEN DIRECTION/i)).toBeInTheDocument();
    expect(screen.getByText(/Bulk Generator/i)).toBeInTheDocument();
    expect(screen.getByText(/Validate/i)).toBeInTheDocument();
    expect(screen.getByText(/Save Draft/i)).toBeInTheDocument();
    expect(screen.getByText(/Publish Version/i)).toBeInTheDocument();
  });
});

