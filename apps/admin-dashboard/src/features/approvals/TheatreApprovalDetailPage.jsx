import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  PauseCircle,
  PlayCircle,
  Building2,
  MapPin,
  Phone,
  Mail,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { adminTheatresApi } from '../../services/api/admin-theatres.api';
import StatusBadge from '../../components/ui/StatusBadge';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';
import { formatDate } from '../../utils/formatters';

/* ─────────────────────────────────────────────
   Small helper: labelled detail row
───────────────────────────────────────────── */
function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
      <span className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
        <Icon className="w-4 h-4 text-slate-500" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</p>
        <p className="mt-0.5 text-sm font-semibold text-slate-800 break-words">{value || '—'}</p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Reject Modal
───────────────────────────────────────────── */
function RejectModal({ isOpen, onClose, onConfirm, isLoading }) {
  const [reason, setReason] = useState('');
  const trimmed = reason.trim();

  function handleSubmit(e) {
    e.preventDefault();
    if (!trimmed) return;
    onConfirm(trimmed);
  }

  function handleClose() {
    setReason('');
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Reject Theatre Application" maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex items-start gap-3 p-3 rounded-lg bg-rose-50 border border-rose-200">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-rose-700">
            This action will reject the theatre application. The owner will be notified with your
            reason.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="reject-reason" className="text-sm font-semibold text-slate-700">
            Rejection Reason <span className="text-rose-500">*</span>
          </label>
          <textarea
            id="reject-reason"
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Describe why this application is being rejected…"
            className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent transition"
          />
          {reason.length > 0 && trimmed.length === 0 && (
            <p className="text-xs text-rose-500">Reason cannot be blank.</p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="danger"
            icon={XCircle}
            isLoading={isLoading}
            disabled={!trimmed || isLoading}
          >
            Confirm Rejection
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/* ─────────────────────────────────────────────
   Main Page
───────────────────────────────────────────── */
export default function TheatreApprovalDetailPage() {
  const { theatreId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

  /* ── Fetch ── */
  const {
    data: theatre,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['admin-theatre', theatreId],
    queryFn: () => adminTheatresApi.getTheatreById(theatreId),
    enabled: !!theatreId,
  });

  /* ── Shared invalidation helper ── */
  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['admin-theatre-approvals'] });
    queryClient.invalidateQueries({ queryKey: ['admin-theatre', theatreId] });
  }

  /* ── Approve ── */
  const approveMutation = useMutation({
    mutationFn: () => adminTheatresApi.approveTheatre(theatreId),
    onSuccess: invalidate,
  });

  /* ── Reject ── */
  const rejectMutation = useMutation({
    mutationFn: (reason) => adminTheatresApi.rejectTheatre(theatreId, reason),
    onSuccess: () => {
      setIsRejectModalOpen(false);
      invalidate();
    },
  });

  /* ── Suspend ── */
  const suspendMutation = useMutation({
    mutationFn: () => adminTheatresApi.suspendTheatre(theatreId),
    onSuccess: invalidate,
  });

  /* ── Reactivate ── */
  const reactivateMutation = useMutation({
    mutationFn: () => adminTheatresApi.reactivateTheatre(theatreId),
    onSuccess: invalidate,
  });

  const anyLoading =
    approveMutation.isPending ||
    rejectMutation.isPending ||
    suspendMutation.isPending ||
    reactivateMutation.isPending;

  /* ─────────── Render states ─────────── */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" text="Loading theatre details…" />
      </div>
    );
  }

  if (isError || !theatre) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="w-12 h-12 text-rose-400" />
        <p className="text-slate-600 text-sm font-medium">
          {error?.message || 'Failed to load theatre details.'}
        </p>
        <Button variant="outline" icon={ArrowLeft} onClick={() => navigate('/theatre-approvals')}>
          Back to Approvals
        </Button>
      </div>
    );
  }

  const status = theatre.status || '';
  const isPending = status === 'PENDING_APPROVAL';
  const isApproved = status === 'APPROVED';
  const isSuspended = status === 'SUSPENDED';

  const ownerName =
    theatre.owner?.name ||
    `${theatre.owner?.firstName ?? ''} ${theatre.owner?.lastName ?? ''}`.trim() ||
    '—';

  const fullAddress = [
    theatre.address,
    theatre.city,
    theatre.state,
    theatre.pincode,
  ]
    .filter(Boolean)
    .join(', ');

  /* ─────────── Main render ─────────── */
  return (
    <>
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* ── Back + Header ── */}
        <div className="flex items-center gap-3">
          <Link
            to="/theatre-approvals"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Theatre Approvals
          </Link>
        </div>

        {/* ── Title bar ── */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex-shrink-0 w-11 h-11 rounded-xl bg-admin-primary/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-admin-primary" />
            </span>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-slate-900 truncate">
                {theatre.name || 'Unnamed Theatre'}
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">Theatre ID: {theatreId}</p>
            </div>
          </div>
          <StatusBadge status={status} className="self-start sm:self-center flex-shrink-0" />
        </div>

        {/* ── Action Bar ── */}
        {(isPending || isApproved || isSuspended) && (
          <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50">
            <p className="text-sm font-semibold text-slate-600 mr-auto">Actions</p>

            {isPending && (
              <>
                <Button
                  variant="success"
                  icon={CheckCircle}
                  isLoading={approveMutation.isPending}
                  disabled={anyLoading}
                  onClick={() => approveMutation.mutate()}
                >
                  Approve
                </Button>
                <Button
                  variant="danger"
                  icon={XCircle}
                  disabled={anyLoading}
                  onClick={() => setIsRejectModalOpen(true)}
                >
                  Reject
                </Button>
              </>
            )}

            {isApproved && (
              <Button
                variant="outline"
                icon={PauseCircle}
                className="text-amber-700 border-amber-300 hover:bg-amber-50"
                isLoading={suspendMutation.isPending}
                disabled={anyLoading}
                onClick={() => suspendMutation.mutate()}
              >
                Suspend Theatre
              </Button>
            )}

            {isSuspended && (
              <Button
                variant="success"
                icon={PlayCircle}
                isLoading={reactivateMutation.isPending}
                disabled={anyLoading}
                onClick={() => reactivateMutation.mutate()}
              >
                Reactivate Theatre
              </Button>
            )}
          </div>
        )}

        {/* ── Mutation error banners ── */}
        {(approveMutation.isError ||
          rejectMutation.isError ||
          suspendMutation.isError ||
          reactivateMutation.isError) && (
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-rose-50 border border-rose-200">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-rose-700">
              {(
                approveMutation.error ||
                rejectMutation.error ||
                suspendMutation.error ||
                reactivateMutation.error
              )?.message || 'An error occurred. Please try again.'}
            </p>
          </div>
        )}

        {/* ── Detail Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Theatre Info */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                Theatre Information
              </h2>
            </div>
            <div className="px-5 py-1">
              <DetailRow icon={Building2} label="Theatre Name" value={theatre.name} />
              <DetailRow icon={MapPin} label="Address" value={fullAddress} />
              <DetailRow icon={MapPin} label="City" value={theatre.city} />
              <DetailRow icon={MapPin} label="State" value={theatre.state} />
              <DetailRow icon={MapPin} label="Pincode" value={theatre.pincode} />
            </div>
          </div>

          {/* Owner & Contact Info */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                Owner &amp; Contact
              </h2>
            </div>
            <div className="px-5 py-1">
              <DetailRow icon={Building2} label="Owner Name" value={ownerName} />
              <DetailRow
                icon={Mail}
                label="Owner Email"
                value={theatre.owner?.email || theatre.contactEmail}
              />
              <DetailRow
                icon={Phone}
                label="Contact Phone"
                value={theatre.contactPhone || theatre.owner?.phone}
              />
              <DetailRow
                icon={Calendar}
                label="Registered On"
                value={formatDate(theatre.createdAt)}
              />
              <DetailRow
                icon={Calendar}
                label="Last Updated"
                value={formatDate(theatre.updatedAt)}
              />
            </div>
          </div>
        </div>

        {/* ── Additional Details (full-width) ── */}
        {(theatre.totalScreens !== undefined ||
          theatre.totalSeats !== undefined ||
          theatre.gstin) && (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                Additional Details
              </h2>
            </div>
            <div className="px-5 py-1 grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
              {theatre.totalScreens !== undefined && (
                <div className="py-4 sm:px-4 first:pl-0 last:pr-0 text-center">
                  <p className="text-2xl font-bold text-slate-900">{theatre.totalScreens}</p>
                  <p className="text-xs text-slate-500 mt-0.5 uppercase tracking-wide">Screens</p>
                </div>
              )}
              {theatre.totalSeats !== undefined && (
                <div className="py-4 sm:px-4 text-center">
                  <p className="text-2xl font-bold text-slate-900">{theatre.totalSeats}</p>
                  <p className="text-xs text-slate-500 mt-0.5 uppercase tracking-wide">Total Seats</p>
                </div>
              )}
              {theatre.gstin && (
                <div className="py-4 sm:px-4 last:pr-0 text-center">
                  <p className="text-sm font-bold text-slate-900 font-mono tracking-widest">
                    {theatre.gstin}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 uppercase tracking-wide">GSTIN</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Rejection reason display (if already rejected) ── */}
        {status === 'REJECTED' && theatre.rejectionReason && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200">
            <XCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-rose-700">Rejection Reason</p>
              <p className="text-sm text-rose-600 mt-0.5">{theatre.rejectionReason}</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Reject Modal ── */}
      <RejectModal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        onConfirm={(reason) => rejectMutation.mutate(reason)}
        isLoading={rejectMutation.isPending}
      />
    </>
  );
}
