import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Ticket, Search, Filter, Eye, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { bookingsApi } from '../../services/api/bookings.api';
import { formatCurrency, formatDate, formatTime } from '../../utils/formatters';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import StatusBadge from '../../components/ui/StatusBadge';
import DataTable from '../../components/ui/DataTable';

export function BookingsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data: bookingsData, isLoading } = useQuery({
    queryKey: ['partnerBookings', statusFilter, page],
    queryFn: () =>
      bookingsApi.getPartnerBookings({
        status: statusFilter || undefined,
        page,
        limit: 15
      })
  });

  const bookings = Array.isArray(bookingsData)
    ? bookingsData
    : bookingsData?.bookings || [];

  const paginationMeta = bookingsData?.meta || {
    page: 1,
    totalPages: 1,
    total: bookings.length
  };

  const columns = [
    {
      title: 'Booking Reference',
      key: 'bookingReference',
      render: (row) => (
        <div>
          <span className="font-mono font-bold text-white text-xs">
            {row.bookingReference || row._id?.slice(-8).toUpperCase()}
          </span>
          <p className="text-[11px] text-slate-400">
            {formatDate(row.createdAt)}, {formatTime(row.createdAt)}
          </p>
        </div>
      )
    },
    {
      title: 'Movie & Screening',
      key: 'movieTitle',
      render: (row) => (
        <div>
          <p className="font-semibold text-white">{row.movieTitle || 'Movie'}</p>
          <p className="text-[11px] text-slate-400">
            {row.screenName || 'Screen'} • {formatDate(row.showTime)}, {formatTime(row.showTime)}
          </p>
        </div>
      )
    },
    {
      title: 'Allocated Seats',
      key: 'seats',
      render: (row) => {
        const seatLabels = Array.isArray(row.seats)
          ? row.seats.map((s) => s.seatLabel || s).join(', ')
          : '-';
        return <span className="font-mono text-xs text-partner-400 font-semibold">{seatLabels}</span>;
      }
    },
    {
      title: 'Total Amount',
      key: 'pricing',
      render: (row) => (
        <span className="font-semibold text-white">
          {formatCurrency(row.pricing?.totalPrice ?? row.totalAmount ?? 0)}
        </span>
      )
    },
    {
      title: 'Admission Status',
      key: 'status',
      render: (row) => <StatusBadge status={row.status} />
    },
    {
      title: 'Actions',
      key: 'actions',
      className: 'text-right',
      render: (row) => (
        <Link
          to={`/bookings/${row._id || row.id}`}
          className="text-xs font-semibold text-partner-400 hover:text-partner-300 hover:underline inline-flex items-center gap-1"
        >
          Inspect <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-cinema-border">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Bookings & Box Office Admissions</h1>
          <p className="text-xs text-slate-400 mt-1">
            Tenant-isolated customer admissions and reservation audit log
          </p>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 justify-between">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-2">Status:</span>
          {['', 'CONFIRMED', 'CANCELLED', 'EXPIRED'].map((st) => (
            <button
              key={st}
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === st
                  ? 'bg-partner-600 text-white font-semibold'
                  : 'bg-cinema-card border border-cinema-border text-slate-400 hover:text-white'
              }`}
            >
              {st || 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={bookings}
        isLoading={isLoading}
        emptyMessage="No customer bookings found under your partner theatres."
        pagination={{
          currentPage: page,
          totalPages: paginationMeta.totalPages || 1,
          totalItems: paginationMeta.total || bookings.length,
          pageSize: 15,
          onPageChange: (p) => setPage(p)
        }}
      />
    </div>
  );
}

export default BookingsPage;

