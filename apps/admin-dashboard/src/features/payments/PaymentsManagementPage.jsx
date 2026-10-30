import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  CreditCard,
  Search,
  AlertCircle,
  DollarSign,
  TrendingUp,
  RotateCcw,
  ArrowRight,
  ExternalLink,
  Info,
  Hash,
  Calendar,
  Building,
  CheckCircle2,
} from 'lucide-react';
import { adminAnalyticsApi } from '../../services/api/admin-analytics.api';
import { adminPaymentsApi } from '../../services/api/admin-payments.api';
import Button from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import StatusBadge from '../../components/ui/StatusBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import StatCard from '../../components/ui/StatCard';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';

// ─── Payment Detail Card ─────────────────────────────────────────────────────

function PaymentDetailRow({ label, value, mono = false, children }) {
  return (
    <div className="flex items-start justify-between py-3 border-b border-slate-100 last:border-0 gap-4">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 shrink-0 w-40">
        {label}
      </span>
      {children ? (
        <div className="text-xs text-slate-800 text-right">{children}</div>
      ) : (
        <span
          className={`text-xs text-right break-all ${
            mono ? 'font-mono text-slate-700 bg-slate-50 border border-slate-200 rounded px-2 py-0.5' : 'font-medium text-slate-800'
          }`}
        >
          {value || '—'}
        </span>
      )}
    </div>
  );
}

// ─── Revenue Summary Skeleton ─────────────────────────────────────────────────

