import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import TheatreApprovalsPage from '../features/approvals/TheatreApprovalsPage';
import { adminTheatresApi } from '../services/api/admin-theatres.api';

vi.mock('../services/api/admin-theatres.api', () => ({
  adminTheatresApi: {
    getAllTheatres: vi.fn(),
    approveTheatre: vi.fn(),
    rejectTheatre: vi.fn(),
  },
}));

describe('Theatre Approvals & Compliance Governance', () => {
  let queryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
  });

  it('renders pending exhibitor registrations awaiting compliance review', async () => {
    adminTheatresApi.getAllTheatres.mockResolvedValueOnce({
      theatres: [
        {
          _id: 'th-001',
          name: 'PVR Phoenix Palladium',
          city: 'Mumbai',
          state: 'Maharashtra',
          status: 'PENDING_APPROVAL',
          owner: { name: 'PVR Exhibitor Org', email: 'exhibitor@pvr.com' },
          createdAt: new Date().toISOString(),
        },
      ],
      pagination: { total: 1, totalPages: 1 },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <TheatreApprovalsPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByText('PVR Phoenix Palladium')).toBeInTheDocument();
    expect(screen.getByText('Mumbai, Maharashtra')).toBeInTheDocument();
    expect(screen.getByText('PVR Exhibitor Org')).toBeInTheDocument();
    expect(screen.getByText('Approve')).toBeInTheDocument();
    expect(screen.getByText('Reject')).toBeInTheDocument();
  });

  it('opens mandatory rejection modal on clicking reject', async () => {
    adminTheatresApi.getAllTheatres.mockResolvedValueOnce({
      theatres: [
        {
          _id: 'th-002',
          name: 'INOX Megaplex',
          city: 'Surat',
          status: 'PENDING_APPROVAL',
          owner: { name: 'INOX Leisure' },
          createdAt: new Date().toISOString(),
        },
      ],
      pagination: { total: 1, totalPages: 1 },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <TheatreApprovalsPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    const rejectBtn = await screen.findByText('Reject');
    fireEvent.click(rejectBtn);

    expect(screen.getByText(/Reject Theatre: INOX Megaplex/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Cinema Exhibition License expired/i)).toBeInTheDocument();
    expect(screen.getByText('Confirm Rejection')).toBeInTheDocument();
  });
});
