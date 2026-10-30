import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  Plus,
  DollarSign,
  Send,
  AlertTriangle,
  Clock,
  Film,
  Tv,
  Layers,
  CalendarDays
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { showsApi } from '../../services/api/shows.api';
import { formatDate, formatTime } from '../../utils/formatters';
import { useAuthStore, Permissions } from '../../store/auth.store';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Input from '../../components/ui/Input';

export function ShowsPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuthStore();
  const [statusFilter, setStatusFilter] = useState('');
  const [cancelTargetShow, setCancelTargetShow] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [rescheduleTargetShow, setRescheduleTargetShow] = useState(null);
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [actionError, setActionError] = useState('');

  const { data: showsData, isLoading } = useQuery({
    queryKey: ['partnerShows', statusFilter],
    queryFn: () => showsApi.getShows({ status: statusFilter || undefined, limit: 100 })
  });

  const shows = Array.isArray(showsData)
    ? showsData
    : showsData?.shows || [];

  // Mutations
  const publishMutation = useMutation({
    mutationFn: (showId) => showsApi.publishShow(showId),
    onSuccess: () => {
      queryClient.invalidateQueries(['partnerShows']);
      setActionError('');
    },
    onError: (err) => {
      setActionError(err.response?.data?.message || 'Failed to publish show. Ensure pricing is configured.');
    }
  });

  const cancelMutation = useMutation({
    mutationFn: ({ showId, reason }) => showsApi.cancelShow(showId, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries(['partnerShows']);
      setCancelTargetShow(null);
      setCancelReason('');
      setActionError('');
    },
    onError: (err) => {
      setActionError(err.response?.data?.message || 'Failed to cancel show.');
    }
  });

  const rescheduleMutation = useMutation({
    mutationFn: ({ showId, startTime }) =>
      showsApi.rescheduleShow(showId, { startTime }),
    onSuccess: () => {
      queryClient.invalidateQueries(['partnerShows']);
      setRescheduleTargetShow(null);
      setRescheduleTime('');
      setActionError('');
    },
    onError: (err) => {
      setActionError(err.response?.data?.message || 'Rescheduling conflict detected.');
    }
  });

  const columns = [
    {
      title: 'Movie Title',
      key: 'movieTitle',
      render: (row) => (
        <div>
          <span className="font-bold text-white">
            {row.movieTitle || row.movieId?.title || 'Untitled Movie'}
          </span>
          <p className="text-[11px] text-slate-400">
            {row.language || 'Hindi'} • {row.format || '2D'}
          </p>
        </div>
      )
    },
    {
      title: 'Auditorium',
      key: 'screenName',
      render: (row) => (
        <span className="text-slate-300">
          {row.screenName || row.screenId?.name || 'Screen 1'}
        </span>
      )
    },
    {
      title: 'Schedule Window',
      key: 'startTime',
      render: (row) => (
        <div className="text-xs">
          <p className="text-white font-medium">{formatDate(row.startTime)}</p>
          <p className="text-slate-400">
            {formatTime(row.startTime)} - {formatTime(row.endTime)}
          </p>
        </div>
      )
    },
    {
      title: 'Status',
      key: 'status',
      render: (row) => <StatusBadge status={row.status} />
    },
    {
      title: 'Actions',
      key: 'actions',
      className: 'text-right',
      render: (row) => {
        const id = row._id || row.id;
        const isDraft = row.status === 'DRAFT';
        const isPublished = row.status === 'PUBLISHED';

        return (
          <div className="flex items-center justify-end gap-2 text-xs">
            {/* Show Pricing Link */}
            <Link
              to={`/shows/${id}/pricing`}
              className="p-1.5 rounded-lg bg-cinema-dark border border-cinema-border hover:bg-cinema-elevated text-amber-400 font-semibold flex items-center gap-1"
              title="Configure Seat Tier Pricing"
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Pricing</span>
            </Link>

            {/* Publish Action (for drafts) */}
            {isDraft && hasPermission(Permissions.SHOW_UPDATE) && (
              <Button
                size="sm"
                variant="secondary"
                icon={Send}
                className="py-1 px-2.5 text-xs"
                onClick={() => publishMutation.mutate(id)}
                isLoading={publishMutation.isPending}
              >
                Publish
              </Button>
            )}

            {/* Reschedule Action */}
            {(isDraft || isPublished) && hasPermission(Permissions.SHOW_UPDATE) && (
              <button
                onClick={() => {
                  setRescheduleTargetShow(row);
                  setRescheduleTime(row.startTime ? new Date(row.startTime).toISOString().slice(0, 16) : '');
                }}
                className="p-1.5 rounded-lg hover:bg-cinema-elevated text-slate-400 hover:text-white"
                title="Reschedule Show Time"
              >
                <Clock className="w-4 h-4" />
              </button>
            )}

            {/* Cancel Show Action */}
            {isPublished && hasPermission(Permissions.SHOW_UPDATE) && (
              <button
                onClick={() => {
                  setCancelTargetShow(row);
                  setCancelReason('Operational scheduling adjustment');
                }}
                className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-400"
                title="Cancel Show & Refund Customers"
              >
                <AlertTriangle className="w-4 h-4" />
              </button>
            )}
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-cinema-border">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Show Scheduling Management</h1>
          <p className="text-xs text-slate-400 mt-1">
            Program daily screenings, conflict validation, dynamic pricing, and admissions
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/shows/calendar">
            <Button variant="outline" size="md" icon={CalendarDays}>
              Timeline Calendar
            </Button>
          </Link>

          {hasPermission(Permissions.SHOW_CREATE) && (
            <Link to="/shows/create">
              <Button icon={Plus} variant="primary">
                Schedule New Show
              </Button>
            </Link>
          )}
        </div>
      </div>

      {actionError && (
        <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium flex items-center justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError('')}>✕</button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-2">Status:</span>
        {['', 'PUBLISHED', 'DRAFT', 'RUNNING', 'COMPLETED', 'CANCELLED'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === st
                ? 'bg-partner-600 text-white font-semibold'
                : 'bg-cinema-card border border-cinema-border text-slate-400 hover:text-white'
            }`}
          >
            {st || 'All Shows'}
          </button>
        ))}
      </div>

      {/* Table of Shows */}
      <DataTable
        columns={columns}
        data={shows}
        isLoading={isLoading}
        emptyMessage="No scheduled shows found matching the selected filters."
      />

      {/* Reschedule Modal */}
      <Modal
        isOpen={!!rescheduleTargetShow}
        onClose={() => setRescheduleTargetShow(null)}
        title="Reschedule Screening"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-400">
            Rescheduling checks for hardware conflicts and screen availability automatically.
          </p>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              New Start Date & Time
            </label>
            <input
              type="datetime-local"
              value={rescheduleTime}
              onChange={(e) => setRescheduleTime(e.target.value)}
              className="w-full bg-cinema-dark border border-cinema-border rounded-lg px-3 py-2 text-sm text-white"
            />
          </div>

          <div className="pt-4 border-t border-cinema-border flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={() => setRescheduleTargetShow(null)}>
              Cancel
            </Button>
            <Button
              variant="secondary"
              isLoading={rescheduleMutation.isPending}
              onClick={() =>
                rescheduleMutation.mutate({
                  showId: rescheduleTargetShow._id || rescheduleTargetShow.id,
                  startTime: new Date(rescheduleTime).toISOString()
                })
              }
            >
              Confirm Reschedule
            </Button>
          </div>
        </div>
      </Modal>

      {/* Cancel Show Dialog */}
      <Modal
        isOpen={!!cancelTargetShow}
        onClose={() => setCancelTargetShow(null)}
        title="Cancel Screening & Issue Refunds"
      >
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            <p className="font-bold">Cancellation Policy Notice:</p>
            <p className="mt-1">
              Cancelling a published show automatically flags all confirmed customer bookings for immediate
              100% automated refund processing through the payment gateway.
            </p>
          </div>

          <Input
            label="Cancellation Justification / Public Notice"
            placeholder="e.g. Auditorium projector technical fault"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />

          <div className="pt-4 border-t border-cinema-border flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={() => setCancelTargetShow(null)}>
              Abort
            </Button>
            <Button
              variant="danger"
              isLoading={cancelMutation.isPending}
              onClick={() =>
                cancelMutation.mutate({
                  showId: cancelTargetShow._id || cancelTargetShow.id,
                  reason: cancelReason
                })
              }
            >
              Cancel Show & Refund
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default ShowsPage;

