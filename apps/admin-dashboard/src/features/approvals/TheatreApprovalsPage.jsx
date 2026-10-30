import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Building2,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  Search,
  Eye,
  AlertCircle
} from 'lucide-react';
import { adminTheatresApi } from '../../services/api/admin-theatres.api';
import StatusBadge from '../../components/ui/StatusBadge';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Pagination from '../../components/ui/Pagination';
import Modal from '../../components/ui/Modal';
import { formatDate } from '../../utils/formatters';

export default function TheatreApprovalsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('PENDING_APPROVAL');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedTheatre, setSelectedTheatre] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionError, setActionError] = useState(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-theatre-approvals', statusFilter, page],
    queryFn: () => adminTheatresApi.getAllTheatres({
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      page,
      limit: 10,
    }),
  });

  const approveMutation = useMutation({
    mutationFn: (theatreId) => adminTheatresApi.approveTheatre(theatreId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-theatre-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['admin-overview-kpis'] });
    },
    onError: (err) => {
      setActionError(err.response?.data?.message || err.message || 'Failed to approve theatre');
    }
  });

  const rejectMutation = useMutation({
    mutationFn: ({ theatreId, reason }) => adminTheatresApi.rejectTheatre(theatreId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-theatre-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['admin-overview-kpis'] });
      setRejectModalOpen(false);
      setSelectedTheatre(null);
      setRejectionReason('');
    },
    onError: (err) => {
      setActionError(err.response?.data?.message || err.message || 'Failed to reject theatre');
    }
  });

  const handleApprove = (theatre) => {
    if (window.confirm(`Are you sure you want to approve "${theatre.name}" for public ticket booking?`)) {
      approveMutation.mutate(theatre._id);
    }
  };

  const handleOpenReject = (theatre) => {
    setSelectedTheatre(theatre);
    setRejectionReason('');
    setActionError(null);
    setRejectModalOpen(true);
  };

  const handleConfirmReject = () => {
    if (!rejectionReason.trim()) {
      setActionError('A valid rejection reason is mandatory for compliance documentation.');
      return;
    }
    rejectMutation.mutate({ theatreId: selectedTheatre._id, reason: rejectionReason.trim() });
  };

  const theatres = data?.theatres || [];
  const filteredTheatres = theatres.filter((t) =>
    t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.owner?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Theatre Onboarding & Compliance Approvals
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Review partner registrations, verify commercial licenses, and govern platform onboarding.
          </p>
        </div>

        {/* Quick Filter Tabs */}
        <div className="flex flex-wrap gap-2 rounded-xl bg-slate-200/80 p-1 text-xs font-semibold">
          {[
            { label: 'Pending Review', value: 'PENDING_APPROVAL' },
            { label: 'Approved', value: 'APPROVED' },
            { label: 'Rejected', value: 'REJECTED' },
            { label: 'Suspended', value: 'SUSPENDED' },
            { label: 'All', value: 'ALL' },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setStatusFilter(tab.value);
                setPage(1);
              }}
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

      {/* Global Action Error Alert */}
      {actionError && (
        <div className="flex items-center space-x-2 rounded-xl border border-rose-500/20 bg-rose-50 p-4 text-xs font-medium text-rose-800">
          <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex items-center space-x-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search theatres by exhibitor name, city, or owner..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-slate-200 pl-10 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Theatres Approvals Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : filteredTheatres.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Building2 className="h-12 w-12 text-slate-300 mb-3" />
            <h3 className="text-sm font-semibold text-slate-800">No Theatres Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              There are no theatre registrations matching the selected status filter ({statusFilter}).
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">Exhibitor / Theatre</th>
                  <th className="px-6 py-3.5">Location</th>
                  <th className="px-6 py-3.5">Owner / Contact</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Registered On</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTheatres.map((theatre) => (
                  <tr key={theatre._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{theatre.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">{theatre._id}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div>{theatre.city || 'N/A'}, {theatre.state || ''}</div>
                      <div className="text-[11px] text-slate-400">{theatre.pincode || ''}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-800">{theatre.owner?.name || 'Owner Profile'}</div>
                      <div className="text-[11px] text-slate-400">{theatre.owner?.email || theatre.contactEmail || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={theatre.status} />
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {formatDate(theatre.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Link
                          to={`/theatre-approvals/${theatre._id}`}
                          className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm"
                          title="Audit Compliance Details"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1 text-slate-500" />
                          Audit
                        </Link>

                        {theatre.status === 'PENDING_APPROVAL' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                              onClick={() => handleApprove(theatre)}
                              disabled={approveMutation.isPending}
                            >
                              <CheckCircle className="h-3.5 w-3.5 mr-1" />
                              Approve
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleOpenReject(theatre)}
                              disabled={rejectMutation.isPending}
                            >
                              <XCircle className="h-3.5 w-3.5 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data?.pagination && (
          <div className="border-t border-slate-200 px-6 py-3">
            <Pagination
              currentPage={page}
              totalPages={data.pagination.totalPages || 1}
              onPageChange={(p) => setPage(p)}
            />
          </div>
        )}
      </div>

      {/* Reject Reason Modal */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title={`Reject Theatre: ${selectedTheatre?.name || ''}`}
        size="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Please specify the compliance or documentation reason for rejecting this exhibitor registration.
            This explanation will be permanently recorded in audit logs and communicated to the theatre owner.
          </p>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Rejection Reason / Compliance Notes <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Cinema Exhibition License expired or illegible. Commercial tax certificate not provided."
              className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 placeholder-slate-400 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRejectModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleConfirmReject}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending ? 'Rejecting...' : 'Confirm Rejection'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