function SummaryCardSkeleton() {
  return (
    <div className="bg-white border border-admin-border rounded-xl p-5 shadow-admin-card animate-pulse">
      <div className="h-3 w-24 bg-slate-200 rounded mb-4" />
      <div className="h-7 w-32 bg-slate-200 rounded" />
      <div className="h-2.5 w-20 bg-slate-100 rounded mt-2" />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PaymentsManagementPage() {
  const [paymentIdInput, setPaymentIdInput] = useState('');
  const [lookupId, setLookupId] = useState('');
  const [lookupError, setLookupError] = useState(null);

  // Revenue analytics (30-day default)
  const {
    data: revenueData,
    isLoading: revenueLoading,
    isError: revenueError,
  } = useQuery({
    queryKey: ['admin-payments-revenue', 30],
    queryFn: () => adminAnalyticsApi.getRevenue({ days: 30 }),
    staleTime: 5 * 60 * 1000,
  });

  // Individual payment lookup — only fires when lookupId is set
  const {
    data: paymentData,
    isLoading: paymentLoading,
    isError: paymentFetchError,
    error: paymentError,
    isFetching: paymentFetching,
  } = useQuery({
    queryKey: ['admin-payment-lookup', lookupId],
    queryFn: () => adminPaymentsApi.getPaymentById(lookupId),
    enabled: !!lookupId,
    retry: false,
    onError: (err) => {
      setLookupError(
        err?.response?.data?.message || err?.message || 'Payment not found or inaccessible.'
      );
    },
  });

  const handleLookup = () => {
    const trimmed = paymentIdInput.trim();
    if (!trimmed) {
      setLookupError('Please enter a valid Payment ID or Razorpay Payment ID.');
      return;
    }
    setLookupError(null);
    setLookupId(trimmed);
  };

  const handleClear = () => {
    setPaymentIdInput('');
    setLookupId('');
    setLookupError(null);
  };

  // Revenue derived values
  const gmv = revenueData?.summary?.totalRevenue ?? revenueData?.totalRevenue ?? 0;
  const captured = revenueData?.summary?.captured ?? revenueData?.captured ?? gmv;
  const refunded = revenueData?.summary?.refunded ?? revenueData?.refunded ?? 0;
  const netRevenue = captured - refunded;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* ── Page Header ── */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Payments Overview</h1>
          <p className="mt-1 text-sm text-slate-500">
            Platform-wide payment analytics and individual payment lookup via Razorpay.
          </p>
        </div>
        <Link
          to="/refunds"
          className="inline-flex items-center gap-2 rounded-lg border border-admin-border bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
          Manage Refunds
          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
        </Link>
      </div>

      {/* ── Razorpay Integration Notice ── */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 flex gap-3">
        <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-800 leading-relaxed space-y-1">
          <p className="font-semibold">Razorpay Payment Gateway Integration</p>
          <p>
            All payment processing is handled by Razorpay. Payment capture, settlement, and
            refunds are gateway-managed. Revenue figures below reflect aggregated analytics
            data from the platform's booking engine. Individual payment records can be
            queried via Payment ID using the lookup tool below.
          </p>
        </div>
      </div>

      {/* ── Revenue Summary Cards ── */}
      <div>
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">
          30-Day Revenue Summary
        </h2>

        {revenueLoading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SummaryCardSkeleton key={i} />
            ))}
          </div>
        ) : revenueError ? (
          <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            Failed to load revenue analytics. Please refresh.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total GMV"
              value={formatCurrency(gmv)}
              subtitle="Gross Merchandise Value — all ticket sales"
              icon={DollarSign}
              colorScheme="blue"
            />
            <StatCard
              title="Total Captured"
              value={formatCurrency(captured)}
              subtitle="Successfully captured payments"
              icon={CheckCircle2}
              colorScheme="emerald"
            />
            <StatCard
              title="Total Refunded"
              value={formatCurrency(refunded)}
              subtitle="Amount returned to customers"
              icon={RotateCcw}
              colorScheme="red"
            />
            <StatCard
              title="Net Revenue"
              value={formatCurrency(netRevenue)}
              subtitle="Captured minus refunded"
              icon={TrendingUp}
              colorScheme="purple"
            />
          </div>
        )}
      </div>

      {/* ── Payment Lookup Tool ── */}
      <div className="rounded-xl border border-admin-border bg-white shadow-admin-card overflow-hidden">
        <div className="border-b border-admin-border px-6 py-4 bg-slate-50/70 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-50 border border-indigo-100">
            <Search className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Manual Payment Lookup</h2>
            <p className="text-xs text-slate-500">
              Enter a Razorpay Payment ID or internal payment reference to retrieve details.
            </p>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Search Row */}
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <Input
                label="Payment ID"
                placeholder="e.g. pay_PXTzAbcDef1234 or internal ID"
                icon={Hash}
                value={paymentIdInput}
                onChange={(e) => {
                  setPaymentIdInput(e.target.value);
                  if (lookupError) setLookupError(null);
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                error={lookupError && !paymentData ? lookupError : undefined}
              />
            </div>
            <Button
              variant="primary"
              icon={Search}
              onClick={handleLookup}
              isLoading={paymentLoading || paymentFetching}
              disabled={!paymentIdInput.trim()}
              className="shrink-0"
            >
              Lookup Payment
            </Button>
            {lookupId && (
              <Button variant="outline" onClick={handleClear} className="shrink-0">
                Clear
              </Button>
            )}
          </div>

          {/* Lookup Error */}
          {(paymentFetchError || (lookupError && lookupId)) && !paymentData && (
            <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>
                {lookupError ||
                  paymentError?.response?.data?.message ||
                  paymentError?.message ||
                  'Payment not found.'}
              </span>
            </div>
          )}

          {/* Payment Details */}
          {paymentData && !paymentLoading && (
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              {/* Detail Header */}
              <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  <CreditCard className="w-4 h-4 text-indigo-600" />
                  <span className="text-sm font-bold text-slate-900">Payment Record</span>
                </div>
                <StatusBadge status={paymentData.status} />
              </div>

              {/* Detail Rows */}
              <div className="px-5 py-1 bg-white">
                <PaymentDetailRow
                  label="Payment ID"
                  value={paymentData.paymentId || paymentData._id}
                  mono
                />
                <PaymentDetailRow
                  label="Razorpay Order ID"
                  value={paymentData.razorpayOrderId || paymentData.orderId || paymentData.gateway?.orderId}
                  mono
                />
                <PaymentDetailRow label="Status">
                  <StatusBadge status={paymentData.status} />
                </PaymentDetailRow>
                <PaymentDetailRow
                  label="Amount"
                  value={formatCurrency(
                    paymentData.amount != null
                      ? paymentData.amount / 100 // Razorpay amounts are in paise
                      : paymentData.totalAmount ?? 0
                  )}
                />
                <PaymentDetailRow
                  label="Currency"
                  value={paymentData.currency || 'INR'}
                />
                <PaymentDetailRow
                  label="Booking Reference"
                  value={
                    paymentData.bookingReference ||
                    paymentData.booking?.bookingReference ||
                    paymentData.bookingId ||
                    '—'
                  }
                  mono
                />
                <PaymentDetailRow
                  label="Gateway"
                  value={paymentData.gateway?.name || 'Razorpay'}
                />
                <PaymentDetailRow
                  label="Created At"
                  value={formatDateTime(paymentData.createdAt)}
                />
                {paymentData.capturedAt && (
                  <PaymentDetailRow
                    label="Captured At"
                    value={formatDateTime(paymentData.capturedAt)}
                  />
                )}
                {paymentData.refundedAt && (
                  <PaymentDetailRow
                    label="Refunded At"
                    value={formatDateTime(paymentData.refundedAt)}
                  />
                )}
              </div>

              {/* Refund CTA */}
              {(paymentData.status === 'CAPTURED' || paymentData.status === 'captured') && (
                <div className="px-5 py-3.5 bg-amber-50 border-t border-amber-100 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-amber-800">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    This payment is captured and eligible for refund initiation.
                  </div>
                  <Link
                    to="/refunds"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 transition-colors shadow-sm"
                  >
                    Initiate Refund
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Empty state when no lookup done */}
          {!lookupId && !paymentLoading && (
            <div className="flex flex-col items-center justify-center py-10 gap-3 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <CreditCard className="w-10 h-10 text-slate-300" />
              <div>
                <p className="text-sm font-semibold text-slate-600">No Payment Looked Up</p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  Enter a Razorpay Payment ID above and click "Lookup Payment" to retrieve
                  its full details from the platform.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Important Notes ── */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <h3 className="text-sm font-bold text-amber-900">Razorpay Integration Notes</h3>
        </div>
        <ul className="space-y-2 text-xs text-amber-800 list-disc list-inside leading-relaxed">
          <li>
            Payment capture is fully managed by the Razorpay gateway. The platform receives
            webhook events for status updates — no manual capture is available from this dashboard.
          </li>
          <li>
            Revenue analytics are aggregated from platform booking records and may have a short
            delay compared to real-time Razorpay settlement reports.
          </li>
          <li>
            For detailed transaction-level reports and settlement reconciliation, use the{' '}
            <strong>Razorpay Dashboard</strong> directly.
          </li>
          <li>
            Refund initiation is available through the{' '}
            <Link to="/refunds" className="font-semibold underline hover:text-amber-900">
              Refunds Management
            </Link>{' '}
            page and processed via the Razorpay API.
          </li>
          <li>
            Payment IDs follow Razorpay's format:{' '}
            <code className="bg-amber-100 border border-amber-200 rounded px-1 py-0.5 font-mono text-[11px]">
              pay_XXXXXXXXXXXX
            </code>
            . Order IDs use:{' '}
            <code className="bg-amber-100 border border-amber-200 rounded px-1 py-0.5 font-mono text-[11px]">
              order_XXXXXXXXXXXX
            </code>
            .
          </li>
        </ul>
      </div>

      {/* ── Quick Links ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link
          to="/refunds"
          className="flex items-center gap-3 rounded-xl border border-admin-border bg-white p-4 hover:bg-slate-50 transition-colors shadow-admin-card group"
        >
          <div className="p-2 rounded-lg bg-rose-50 border border-rose-100 group-hover:bg-rose-100 transition-colors">
            <RotateCcw className="w-4 h-4 text-rose-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-900">Refunds Management</p>
            <p className="text-[11px] text-slate-500">Initiate and track refunds</p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-300 ml-auto group-hover:text-slate-500 transition-colors" />
        </Link>

        <Link
          to="/commissions"
          className="flex items-center gap-3 rounded-xl border border-admin-border bg-white p-4 hover:bg-slate-50 transition-colors shadow-admin-card group"
        >
          <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-100 group-hover:bg-emerald-100 transition-colors">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-900">Commission Settings</p>
            <p className="text-[11px] text-slate-500">Platform take-rate & settlements</p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-300 ml-auto group-hover:text-slate-500 transition-colors" />
        </Link>

        <Link
          to="/bookings"
          className="flex items-center gap-3 rounded-xl border border-admin-border bg-white p-4 hover:bg-slate-50 transition-colors shadow-admin-card group"
        >
          <div className="p-2 rounded-lg bg-indigo-50 border border-indigo-100 group-hover:bg-indigo-100 transition-colors">
            <Building className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-900">Bookings</p>
            <p className="text-[11px] text-slate-500">All customer booking records</p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-300 ml-auto group-hover:text-slate-500 transition-colors" />
        </Link>
      </div>
    </div>
  );
}
