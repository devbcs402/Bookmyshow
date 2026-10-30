import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Building2,
  MapPin,
  Phone,
  Users,
  Layers,
  CheckCircle,
  PauseCircle,
  PlayCircle,
  XCircle,
  AlertCircle,
  Calendar,
  Mail,
  LayoutGrid,
} from 'lucide-react';
import { adminTheatresApi } from '../../services/api/admin-theatres.api';
import StatusBadge from '../../components/ui/StatusBadge';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';
import { formatDate } from '../../utils/formatters';

// ─── Small helper: Info Card ──────────────────────────────────────────────────
function InfoCard({ icon: Icon, label, children, iconColor = 'text-indigo-400', bgColor = 'bg-indigo-50' }) {
  return (
    <div className="flex items-start gap-3.5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-100 ${bgColor}`}>
        <Icon className={`h-4.5 w-4.5 ${iconColor}`} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">{label}</p>
        <div className="text-sm font-medium text-slate-800 leading-snug">{children}</div>
      </div>
    </div>
  );
}

// ─── Branch Status indicator ──────────────────────────────────────────────────
function BranchRow({ branch }) {
  return (
    <tr className="hover:bg-slate-50/70 transition-colors">
      <td className="px-5 py-3.5">
        <p className="font-semibold text-slate-900 text-xs">{branch.name || '—'}</p>
        <p className="text-[11px] font-mono text-slate-400 mt-0.5 truncate max-w-[180px]">{branch._id}</p>
      </td>
      <td className="px-5 py-3.5 text-xs text-slate-600">
        {branch.city || '—'}{branch.state ? `, ${branch.state}` : ''}
      </td>
      <td className="px-5 py-3.5 text-center">
        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
          <LayoutGrid className="h-3 w-3" />
          {branch.totalScreens ?? branch.screens?.length ?? '—'}
        </span>
      </td>
      <td className="px-5 py-3.5">
        <StatusBadge status={branch.status} />
      </td>
    </tr>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TheatreDetailPage() {
  const { theatreId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // ─── Local state ─────────────────────────────────────────────────────────────
  const [actionError, setActionError] = useState(null);
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [confirmModal, setConfirmModal] = useState({ open: false, type: null });

  // ─── Fetch theatre ────────────────────────────────────────────────────────────
  const {
    data: theatre,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['admin-theatre-detail', theatreId],
    queryFn: () => adminTheatresApi.getTheatreById(theatreId),
    enabled: !!theatreId,
  });

  // ─── Fetch branches (fail gracefully) ────────────────────────────────────────
  const { data: branchesData } = useQuery({
    queryKey: ['admin-theatre-branches', theatreId],
    queryFn: () => adminTheatresApi.getBranches(theatreId),
    enabled: !!theatreId,
    retry: false,
    // Silently fail — branches endpoint may not exist for all theatres
    onError: () => {},
  });

  const branches = Array.isArray(branchesData)
    ? branchesData
    : branchesData?.branches ?? [];

  // ─── Approve mutation ─────────────────────────────────────────────────────────
  const approveMutation = useMutation({
    mutationFn: () => adminTheatresApi.approveTheatre(theatreId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-theatre-detail', theatreId] });
      queryClient.invalidateQueries({ queryKey: ['admin-theatres-management'] });
      queryClient.invalidateQueries({ queryKey: ['admin-theatre-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['admin-overview-kpis'] });
    },
    onError: (err) =>
      setActionError(err.response?.data?.message || err.message || 'Failed to approve theatre.'),
  });

  // ─── Reject mutation ──────────────────────────────────────────────────────────
  const rejectMutation = useMutation({
    mutationFn: (reason) => adminTheatresApi.rejectTheatre(theatreId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-theatre-detail', theatreId] });
      queryClient.invalidateQueries({ queryKey: ['admin-theatres-management'] });
      queryClient.invalidateQueries({ queryKey: ['admin-theatre-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['admin-overview-kpis'] });
      setRejectModal(false);
      setRejectionReason('');
    },
    onError: (err) =>
      setActionError(err.response?.data?.message || err.message || 'Failed to reject theatre.'),
  });

  // ─── Suspend mutation ─────────────────────────────────────────────────────────
  const suspendMutation = useMutation({
    mutationFn: () => adminTheatresApi.suspendTheatre(theatreId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-theatre-detail', theatreId] });
      queryClient.invalidateQueries({ queryKey: ['admin-theatres-management'] });
      closeConfirmModal();
    },
    onError: (err) =>
      setActionError(err.response?.data?.message || err.message || 'Failed to suspend theatre.'),
  });

  // ─── Reactivate mutation ──────────────────────────────────────────────────────
  const reactivateMutation = useMutation({
    mutationFn: () => adminTheatresApi.reactivateTheatre(theatreId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-theatre-detail', theatreId] });
      queryClient.invalidateQueries({ queryKey: ['admin-theatres-management'] });
      closeConfirmModal();
    },
    onError: (err) =>
      setActionError(err.response?.data?.message || err.message || 'Failed to reactivate theatre.'),
  });

  const isAnyPending =
    approveMutation.isPending ||
    rejectMutation.isPending ||
    suspendMutation.isPending ||
    reactivateMutation.isPending;

  // ─── Handlers ─────────────────────────────────────────────────────────────────
  const openConfirmModal = (type) => {
    setActionError(null);
    setConfirmModal({ open: true, type });
  };

  const closeConfirmModal = () => {
    setConfirmModal({ open: false, type: null });
  };

  const handleConfirmAction = () => {
    if (confirmModal.type === 'suspend') suspendMutation.mutate();
    else if (confirmModal.type === 'reactivate') reactivateMutation.mutate();
  };

  const handleApprove = () => {
    setActionError(null);
    if (window.confirm(`Approve "${theatre?.name}" for public ticket booking?`)) {
      approveMutation.mutate();
    }
  };

  const handleOpenRejectModal = () => {
    setRejectionReason('');
    setActionError(null);
    setRejectModal(true);
  };

  const handleConfirmReject = () => {
    if (!rejectionReason.trim()) {
      setActionError('A rejection reason is required for compliance records.');
      return;
    }
    rejectMutation.mutate(rejectionReason.trim());
  };

  // ─── Loading State ────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner size="lg" text="Loading theatre details…" />
      </div>
    );
  }

  // ─── Error State ──────────────────────────────────────────────────────────────
  if (isError || !theatre) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
        <AlertCircle className="h-14 w-14 text-rose-200" />
        <div>
          <p className="text-base font-semibold text-slate-700">Theatre Not Found</p>
          <p className="mt-1 text-xs text-slate-400 max-w-sm">
            {error?.response?.data?.message || error?.message || 'This theatre could not be loaded.'}
          </p>
        </div>
        <Button variant="outline" size="sm" icon={ArrowLeft} onClick={() => navigate('/theatres')}>
          Back to Theatres
        </Button>
      </div>
    );
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────
  const address = [
    theatre.address,
    theatre.city,
    theatre.state,
    theatre.pincode,
  ]
    .filter(Boolean)
    .join(', ');

  // ─── Main Render ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Back Button ── */}
      <div>
        <Link
          to="/theatres"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Theatres
        </Link>
      </div>

      {/* ── Title & Actions Bar ── */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5 min-w-0">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-100 border border-indigo-200">
            <Building2 className="h-5 w-5 text-indigo-600" />
          </span>
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 truncate">
              {theatre.name}
            </h1>
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              <StatusBadge status={theatre.status} />
              <span className="text-[11px] font-mono text-slate-400">{theatre._id}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons — contextual based on status */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {theatre.status === 'PENDING_APPROVAL' && (
            <>
              <Button
                variant="success"
                size="sm"
                icon={CheckCircle}
                onClick={handleApprove}
                disabled={isAnyPending}
                isLoading={approveMutation.isPending}
              >
                Approve
              </Button>
              <Button
                variant="danger"
                size="sm"
                icon={XCircle}
                onClick={handleOpenRejectModal}
                disabled={isAnyPending}
              >
                Reject
              </Button>
            </>
          )}

          {theatre.status === 'APPROVED' && (
            <Button
              variant="outline"
              size="sm"
              icon={PauseCircle}
              className="border-amber-200 text-amber-700 hover:bg-amber-50"
              onClick={() => openConfirmModal('suspend')}
              disabled={isAnyPending}
            >
              Suspend Theatre
            </Button>
          )}

          {theatre.status === 'SUSPENDED' && (
            <Button
              variant="outline"
              size="sm"
              icon={PlayCircle}
              className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              onClick={() => openConfirmModal('reactivate')}
              disabled={isAnyPending}
            >
              Reactivate Theatre
            </Button>
          )}
        </div>
      </div>

      {/* ── Action Error Alert ── */}
      {actionError && (
        <div className="flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-800">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
          <span>{actionError}</span>
          <button
            onClick={() => setActionError(null)}
            className="ml-auto text-rose-400 hover:text-rose-700"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Info Cards Grid ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Address */}
        <InfoCard
          icon={MapPin}
          label="Address"
          iconColor="text-rose-400"
          bgColor="bg-rose-50"
        >
          {address || <span className="text-slate-400">Not provided</span>}
        </InfoCard>

        {/* Contact */}
        <InfoCard
          icon={Phone}
          label="Contact"
          iconColor="text-sky-400"
          bgColor="bg-sky-50"
        >
          <div className="space-y-0.5">
            {theatre.contactPhone && (
              <p>{theatre.contactPhone}</p>
            )}
            {(theatre.contactEmail || theatre.owner?.email) && (
              <p className="flex items-center gap-1 text-slate-500">
                <Mail className="h-3 w-3" />
                <span className="text-xs">{theatre.contactEmail || theatre.owner?.email}</span>
              </p>
            )}
            {!theatre.contactPhone && !theatre.contactEmail && !theatre.owner?.email && (
              <span className="text-slate-400">Not provided</span>
            )}
          </div>
        </InfoCard>

        {/* Owner */}
        <InfoCard
          icon={Users}
          label="Owner"
          iconColor="text-violet-400"
          bgColor="bg-violet-50"
        >
          <div className="space-y-0.5">
            <p>{theatre.owner?.name || '—'}</p>
            {theatre.owner?.email && (
              <p className="text-xs text-slate-500">{theatre.owner.email}</p>
            )}
          </div>
        </InfoCard>

        {/* Created Date */}
        <InfoCard
          icon={Calendar}
          label="Registered On"
          iconColor="text-emerald-400"
          bgColor="bg-emerald-50"
        >
          {formatDate(theatre.createdAt)}
          {theatre.updatedAt && theatre.updatedAt !== theatre.createdAt && (
            <p className="text-xs text-slate-400 mt-0.5">
              Updated {formatDate(theatre.updatedAt)}
            </p>
          )}
        </InfoCard>
      </div>

      {/* ── Extra Details Row ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Screens Count */}
        <div className="flex items-center gap-3.5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-100 bg-indigo-50">
            <Layers className="h-4.5 w-4.5 text-indigo-400" />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Screens</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {theatre.totalScreens ?? theatre.screens?.length ?? '—'}
            </p>
          </div>
        </div>

        {/* Total Branches */}
        <div className="flex items-center gap-3.5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-100 bg-purple-50">
            <Building2 className="h-4.5 w-4.5 text-purple-400" />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Branches</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{branches.length}</p>
          </div>
        </div>

        {/* Status summary */}
        <div className="flex items-center gap-3.5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-100 bg-slate-50">
            <CheckCircle className="h-4.5 w-4.5 text-slate-400" />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Venue Status</p>
            <div className="mt-1">
              <StatusBadge status={theatre.status} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Branches Table (if any) ── */}
      {branches.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-2.5 border-b border-slate-200 px-5 py-4">
            <Building2 className="h-4.5 w-4.5 text-indigo-400" />
            <h2 className="text-sm font-bold text-slate-900">
              Branches
              <span className="ml-2 inline-flex items-center rounded-full bg-indigo-50 border border-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-600">
                {branches.length}
              </span>
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Branch Name</th>
                  <th className="px-5 py-3.5">City</th>
                  <th className="px-5 py-3.5 text-center">Screens</th>
                  <th className="px-5 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {branches.map((branch) => (
                  <BranchRow key={branch._id} branch={branch} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Reject Modal ── */}
      <Modal
        isOpen={rejectModal}
        onClose={() => setRejectModal(false)}
        title={`Reject Theatre: ${theatre.name}`}
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Specify the compliance or documentation reason for this rejection. This will be permanently
            recorded in audit logs and communicated to the theatre owner.
          </p>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Rejection Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Cinema Exhibition License expired or illegible. Commercial tax certificate not provided."
              className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 placeholder-slate-400 focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400"
            />
          </div>

          {actionError && (
            <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {actionError}
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRejectModal(false)}
              disabled={rejectMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              icon={XCircle}
              isLoading={rejectMutation.isPending}
              onClick={handleConfirmReject}
            >
              Confirm Rejection
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Suspend / Reactivate Confirm Modal ── */}
      <Modal
        isOpen={confirmModal.open}
        onClose={closeConfirmModal}
        title={confirmModal.type === 'suspend' ? 'Suspend Theatre' : 'Reactivate Theatre'}
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <Building2 className="h-5 w-5 shrink-0 text-indigo-400" />
            <div>
              <p className="text-sm font-semibold text-slate-900">{theatre.name}</p>
              <p className="text-xs text-slate-500">{theatre.city}{theatre.state ? `, ${theatre.state}` : ''}</p>
            </div>
          </div>

          {confirmModal.type === 'suspend' ? (
            <p className="text-xs text-slate-600 leading-relaxed">
              Suspending this theatre will immediately halt all active shows and ticket sales.
              The owner will be notified. You can reactivate at any time.
            </p>
          ) : (
            <p className="text-xs text-slate-600 leading-relaxed">
              Reactivating this theatre will restore operational status and allow shows and ticket
              sales to resume. Ensure all compliance requirements have been met.
            </p>
          )}

          {actionError && (
            <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {actionError}
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={closeConfirmModal}
              disabled={isAnyPending}
            >
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
