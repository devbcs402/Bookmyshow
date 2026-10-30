import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Ticket,
  CheckCircle,
  XCircle,
  DollarSign,
  Search,
  SlidersHorizontal,
  ExternalLink,
  RefreshCw,
  Hash,
  LayoutList
} from 'lucide-react';
import { adminBookingsApi } from '../../services/api/admin-bookings.api';
import StatusBadge from '../../components/ui/StatusBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Button from '../../components/ui/Button';
import StatCard from '../../components/ui/StatCard';
import Pagination from '../../components/ui/Pagination';
import { formatDate, formatTime, formatCurrency } from '../../utils/formatters';

// ─── Constants ────────────────────────────────────────────────────────────────

const BOOKING_STATUSES = ['ALL', 'PENDING', 'CONFIRMED', 'CANCELLED', 'FAILED'];
const PAYMENT_STATUSES = ['ALL', 'CREATED', 'PENDING', 'CAPTURED', 'FAILED', 'REFUNDED'];
const PAGE_SIZE = 15;

// ─── Helper ───────────────────────────────────────────────────────────────────

function buildParams({ page, search, bookingStatus, paymentStatus, dateFrom, dateTo }) {
  const params = { page, limit: PAGE_SIZE };
  if (search.trim())              params.search        = search.trim();
  if (bookingStatus !== 'ALL')    params.status        = bookingStatus;
  if (paymentStatus !== 'ALL')    params.paymentStatus = paymentStatus;
  if (dateFrom)                   params.dateFrom      = dateFrom;
  if (dateTo)                     params.dateTo        = dateTo;
  return params;
}

// ─── Filter Bar ───────────────────────────────────────────────────────────────

function FilterBar({ filters, onChange, onReset }) {
  return (
    <div className="bg-white border border-admin-border rounded-xl p-4 shadow-admin-card space-y-3">
      {/* Search */}
      <div className="flex items-center gap-2 bg-slate-50 border border-admin-border rounded-lg px-3 py-2">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          type="text"
          placeholder="Search by booking ref or customer mobile…"
          value={filters.search}
          onChange={(e) => onChange('search', e.target.value)}
          className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none"
        />
      </div>

      {/* Row 2: Status + Payment Status + Dates + Reset */}
      <div className="flex flex-wrap items-end gap-3">
        {/* Booking Status */}
        <div className="flex flex-col gap-1 min-w-[140px]">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Booking Status
          </label>
          <select
            value={filters.bookingStatus}
            onChange={(e) => onChange('bookingStatus', e.target.value)}
            className="rounded-lg border border-admin-border bg-white px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-admin-primary"
          >
            {BOOKING_STATUSES.map((s) => (
              <option key={s} value={s}>{s === 'ALL' ? 'All Statuses' : s}</option>
            ))}
          </select>
        </div>

        {/* Payment Status */}
        <div className="flex flex-col gap-1 min-w-[155px]">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Payment Status
          </label>
          <select
            value={filters.paymentStatus}
            onChange={(e) => onChange('paymentStatus', e.target.value)}
            className="rounded-lg border border-admin-border bg-white px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-admin-primary"
          >
            {PAYMENT_STATUSES.map((s) => (
              <option key={s} value={s}>{s === 'ALL' ? 'All Payments' : s}</option>
            ))}
          </select>
        </div>

        {/* Date From */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            From
          </label>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => onChange('dateFrom', e.target.value)}
            className="rounded-lg border border-admin-border bg-white px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-admin-primary"
          />
        </div>

        {/* Date To */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            To
          </label>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => onChange('dateTo', e.target.value)}
            className="rounded-lg border border-admin-border bg-white px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-admin-primary"
          />
        </div>

        {/* Reset */}
        <Button variant="ghost" size="sm" icon={RefreshCw} onClick={onReset} className="ml-auto">
          Reset
        </Button>
      </div>
    </div>
  );
}

// ─── Summary Stats ─────────────────────────────────────────────────────────────

function SummaryStats({ bookings = [], pagination }) {
  const confirmed = bookings.filter((b) => b.status === 'CONFIRMED').length;
  const cancelled = bookings.filter((b) => b.status === 'CANCELLED').length;
  const totalValue = bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <StatCard
        title="Records Shown"
        value={bookings.length}
        subtitle={pagination?.total ? `of ${pagination.total} total` : undefined}
        icon={LayoutList}
        colorScheme="blue"
      />
      <StatCard
        title="Confirmed"
        value={confirmed}
        subtitle="on this page"
        icon={CheckCircle}
        colorScheme="emerald"
      />
      <StatCard
        title="Cancelled"
        value={cancelled}
        subtitle="on this page"
        icon={XCircle}
        colorScheme="red"
      />
      <StatCard
        title="Page Value"
        value={formatCurrency(totalValue)}
        subtitle="sum of shown bookings"
        icon={DollarSign}
        colorScheme="amber"
      />
    </div>
  );
}

// ─── Table ────────────────────────────────────────────────────────────────────

