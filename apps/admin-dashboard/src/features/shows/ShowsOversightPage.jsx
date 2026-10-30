import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Film,
  Search,
  Calendar,
  Clock,
  AlertTriangle,
  Eye,
  XCircle,
  Clapperboard,
  AlertCircle,
  ChevronDown,
} from 'lucide-react';
import { adminShowsApi } from '../../services/api/admin-shows.api';
import StatusBadge from '../../components/ui/StatusBadge';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Pagination from '../../components/ui/Pagination';
import Modal from '../../components/ui/Modal';
import { formatDate, formatTime, formatNumber } from '../../utils/formatters';

/* ─── Constants ─────────────────────────────────────────────────────────── */
const STATUS_TABS = [
  { label: 'All Shows',  value: 'ALL' },
  { label: 'Scheduled',  value: 'SCHEDULED' },
  { label: 'Live',       value: 'LIVE' },
  { label: 'Completed',  value: 'COMPLETED' },
  { label: 'Cancelled',  value: 'CANCELLED' },
];

const DATE_FILTERS = [
  { label: 'All Dates',  value: 'all' },
  { label: 'Today',      value: 'today' },
  { label: 'This Week',  value: 'week' },
];

const PAGE_SIZE = 12;

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function buildDateRange(dateFilter) {
  const now = new Date();
  if (dateFilter === 'today') {
    const start = new Date(now.setHours(0, 0, 0, 0)).toISOString();
    const end   = new Date(now.setHours(23, 59, 59, 999)).toISOString();
    return { startDate: start, endDate: end };
  }
  if (dateFilter === 'week') {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  }
  return {};
}

function canCancel(status) {
  return status === 'SCHEDULED' || status === 'LIVE' ||
         status === 'PUBLISHED'  || status === 'RUNNING';
}

