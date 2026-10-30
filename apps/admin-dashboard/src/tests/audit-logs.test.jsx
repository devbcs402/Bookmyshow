import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import AuditLogsPage from '../features/audit-logs/AuditLogsPage';
import { adminAuditLogsApi } from '../services/api/admin-audit-logs.api';

vi.mock('../services/api/admin-audit-logs.api', () => ({
  adminAuditLogsApi: {
    getAuditLogs: vi.fn(),
  },
}));

describe('Audit Logs Immutability & Read-Only Governance', () => {
  let queryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
  });

  it('renders read-only audit log records and guarantees no mutation controls', async () => {
    adminAuditLogsApi.getAuditLogs.mockResolvedValueOnce({
      logs: [
        {
          _id: 'audit-999',
          actor: { name: 'Root Super Admin', role: 'SUPER_ADMIN' },
          action: 'THEATRE_APPROVE',
          resourceType: 'THEATRE',
          resourceId: 'th-555',
          ipAddress: '192.168.1.100',
          status: 'SUCCESS',
          timestamp: new Date().toISOString(),
        },
      ],
      pagination: { total: 1, totalPages: 1 },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AuditLogsPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByText('THEATRE_APPROVE')).toBeInTheDocument();
    expect(screen.getByText('Platform Security Audit Trail')).toBeInTheDocument();
    expect(screen.getByText('Read-Only Enforcement')).toBeInTheDocument();
    expect(screen.getByText('Root Super Admin')).toBeInTheDocument();

    // Verify there are NO edit, update, or delete buttons anywhere
    expect(screen.queryByText(/edit/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/delete/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/modify/i)).not.toBeInTheDocument();
  });
});
