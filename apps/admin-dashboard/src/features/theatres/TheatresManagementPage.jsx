import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Search,
  Building2,
  Filter,
  AlertCircle,
  PauseCircle,
  PlayCircle,
  Eye,
  LayoutGrid,
} from 'lucide-react';
import { adminTheatresApi } from '../../services/api/admin-theatres.api';
import StatusBadge from '../../components/ui/StatusBadge';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Pagination from '../../components/ui/Pagination';
import Modal from '../../components/ui/Modal';
import { formatDate } from '../../utils/formatters';
import { cn } from '../../utils/cn';

const PAGE_LIMIT = 10;

const STATUS_TABS = [
  { label: 'All Theatres', value: 'ALL' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Suspended', value: 'SUSPENDED' },
  { label: 'Pending Approval', value: 'PENDING_APPROVAL' },
];

export default function TheatresManagementPage() {
  const queryClient = useQueryClient();

  // ─── Local State ─────────────────────────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ open: false, type: null, theatre: null });

  // ─── Debounce search 400ms ─────────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Reset page when filter changes
  const handleTabChange = useCallback((value) => {
    setStatusFilter(value);
    setPage(1);
    setActionError(null);
  }, []);

  // ─── Data Fetching ────────────────────────────────────────────────────────────
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-theatres-management', statusFilter, debouncedSearch, page],
    queryFn: () =>
      adminTheatresApi.getAllTheatres({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        search: debouncedSearch || undefined,
        page,
        limit: PAGE_LIMIT,
      }),
    keepPreviousData: true,
  });

  // ─── Suspend Mutation ─────────────────────────────────────────────────────────
  const suspendMutation = useMutation({
    mutationFn: (theatreId) => adminTheatresApi.suspendTheatre(theatreId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-theatres-management'] });
      queryClient.invalidateQueries({ queryKey: ['admin-overview-kpis'] });
      closeConfirmModal();
    },
    onError: (err) => {
      setActionError(err.response?.data?.message || err.message || 'Failed to suspend theatre.');
    },
  });

  // ─── Reactivate Mutation ──────────────────────────────────────────────────────
  const reactivateMutation = useMutation({
    mutationFn: (theatreId) => adminTheatresApi.reactivateTheatre(theatreId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-theatres-management'] });
      queryClient.invalidateQueries({ queryKey: ['admin-overview-kpis'] });
      closeConfirmModal();
    },
    onError: (err) => {
      setActionError(err.response?.data?.message || err.message || 'Failed to reactivate theatre.');
    },
  });

  // ─── Modal Helpers ────────────────────────────────────────────────────────────
  const openConfirmModal = (type, theatre) => {
    setActionError(null);
    setConfirmModal({ open: true, type, theatre });
  };

  const closeConfirmModal = () => {
    setConfirmModal({ open: false, type: null, theatre: null });
  };

  const handleConfirmAction = () => {
    if (!confirmModal.theatre) return;
    if (confirmModal.type === 'suspend') {
      suspendMutation.mutate(confirmModal.theatre._id);
    } else if (confirmModal.type === 'reactivate') {
      reactivateMutation.mutate(confirmModal.theatre._id);
    }
  };

  const isActionPending = suspendMutation.isPending || reactivateMutation.isPending;

  // ─── Derived data ─────────────────────────────────────────────────────────────
  const theatres = data?.theatres || [];
  const pagination = data?.pagination || null;

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100">
            <Building2 className="h-5 w-5 text-indigo-600" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Theatres Management</h1>
        </div>
        <p className="mt-1 pl-0.5 text-sm text-slate-500">
          Browse, search, and manage all registered theatre venues on the platform.
        </p>
      </div>

      {/* ── Action Error Alert ── */}
      {actionError && (
        <div className="flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-800">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
          <span>{actionError}</span>
          <button
            onClick={() => setActionError(null)}
            className="ml-auto text-rose-400 hover:text-rose-700"
            aria-label="Dismiss error"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Search + Filter Bar ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name, city, or owner…"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400 transition-colors"
          />
        </div>

        {/* Status filter tabs */}
        <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 text-xs font-semibold">
          <Filter className="ml-1 h-3.5 w-3.5 text-slate-400 shrink-0" />
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => handleTabChange(tab.value)}
              className={cn(
                'rounded-lg px-3 py-1.5 transition-all',
                statusFilter === tab.value
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table Card ── */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex h-72 items-center justify-center">
            <LoadingSpinner size="lg" text="Fetching theatres…" />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <AlertCircle className="h-10 w-10 text-rose-300" />
            <p className="text-sm font-semibold text-slate-700">Failed to load theatres</p>
            <p className="text-xs text-slate-400 max-w-xs">
              {error?.response?.data?.message || error?.message || 'An unexpected error occurred.'}
            </p>
          </div>
        ) : theatres.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <Building2 className="h-12 w-12 text-slate-200" />
            <p className="text-sm font-semibold text-slate-600">No theatres found</p>
            <p className="text-xs text-slate-400">
              Try adjusting the search term or status filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Theatre Name</th>
                  <th className="px-5 py-3.5">City / State</th>
                  <th className="px-5 py-3.5">Owner</th>
                  <th className="px-5 py-3.5 text-center">Screens</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Created</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {theatres.map((theatre) => (
                  <tr
                    key={theatre._id}
                    className="group hover:bg-slate-50/70 transition-colors duration-100"
                  >
                    {/* Theatre Name */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 border border-indigo-100">
                          <Building2 className="h-4 w-4 text-indigo-400" />
                        </span>
                        <div>
                          <p className="font-semibold text-slate-900 leading-snug">
                            {theatre.name || 'Untitled Theatre'}
                          </p>
                          <p className="text-[11px] font-mono text-slate-400 mt-0.5 truncate max-w-[160px]">
                            {theatre._id}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* City / State */}
                    <td className="px-5 py-4">
                      <span className="font-medium text-slate-700">
                        {theatre.city || '—'}
                      </span>
                      {theatre.state && (
                        <span className="text-slate-400">, {theatre.state}</span>
                      )}
                      {theatre.pincode && (
                        <div className="text-[11px] text-slate-400 mt-0.5">{theatre.pincode}</div>
                      )}
                    </td>

                    {/* Owner */}
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-800">
                        {theatre.owner?.name || '—'}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[160px]">
                        {theatre.owner?.email || theatre.contactEmail || ''}
                      </p>
                    </td>

                    {/* Screens count */}
                    <td className="px-5 py-4 text-center">
                      <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                        <LayoutGrid className="h-3 w-3" />
                        {theatre.totalScreens ?? theatre.screens?.length ?? '—'}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <StatusBadge status={theatre.status} />
                    </td>

                    {/* Created */}
                    <td className="px-5 py-4 text-slate-500 whitespace-nowrap">
                      {formatDate(theatre.createdAt)}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* View Details */}
                        <Link
                          to={`/theatres/${theatre._id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-600 shadow-sm hover:bg-slate-50 hover:text-slate-900 transition-colors"
                          title="View Theatre Details"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View Details
                        </Link>

                        {/* Suspend — only for APPROVED */}
                        {theatre.status === 'APPROVED' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-amber-200 text-amber-700 hover:bg-amber-50 hover:border-amber-300"
                            icon={PauseCircle}
                            onClick={() => openConfirmModal('suspend', theatre)}
                            disabled={isActionPending}
                          >
                            Suspend
                          </Button>
                        )}

                        {/* Reactivate — only for SUSPENDED */}
                        {theatre.status === 'SUSPENDED' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300"
                            icon={PlayCircle}
                            onClick={() => openConfirmModal('reactivate', theatre)}
                            disabled={isActionPending}
                          >
                            Reactivate
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination ── */}
        {pagination && pagination.totalPages > 1 && (
          <Pagination
            currentPage={page}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems ?? pagination.total}
            pageSize={PAGE_LIMIT}
            onPageChange={(p) => setPage(p)}
          />
        )}
      </div>

      {/* ── Confirm Action Modal ── */}
      <Modal
        isOpen={confirmModal.open}
        onClose={closeConfirmModal}
        title={
          confirmModal.type === 'suspend'
            ? `Suspend Theatre`
            : `Reactivate Theatre`
        }
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          {/* Theatre name callout */}
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <Building2 className="h-5 w-5 shrink-0 text-indigo-400" />
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {confirmModal.theatre?.name}
              </p>
              <p className="text-xs text-slate-500">
                {confirmModal.theatre?.city}{confirmModal.theatre?.state ? `, ${confirmModal.theatre.state}` : ''}
              </p>
            </div>
          </div>

          {/* Warning message */}
          {confirmModal.type === 'suspend' ? (
            <p className="text-xs text-slate-600 leading-relaxed">
              Suspending this theatre will immediately halt all active shows and ticket sales for this venue.
              The theatre owner will be notified. You can reactivate it at any time.
            </p>
          ) : (
            <p className="text-xs text-slate-600 leading-relaxed">
              Reactivating this theatre will restore its operational status, allowing shows and ticket
              sales to resume. Ensure compliance requirements have been met before proceeding.
            </p>
          )}

          {/* Inline action error */}
          {actionError && (
            <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {actionError}
            </div>
          )}

          {/* Footer buttons */}
          <div className="flex justify-end gap-2.5 pt-1">
            <Button variant="outline" size="sm" onClick={closeConfirmModal} disabled={isActionPending}>
              Cancel
            </Button>
            {confirmModal.type === 'suspend' ? (
              <Button
                variant="danger"
                size="sm"
                icon={PauseCircle}
                isLoading={suspendMutation.isPending}
                onClick={handleConfirmAction}
              >
                Confirm Suspend
              </Button>
            ) : (
              <Button
                variant="success"
                size="sm"
                icon={PlayCircle}
                isLoading={reactivateMutation.isPending}
                onClick={handleConfirmAction}
              >
                Confirm Reactivate
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