function BookingsTable({ bookings = [], isLoading }) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" text="Loading bookings…" />
      </div>
    );
  }

  if (!bookings.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-400">
        <Ticket className="w-10 h-10 opacity-30" />
        <p className="text-sm font-medium">No bookings match your filters</p>
        <p className="text-xs">Try adjusting the search or filter criteria above.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs text-slate-600">
        <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-admin-border">
          <tr>
            <th className="px-5 py-3 whitespace-nowrap">Booking Ref</th>
            <th className="px-5 py-3 whitespace-nowrap">Customer</th>
            <th className="px-5 py-3 whitespace-nowrap">Movie</th>
            <th className="px-5 py-3 whitespace-nowrap">Theatre</th>
            <th className="px-5 py-3 whitespace-nowrap">Show Date</th>
            <th className="px-5 py-3 whitespace-nowrap text-center">Seats</th>
            <th className="px-5 py-3 whitespace-nowrap text-right">Amount</th>
            <th className="px-5 py-3 whitespace-nowrap">Status</th>
            <th className="px-5 py-3 whitespace-nowrap">Payment</th>
            <th className="px-5 py-3 whitespace-nowrap">Booked On</th>
            <th className="px-5 py-3 whitespace-nowrap text-center">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {bookings.map((booking) => (
            <tr
              key={booking._id}
              className="hover:bg-slate-50/70 transition-colors"
            >
              {/* Booking Ref */}
              <td className="px-5 py-3.5">
                <span className="font-mono font-semibold text-slate-900 text-[11px] tracking-wide">
                  {booking.bookingReference || booking._id?.slice(-10).toUpperCase()}
                </span>
              </td>

              {/* Customer */}
              <td className="px-5 py-3.5">
                <p className="font-medium text-slate-800 truncate max-w-[130px]">
                  {booking.user?.name || 'Unknown'}
                </p>
                <p className="text-[11px] text-slate-400">
                  {booking.user?.mobile || '—'}
                </p>
              </td>

              {/* Movie */}
              <td className="px-5 py-3.5">
                <p className="font-medium text-slate-800 truncate max-w-[140px]">
                  {booking.show?.movie?.title || booking.movieTitle || '—'}
                </p>
              </td>

              {/* Theatre */}
              <td className="px-5 py-3.5">
                <p className="text-slate-700 truncate max-w-[140px]">
                  {booking.show?.screen?.theatre?.name || booking.theatreName || '—'}
                </p>
              </td>

              {/* Show Date */}
              <td className="px-5 py-3.5 whitespace-nowrap">
                <p className="text-slate-700">{formatDate(booking.show?.startTime)}</p>
                <p className="text-[11px] text-slate-400">{formatTime(booking.show?.startTime)}</p>
              </td>

              {/* Seats */}
              <td className="px-5 py-3.5 text-center font-semibold text-slate-800">
                {booking.seats?.length ?? booking.seatCount ?? '—'}
              </td>

              {/* Amount */}
              <td className="px-5 py-3.5 text-right font-semibold text-slate-900 whitespace-nowrap">
                {formatCurrency(booking.totalAmount ?? 0)}
              </td>

              {/* Booking Status */}
              <td className="px-5 py-3.5">
                <StatusBadge status={booking.status} />
              </td>

              {/* Payment Status */}
              <td className="px-5 py-3.5">
                <StatusBadge status={booking.payment?.status ?? booking.paymentStatus} />
              </td>

              {/* Booked On */}
              <td className="px-5 py-3.5 whitespace-nowrap text-slate-500">
                {formatDate(booking.createdAt)}
              </td>

              {/* Actions */}
              <td className="px-5 py-3.5 text-center">
                <Link
                  to={`/bookings/${booking._id}`}
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-admin-primary hover:text-white transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  View Details
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const INITIAL_FILTERS = {
  search: '',
  bookingStatus: 'ALL',
  paymentStatus: 'ALL',
  dateFrom: '',
  dateTo: '',
};

export default function BookingsManagementPage() {
  const [page, setPage]       = useState(1);
  const [filters, setFilters] = useState(INITIAL_FILTERS);

  const handleFilterChange = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);

  const handleReset = useCallback(() => {
    setFilters(INITIAL_FILTERS);
    setPage(1);
  }, []);

  const queryParams = buildParams({ page, ...filters });

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['admin-bookings', queryParams],
    queryFn: () => adminBookingsApi.getAllBookings(queryParams),
    keepPreviousData: true,
    staleTime: 30_000,
  });

  const bookings   = data?.bookings   ?? [];
  const pagination = data?.pagination ?? {};
  const totalPages = pagination.totalPages ?? pagination.pages ?? 1;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Ticket className="w-5 h-5 text-admin-primary" />
            Bookings Management
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Platform-wide booking records across all theatres and shows
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          icon={RefreshCw}
          onClick={() => refetch()}
          isLoading={isFetching && !isLoading}
        >
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <FilterBar filters={filters} onChange={handleFilterChange} onReset={handleReset} />

      {/* Error banner */}
      {isError && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <XCircle className="w-4 h-4 shrink-0" />
          <span>
            Failed to load bookings: {error?.message ?? 'Unknown error'}. Please try refreshing.
          </span>
        </div>
      )}

      {/* Summary Stats */}
      <SummaryStats bookings={bookings} pagination={pagination} />

      {/* Table Card */}
      <div className="bg-white border border-admin-border rounded-xl shadow-admin-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-admin-border">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-semibold text-slate-700">
              All Bookings
            </span>
            {pagination.total !== undefined && (
              <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                {pagination.total} total
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <Hash className="w-3 h-3" />
            Page {page} of {totalPages}
          </div>
        </div>

        <BookingsTable bookings={bookings} isLoading={isLoading} />

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={pagination.total}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
