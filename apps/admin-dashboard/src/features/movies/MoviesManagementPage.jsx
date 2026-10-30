import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Film,
  Search,
  CheckCircle,
  XCircle,
  Eye,
  AlertCircle,
  ImageOff,
  Clock,
} from 'lucide-react';
import { adminMoviesApi } from '../../services/api/admin-movies.api';
import StatusBadge from '../../components/ui/StatusBadge';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Pagination from '../../components/ui/Pagination';
import Modal from '../../components/ui/Modal';
import { formatDate, formatDuration } from '../../utils/formatters';

const STATUS_TABS = [
  { label: 'All', value: 'ALL' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Pending Approval', value: 'PENDING_APPROVAL' },
  { label: 'Published', value: 'PUBLISHED' },
  { label: 'Archived', value: 'ARCHIVED' },
];

const PAGE_LIMIT = 12;

function PosterThumb({ src, alt }) {
  const [errored, setErrored] = useState(false);
  if (!src || errored) {
    return (
      <div className="w-10 h-14 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
        <ImageOff className="w-4 h-4 text-slate-400" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setErrored(true)}
      className="w-10 h-14 rounded-md object-cover border border-slate-200 shrink-0"
    />
  );
}

export default function MoviesManagementPage() {
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  const [actionError, setActionError] = useState(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const queryParams = {
    page,
    limit: PAGE_LIMIT,
    ...(statusFilter !== 'ALL' && { status: statusFilter }),
    ...(searchTerm && { search: searchTerm }),
  };

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-movies-list', statusFilter, page, searchTerm],
    queryFn: () => adminMoviesApi.getAllMovies(queryParams),
    keepPreviousData: true,
  });

  const approveMutation = useMutation({
    mutationFn: (movieId) => adminMoviesApi.approveMovie(movieId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-movies-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-movie-approvals'] });
      setActionError(null);
    },
    onError: (err) => {
      setActionError(err.response?.data?.message || err.message || 'Failed to approve movie.');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ movieId, reason }) => adminMoviesApi.rejectMovie(movieId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-movies-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-movie-approvals'] });
      setRejectModalOpen(false);
      setSelectedMovie(null);
      setRejectionReason('');
      setReasonError('');
      setActionError(null);
    },
    onError: (err) => {
      setActionError(err.response?.data?.message || err.message || 'Failed to reject movie.');
    },
  });

  const handleApprove = useCallback(
    (movie) => {
      setActionError(null);
      approveMutation.mutate(movie._id);
    },
    [approveMutation]
  );

  const handleOpenReject = useCallback((movie) => {
    setSelectedMovie(movie);
    setRejectionReason('');
    setReasonError('');
    setActionError(null);
    setRejectModalOpen(true);
  }, []);

  const handleConfirmReject = useCallback(() => {
    if (!rejectionReason.trim()) {
      setReasonError('A rejection reason is mandatory for compliance records.');
      return;
    }
    rejectMutation.mutate({ movieId: selectedMovie._id, reason: rejectionReason.trim() });
  }, [rejectionReason, selectedMovie, rejectMutation]);

  const movies = data?.movies || [];
  const pagination = data?.pagination || null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Movies Catalog</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage all movies on the platform — review, approve, or reject submissions.
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap gap-1.5 rounded-xl bg-slate-200/80 p-1 text-xs font-semibold">
          {STATUS_TABS.map((tab) => (
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

      {/* Action Error */}
      {actionError && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-800">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{actionError}</span>
          <button
            onClick={() => setActionError(null)}
            className="ml-auto text-rose-500 hover:text-rose-700 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="flex items-center rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search movies by title, language, or genre..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full rounded-lg border border-slate-200 pl-10 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-admin-primary focus:outline-none focus:ring-1 focus:ring-admin-primary"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex h-72 items-center justify-center">
            <LoadingSpinner size="lg" text="Loading movies catalog..." />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <AlertCircle className="h-10 w-10 text-rose-400" />
            <p className="text-sm font-semibold text-slate-700">Failed to load movies</p>
            <p className="text-xs text-slate-500 max-w-sm">
              {error?.response?.data?.message || error?.message || 'An unexpected error occurred.'}
            </p>
          </div>
        ) : movies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <Film className="h-12 w-12 text-slate-300" />
            <h3 className="text-sm font-semibold text-slate-800">No Movies Found</h3>
            <p className="text-xs text-slate-500 max-w-sm">
              No movies match the current filter
              {statusFilter !== 'ALL' ? ` (${statusFilter})` : ''}.
              {searchTerm && ` Search: "${searchTerm}"`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Poster</th>
                  <th className="px-5 py-3.5">Title</th>
                  <th className="px-5 py-3.5">Language</th>
                  <th className="px-5 py-3.5">Genre</th>
                  <th className="px-5 py-3.5">Duration</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Release Date</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movies.map((movie) => (
                  <tr key={movie._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5">
                      <PosterThumb src={movie.posterUrl || movie.poster} alt={movie.title} />
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-900 max-w-[180px] truncate">
                        {movie.title}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5 truncate max-w-[180px]">
                        {movie._id}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-700">
                      {movie.language || '-'}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap gap-1 max-w-[140px]">
                        {(movie.genres || movie.genre
                          ? Array.isArray(movie.genres || movie.genre)
                            ? (movie.genres || movie.genre)
                            : [(movie.genres || movie.genre)]
                          : []
                        )
                          .slice(0, 2)
                          .map((g) => (
                            <span
                              key={g}
                              className="inline-block rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 text-[10px] font-semibold"
                            >
                              {g}
                            </span>
                          ))}
                        {((movie.genres || movie.genre)
                          ? (Array.isArray(movie.genres || movie.genre)
                              ? (movie.genres || movie.genre)
                              : [(movie.genres || movie.genre)])
                          : []
                        ).length > 2 && (
                          <span className="inline-block rounded-full bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 text-[10px] font-semibold">
                            +
                            {((movie.genres || movie.genre)
                              ? (Array.isArray(movie.genres || movie.genre)
                                  ? (movie.genres || movie.genre)
                                  : [(movie.genres || movie.genre)])
                              : []
                            ).length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1 text-slate-600">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {formatDuration(movie.duration || movie.durationMinutes)}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={movie.status} />
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">
                      {formatDate(movie.releaseDate)}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/movies/${movie._id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5 text-slate-500" />
                          View
                        </Link>

                        {movie.status === 'PENDING_APPROVAL' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                              onClick={() => handleApprove(movie)}
                              isLoading={
                                approveMutation.isPending &&
                                approveMutation.variables === movie._id
                              }
                              disabled={approveMutation.isPending || rejectMutation.isPending}
                            >
                              <CheckCircle className="h-3.5 w-3.5 mr-1" />
                              Approve
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleOpenReject(movie)}
                              disabled={approveMutation.isPending || rejectMutation.isPending}
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
        {pagination && (
          <Pagination
            currentPage={page}
            totalPages={pagination.totalPages || 1}
            totalItems={pagination.totalItems || pagination.total}
            pageSize={PAGE_LIMIT}
            onPageChange={(p) => setPage(p)}
          />
        )}
      </div>

      {/* Reject Reason Modal */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => {
          setRejectModalOpen(false);
          setReasonError('');
        }}
        title={`Reject Movie: ${selectedMovie?.title || ''}`}
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Specify a clear reason for rejecting this movie. The reason will be recorded in the
            audit trail and communicated to the content team.
          </p>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Rejection Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              value={rejectionReason}
              onChange={(e) => {
                setRejectionReason(e.target.value);
                if (reasonError) setReasonError('');
              }}
              placeholder="e.g. Insufficient content details, missing certification, inappropriate content..."
              className={`w-full rounded-xl border p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 ${
                reasonError
                  ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500'
                  : 'border-slate-200 focus:border-rose-400 focus:ring-rose-400'
              }`}
            />
            {reasonError && (
              <p className="mt-1 text-[11px] text-rose-600 font-medium">{reasonError}</p>
            )}
          </div>

          {actionError && (
            <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {actionError}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setRejectModalOpen(false);
                setReasonError('');
              }}
              disabled={rejectMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleConfirmReject}
              isLoading={rejectMutation.isPending}
            >
              Confirm Rejection
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
