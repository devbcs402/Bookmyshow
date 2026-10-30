import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Ticket,
  User,
  Building2,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ShieldAlert,
  Clock,
  RefreshCw,
  Hash,
  Monitor,
  Calendar,
  Tag,
  Banknote
} from 'lucide-react';
import { adminBookingsApi } from '../../services/api/admin-bookings.api';
import StatusBadge from '../../components/ui/StatusBadge';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';
import { formatDate, formatTime, formatCurrency } from '../../utils/formatters';

// ─── Section wrapper ───────────────────────────────────────────────────────────

function Section({ icon: Icon, title, colorClass = 'text-admin-primary', children }) {
  return (
    <div className="bg-white border border-admin-border rounded-xl shadow-admin-card overflow-hidden">
      <div className="flex items-center gap-2.5 border-b border-admin-border px-5 py-3.5">
        <Icon className={`w-4 h-4 shrink-0 ${colorClass}`} />
        <h2 className="text-sm font-bold text-slate-800">{title}</h2>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

// ─── Info Row helper ───────────────────────────────────────────────────────────

function InfoRow({ label, value, mono = false, className = '' }) {
  return (
    <div className={`flex items-start justify-between gap-4 py-2 border-b border-slate-100 last:border-0 ${className}`}>
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide shrink-0 mt-0.5 min-w-[130px]">
        {label}
      </span>
      <span className={`text-sm text-slate-800 text-right break-all ${mono ? 'font-mono text-xs' : ''}`}>
        {value ?? <span className="text-slate-400 italic">—</span>}
      </span>
    </div>
  );
}

// ─── Cancel Dialog ────────────────────────────────────────────────────────────

function CancelBookingModal({ isOpen, onClose, onConfirm, isLoading }) {
  const [reason, setReason] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason.trim()) return;
    onConfirm(reason.trim());
  };

  const handleClose = () => {
    setReason('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Admin Cancel Booking"
      maxWidth="max-w-lg"
    >
      {/* Danger warning */}
      <div className="mb-4 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
        <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
        <div className="text-sm text-rose-800 space-y-1">
          <p className="font-bold">Irreversible Action</p>
          <p>
            This action triggers automated refund processing. It <strong>cannot be undone</strong>.
            The customer will be notified and any eligible amount will be queued for refund.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-700">
            Cancellation Reason <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={4}
            required
            placeholder="Provide a detailed reason for administrative cancellation…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-lg border border-admin-border bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-rose-400 focus:border-rose-400 resize-none transition"
          />
          <p className="text-[11px] text-slate-400">
            This reason will be logged in the audit trail and may be visible to the customer.
          </p>
        </div>

        {/* Security note */}
        <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-800 font-medium">
            Never manually mark bookings as paid. Use backend workflows only.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-1">
          <Button variant="ghost" size="sm" onClick={handleClose} disabled={isLoading}>
            Discard
          </Button>
          <Button
            type="submit"
            variant="danger"
            size="sm"
            icon={XCircle}
            isLoading={isLoading}
            disabled={!reason.trim()}
          >
            Confirm Cancellation
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Seats Table ──────────────────────────────────────────────────────────────

function SeatsTable({ seats = [] }) {
  if (!seats.length) {
    return <p className="text-sm text-slate-400 italic">No seat details available.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-admin-border">
      <table className="w-full text-left text-xs text-slate-600">
        <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-admin-border">
          <tr>
            <th className="px-4 py-2.5">Label</th>
            <th className="px-4 py-2.5">Row</th>
            <th className="px-4 py-2.5">Category</th>
            <th className="px-4 py-2.5 text-right">Price</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {seats.map((seat, idx) => (
            <tr key={seat._id ?? idx} className="hover:bg-slate-50/60 transition-colors">
              <td className="px-4 py-2.5 font-mono font-semibold text-slate-800">
                {seat.label ?? seat.seatNumber ?? `#${idx + 1}`}
              </td>
              <td className="px-4 py-2.5 text-slate-600">
                {seat.row ?? '—'}
              </td>
              <td className="px-4 py-2.5">
                <span className="rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 px-2 py-0.5 text-[10px] font-semibold uppercase">
                  {seat.category ?? seat.type ?? 'Standard'}
                </span>
              </td>
              <td className="px-4 py-2.5 text-right font-semibold text-slate-900">
                {formatCurrency(seat.price ?? 0)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BookingDetailPage() {
  const { bookingId } = useParams();
  const navigate      = useNavigate();
  const queryClient   = useQueryClient();

  const [cancelOpen, setCancelOpen]     = useState(false);
  const [successBanner, setSuccessBanner] = useState(false);

  // ── Fetch booking ────────────────────────────────────────────────────────────

  const {
    data: booking,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['admin-booking-detail', bookingId],
    queryFn: () => adminBookingsApi.getBookingById(bookingId),
    enabled: !!bookingId,
    staleTime: 60_000,
  });

  // ── Cancel mutation ───────────────────────────────────────────────────────────

  const cancelMutation = useMutation({
    mutationFn: (reason) => adminBookingsApi.cancelBooking(bookingId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-booking-detail', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
      setCancelOpen(false);
      setSuccessBanner(true);
      setTimeout(() => setSuccessBanner(false), 6000);
    },
  });

  // ── Derived data ──────────────────────────────────────────────────────────────

  const isCancellable =
    booking?.status === 'CONFIRMED' || booking?.status === 'PENDING';

  const show    = booking?.show    ?? {};
  const movie   = show?.movie      ?? {};
  const screen  = show?.screen     ?? {};
  const theatre = screen?.theatre  ?? {};
  const user    = booking?.user    ?? {};
  const payment = booking?.payment ?? {};

  // ── Render ────────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex h-72 items-center justify-center">
        <LoadingSpinner size="lg" text="Loading booking details…" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/bookings')}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Bookings
        </button>
        <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-800">
          <XCircle className="w-5 h-5 shrink-0" />
          <div>
            <p className="font-bold">Failed to load booking</p>
            <p className="text-xs mt-0.5">{error?.message ?? 'The booking may not exist or you lack permission.'}</p>
          </div>
          <Button variant="outline" size="sm" icon={RefreshCw} onClick={() => refetch()} className="ml-auto shrink-0">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="flex h-72 items-center justify-center text-slate-400 text-sm">
        Booking not found.
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* ── Back Button ── */}
      <Link
        to="/bookings"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Bookings
      </Link>

      {/* ── Success Banner ── */}
      {successBanner && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-sm">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span>
            Booking has been cancelled. Refund processing has been triggered automatically.
          </span>
        </div>
      )}

      {/* ── Cancel mutation error ── */}
      {cancelMutation.isError && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{cancelMutation.error?.message ?? 'Cancellation failed. Please try again.'}</span>
        </div>
      )}

      {/* ── Hero Header ── */}
      <div className="bg-white border border-admin-border rounded-xl shadow-admin-card px-6 py-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-2">
            {/* Booking Ref */}
            <div className="flex items-center gap-2">
              <Ticket className="w-5 h-5 text-admin-primary shrink-0" />
              <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                Booking Reference
              </span>
            </div>
            <p className="font-mono text-2xl font-bold tracking-widest text-slate-900">
              {booking.bookingReference ?? booking._id}
            </p>

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <StatusBadge status={booking.status} />
              <StatusBadge status={payment.status ?? booking.paymentStatus} />
            </div>

            {/* Meta */}
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              Booked on {formatDate(booking.createdAt)} at {formatTime(booking.createdAt)}
            </p>
          </div>

          {/* Admin Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" icon={RefreshCw} onClick={() => refetch()}>
              Refresh
            </Button>
            {isCancellable && (
              <Button
                variant="danger"
                size="sm"
                icon={XCircle}
                onClick={() => setCancelOpen(true)}
              >
                Admin Cancel
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Security Note ── */}
      <div className="flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
        <p className="text-xs text-amber-800 font-medium">
          <span className="font-bold">Security Notice:</span> Never manually mark bookings as paid.
          Use backend workflows only. All admin actions are recorded in the audit log.
        </p>
      </div>

      {/* ── Info Grid ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

        {/* Customer Info */}
        <Section icon={User} title="Customer Information" colorClass="text-indigo-500">
          <InfoRow label="Full Name"    value={user.name    ?? '—'} />
          <InfoRow label="Email"        value={user.email   ?? '—'} />
          <InfoRow label="Mobile"       value={user.mobile  ?? user.phone ?? '—'} />
          <InfoRow label="User ID"      value={user._id     ?? '—'} mono />
        </Section>

        {/* Show Info */}
        <Section icon={Monitor} title="Show Information" colorClass="text-blue-500">
          <InfoRow
            label="Movie"
            value={movie.title ?? '—'}
          />
          <InfoRow
            label="Theatre"
            value={theatre.name ?? '—'}
          />
          <InfoRow
            label="Branch / City"
            value={theatre.city ?? theatre.branch ?? '—'}
          />
          <InfoRow
            label="Screen"
            value={screen.name ?? screen.screenName ?? '—'}
          />
          <InfoRow
            label="Show Date"
            value={show.startTime ? `${formatDate(show.startTime)}` : '—'}
          />
          <InfoRow
            label="Show Time"
            value={show.startTime ? formatTime(show.startTime) : '—'}
          />
          <InfoRow
            label="Language"
            value={show.language ?? movie.language ?? '—'}
          />
          <InfoRow
            label="Format"
            value={show.format ?? movie.format ?? '—'}
          />
        </Section>
      </div>

      {/* ── Seats ── */}
      <Section icon={Tag} title="Booked Seats" colorClass="text-violet-500">
        <SeatsTable seats={booking.seats ?? []} />
      </Section>

      {/* ── Payment ── */}
      <Section icon={CreditCard} title="Payment Details" colorClass="text-emerald-600">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
          <div>
            <InfoRow
              label="Total Amount"
              value={
                <span className="text-base font-bold text-slate-900">
                  {formatCurrency(booking.totalAmount ?? 0)}
                </span>
              }
            />
            <InfoRow
              label="Base Fare"
              value={formatCurrency(booking.baseFare ?? booking.subtotal ?? 0)}
            />
            <InfoRow
              label="Convenience Fee"
              value={formatCurrency(booking.convenienceFee ?? 0)}
            />
            {(booking.couponDiscount ?? 0) > 0 && (
              <InfoRow
                label="Coupon Discount"
                value={
                  <span className="text-emerald-600 font-semibold">
                    − {formatCurrency(booking.couponDiscount)}
                  </span>
                }
              />
            )}
          </div>
          <div>
            <InfoRow
              label="Payment Method"
              value={payment.method ?? booking.paymentMethod ?? '—'}
            />
            <InfoRow
              label="Gateway Ref (Razorpay)"
              value={payment.razorpayPaymentId ?? payment.gatewayRef ?? payment.transactionId ?? '—'}
              mono
            />
            <InfoRow
              label="Payment Status"
              value={<StatusBadge status={payment.status ?? booking.paymentStatus} />}
            />
            <InfoRow
              label="Payment ID"
              value={payment._id ?? '—'}
              mono
            />
          </div>
        </div>
      </Section>

      {/* ── Cancellation Info (only if cancelled) ── */}
      {booking.status === 'CANCELLED' && (
        <Section icon={XCircle} title="Cancellation Details" colorClass="text-rose-500">
          <div className="space-y-0">
            <InfoRow
              label="Cancelled At"
              value={
                booking.cancelledAt
                  ? `${formatDate(booking.cancelledAt)} at ${formatTime(booking.cancelledAt)}`
                  : '—'
              }
            />
            <InfoRow
              label="Cancellation Reason"
              value={booking.cancellationReason ?? booking.cancelReason ?? '—'}
            />
            <InfoRow
              label="Refund Status"
              value={
                <StatusBadge
                  status={booking.refundStatus ?? payment.refundStatus ?? 'REFUND_PENDING'}
                />
              }
            />
            <InfoRow
              label="Refund Amount"
              value={formatCurrency(booking.refundAmount ?? 0)}
            />
            <InfoRow
              label="Refund ID"
              value={booking.refundId ?? payment.refundId ?? '—'}
              mono
            />
          </div>
        </Section>
      )}

      {/* ── Cancel Modal ── */}
      <CancelBookingModal
        isOpen={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={(reason) => cancelMutation.mutate(reason)}
        isLoading={cancelMutation.isPending}
      />
    </div>
  );
}