/* ─── Occupancy Cell ─────────────────────────────────────────────────────── */
function OccupancyCell({ capacity, booked }) {
  const total     = capacity ?? 0;
  const confirmed = booked   ?? 0;
  const pct       = total > 0 ? Math.round((confirmed / total) * 100) : 0;
  const barColor  = pct >= 90 ? 'bg-rose-500' : pct >= 60 ? 'bg-amber-400' : 'bg-emerald-500';

  return (
    <div className="min-w-[110px]">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-slate-800">{confirmed}/{total}</span>
        <span className="text-[11px] text-slate-400">{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* ─── Main Page ───────────────────────────────────────────────────────────── */
export default function ShowsOversightPage() {
  const queryClient = useQueryClient();

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFilter,   setDateFilter]   = useState('all');
  const [searchTerm,   setSearchTerm]   = useState('');
  const [page,         setPage]         = useState(1);

  // Cancel dialog state
  const [cancelTarget,   setCancelTarget]   = useState(null); // show object
  const [cancelReason,   setCancelReason]   = useState('');
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [formError,      setFormError]      = useState('');
  const [actionError,    setActionError]    = useState(null);

  /* ── Query ─────────────────────────────────────────────────────────────── */
  const queryParams = {
    page,
    limit: PAGE_SIZE,
    ...(statusFilter !== 'ALL' && { status: statusFilter }),
    ...(searchTerm.trim() && { search: searchTerm.trim() }),
    ...buildDateRange(dateFilter),
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-shows-oversight', statusFilter, dateFilter, searchTerm, page],
    queryFn: () => adminShowsApi.getAllShows(queryParams),
    keepPreviousData: true,
  });

  /* ── Cancel Mutation ────────────────────────────────────────────────────── */
  const cancelMutation = useMutation({
    mutationFn: ({ showId, reason }) => adminShowsApi.cancelShow(showId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-shows-oversight'] });
      closeDialog();
    },
    onError: (err) => {
      setActionError(err.response?.data?.message || err.message || 'Failed to cancel show.');
    },
  });

  /* ── Handlers ───────────────────────────────────────────────────────────── */
  function openCancelDialog(show) {
    setCancelTarget(show);
    setCancelReason('');
    setFormError('');
    setActionError(null);
    setCancelModalOpen(true);
  }

  function closeDialog() {
    setCancelModalOpen(false);
    setCancelTarget(null);
    setCancelReason('');
    setFormError('');
  }

  function handleConfirmCancel() {
    if (!cancelReason.trim()) {
      setFormError('A cancellation reason is mandatory for audit and automated refund processing.');
      return;
    }
    cancelMutation.mutate({ showId: cancelTarget._id, reason: cancelReason.trim() });
  }

  function handleStatusChange(value) {
    setStatusFilter(value);
    setPage(1);
  }

  function handleSearchChange(e) {
    setSearchTerm(e.target.value);
    setPage(1);
  }

  /* ── Derived data ───────────────────────────────────────────────────────── */
  const shows      = data?.shows || [];
  const pagination = data?.pagination || null;

  /* ── Render ─────────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6">
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Platform Shows Oversight
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Monitor all scheduled, live, and past shows across every theatre and screen.
          </p>
        </div>

        {/* Status Tabs */}
        <div className="flex flex-wrap gap-1.5 rounded-xl bg-slate-200/80 p-1 text-xs font-semibold shrink-0">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => handleStatusChange(tab.value)}
              className={`rounded-lg px-3 py-1.5 transition-all ${
                statusFilter === tab.value
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Global Error Alert ───────────────────────────────────────────── */}
      {actionError && (
        <div className="flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-800">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{actionError}</span>
          <button
            className="ml-auto text-rose-500 hover:text-rose-700"
            onClick={() => setActionError(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Search + Date Filter bar ─────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by movie title…"
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-full rounded-lg border border-slate-200 pl-10 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-admin-primary focus:outline-none focus:ring-1 focus:ring-admin-primary"
          />
        </div>

        {/* Date filter */}
        <div className="relative">
          <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
          <select
            value={dateFilter}
            onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
            className="appearance-none rounded-lg border border-slate-200 bg-white pl-9 pr-8 py-2 text-xs text-slate-700 font-medium focus:border-admin-primary focus:outline-none focus:ring-1 focus:ring-admin-primary cursor-pointer"
          >
            {DATE_FILTERS.map((df) => (
              <option key={df.value} value={df.value}>{df.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* ── Table Card ──────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex h-72 items-center justify-center">
            <LoadingSpinner size="lg" text="Fetching platform shows…" />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <AlertTriangle className="h-10 w-10 text-rose-400 mb-3" />
            <h3 className="text-sm font-semibold text-slate-800">Failed to load shows</h3>
            <p className="text-xs text-slate-500 mt-1">Check your connection and try again.</p>
          </div>
        ) : shows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Clapperboard className="h-12 w-12 text-slate-300 mb-3" />
            <h3 className="text-sm font-semibold text-slate-800">No Shows Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">
              No shows match the current filters. Try adjusting the status or date range.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Movie Title</th>
                  <th className="px-5 py-3.5">Theatre &amp; Screen</th>
                  <th className="px-5 py-3.5">Date &amp; Time</th>
                  <th className="px-5 py-3.5">Language</th>
                  <th className="px-5 py-3.5">Format</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Capacity / Booked</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shows.map((show) => {
                  const movie   = show.movie   || {};
                  const screen  = show.screen  || {};
                  const theatre = screen.theatre || show.theatre || {};
                  const showId  = show._id;

                  return (
                    <tr key={showId} className="hover:bg-slate-50/70 transition-colors">
                      {/* Movie Title */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          {movie.posterUrl ? (
                            <img
                              src={movie.posterUrl}
                              alt={movie.title}
                              className="h-9 w-6 rounded object-cover shrink-0 border border-slate-200"
                            />
                          ) : (
                            <div className="h-9 w-6 rounded bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                              <Film className="h-3.5 w-3.5 text-slate-400" />
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-slate-900 leading-tight">
                              {movie.title || show.movieTitle || '—'}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                              {showId}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Theatre & Screen */}
                      <td className="px-5 py-4">
                        <div className="font-medium text-slate-800">
                          {theatre.name || show.theatreName || '—'}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {screen.name || show.screenName || 'N/A'}
                        </div>
                      </td>

                      {/* Date & Time */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1 text-slate-800 font-medium">
                          <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          {formatDate(show.startTime || show.showDate)}
                        </div>
                        <div className="flex items-center gap-1 text-slate-500 mt-0.5">
                          <Clock className="h-3 w-3 text-slate-400 shrink-0" />
                          {formatTime(show.startTime || show.showDate)}
                        </div>
                      </td>

                      {/* Language */}
                      <td className="px-5 py-4">
                        <span className="font-medium text-slate-700">
                          {show.language || '—'}
                        </span>
                      </td>

                      {/* Format */}
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 border border-slate-200">
                          {show.format || show.screenFormat || '2D'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <StatusBadge status={show.status} />
                      </td>

                      {/* Capacity / Booked */}
                      <td className="px-5 py-4">
                        <OccupancyCell
                          capacity={show.totalCapacity ?? show.capacity}
                          booked={show.confirmedBookings ?? show.bookedSeats ?? show.soldSeats}
                        />
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/shows/${showId}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm transition-colors"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </Link>

                          {canCancel(show.status) && (
                            <Button
                              variant="danger"
                              size="sm"
                              icon={XCircle}
                              onClick={() => openCancelDialog(show)}
                              disabled={cancelMutation.isPending}
                            >
                              Emergency Cancel
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination && (
          <Pagination
            currentPage={page}
            totalPages={pagination.totalPages || 1}
            totalItems={pagination.totalItems ?? pagination.total}
            pageSize={PAGE_SIZE}
            onPageChange={(p) => setPage(p)}
          />
        )}
      </div>

      {/* ── Emergency Cancel Modal ───────────────────────────────────────── */}
      <Modal
        isOpen={cancelModalOpen}
        onClose={closeDialog}
        title="Emergency Show Cancellation"
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          {/* Warning banner */}
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 leading-relaxed">
              <p className="font-semibold mb-0.5">Immediate Operational Impact</p>
              <p>
                Cancelling <span className="font-semibold">"{cancelTarget?.movie?.title || cancelTarget?.movieTitle || 'this show'}"</span>{' '}
                will instantly mark it as cancelled and trigger automated refund processing for all
                confirmed bookings. This action cannot be undone.
              </p>
            </div>
          </div>

          {/* Show summary */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Show ID</span>
              <span className="font-mono font-medium">{cancelTarget?._id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Theatre / Screen</span>
              <span className="font-medium">
                {cancelTarget?.screen?.theatre?.name || cancelTarget?.theatreName || '—'} /{' '}
                {cancelTarget?.screen?.name || cancelTarget?.screenName || '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Date &amp; Time</span>
              <span className="font-medium">
                {formatDate(cancelTarget?.startTime || cancelTarget?.showDate)},{' '}
                {formatTime(cancelTarget?.startTime || cancelTarget?.showDate)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Status</span>
              <StatusBadge status={cancelTarget?.status} />
            </div>
          </div>

          {/* Reason textarea */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Cancellation Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              value={cancelReason}
              onChange={(e) => { setCancelReason(e.target.value); setFormError(''); }}
              placeholder="e.g. Technical failure in projection system. Fire safety inspection ordered by local authority."
              className={`w-full rounded-xl border p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 resize-none ${
                formError
                  ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500'
                  : 'border-slate-200 focus:border-rose-500 focus:ring-rose-500'
              }`}
            />
            {formError && (
              <p className="mt-1.5 text-xs text-rose-600 flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {formError}
              </p>
            )}
          </div>

          {/* Server error */}
          {actionError && (
            <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {actionError}
            </div>
          )}

          {/* Refund note */}
          <p className="text-[11px] text-slate-400 leading-relaxed italic">
            Note: Automated refunds will be initiated for all confirmed bookings within 5–7 business
            days as per platform refund policy.
          </p>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <Button variant="outline" onClick={closeDialog} disabled={cancelMutation.isPending}>
              Abort
            </Button>
            <Button
              variant="danger"
              icon={XCircle}
              onClick={handleConfirmCancel}
              isLoading={cancelMutation.isPending}
            >
              Confirm Emergency Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
