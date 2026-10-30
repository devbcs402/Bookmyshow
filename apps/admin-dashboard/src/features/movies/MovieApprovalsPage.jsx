import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Film,
  CheckCircle,
  XCircle,
  Eye,
  AlertCircle,
  ImageOff,
  Clock,
  CalendarDays,
  ShieldCheck,
  Inbox,
} from 'lucide-react';
import { adminMoviesApi } from '../../services/api/admin-movies.api';
import StatusBadge from '../../components/ui/StatusBadge';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Pagination from '../../components/ui/Pagination';
import Modal from '../../components/ui/Modal';
import { formatDate, formatDuration } from '../../utils/formatters';

const PAGE_LIMIT = 10;

function PosterCard({ src, alt }) {
  const [errored, setErrored] = useState(false);
  if (!src || errored) {
    return (
      <div className="w-16 h-22 min-h-[5.5rem] rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
        <ImageOff className="w-5 h-5 text-slate-400" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setErrored(true)}
      className="w-16 h-22 min-h-[5.5rem] rounded-lg object-cover border border-slate-200 shrink-0"
      style={{ height: '5.5rem' }}
    />
  );
}

function GenreBadge({ genre }) {
  return (
    <span className="inline-block rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 text-[10px] font-semibold">
      {genre}
    </span>
  );
}

export default function MovieApprovalsPage() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  const [actionError, setActionError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-movie-approvals', page],
    queryFn: () =>
      adminMoviesApi.getAllMovies({
        status: 'PENDING_APPROVAL',
        page,
        limit: PAGE_LIMIT,
      }),
    keepPreviousData: true,
  });

  const approveMutation = useMutation({
    mutationFn: (movieId) => adminMoviesApi.approveMovie(movieId),
    onSuccess: (_, movieId) => {
      queryClient.invalidateQueries({ queryKey: ['admin-movie-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['admin-movies-list'] });
      setActionError(null);
      setSuccessMsg('Movie approved successfully and is now published.');
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (err) => {
      setActionError(err.response?.data?.message || err.message || 'Failed to approve movie.');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ movieId, reason }) => adminMoviesApi.rejectMovie(movieId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-movie-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['admin-movies-list'] });
      setRejectModalOpen(false);
      setSelectedMovie(null);
      setRejectionReason('');
      setReasonError('');
      setActionError(null);
      setSuccessMsg('Movie has been rejected and the content team has been notified.');
      setTimeout(() => setSuccessMsg(null), 4000);
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
      setReasonError('Rejection reason is mandatory for audit and compliance records.');
      return;
    }
    rejectMutation.mutate({ movieId: selectedMovie._id, reason: rejectionReason.trim() });
  }, [rejectionReason, selectedMovie, rejectMutation]);

  const movies = data?.movies || [];
  const pagination = data?.pagination || null;
  const totalPending = pagination?.totalItems || pagination?.total || movies.length;

  const normalizeGenres = (movie) => {
    const raw = movie.genres || movie.genre;
    if (!raw) return [];
    return Array.isArray(raw) ? raw : [raw];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-100 border border-amber-200">
              <ShieldCheck className="w-5 h-5 text-amber-700" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Movie Approval Queue
            </h1>
          </div>
          <p className="mt-2 text-sm text-slate-500 pl-0.5">
            Review and approve or reject movies awaiting content moderation.
          </p>
        </div>

        {/* Pending Count Badge */}
        {!isLoading && (
          <div className="flex items-center gap-2 self-start sm:self-auto rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5">
            <Clock className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-bold text-amber-800">{totalPending}</span>
            <span className="text-xs text-amber-700 font-medium">Pending Review</span>
          </div>
        )}
      </div>

      {/* Success message */}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-800">
          <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

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

      {/* Content */}
      {isLoading ? (
        <div className="flex h-72 items-center justify-center rounded-xl border border-slate-200 bg-white">
          <LoadingSpinner size="lg" text="Loading pending approvals..." />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-16 rounded-xl border border-slate-200 bg-white text-center gap-3">
          <AlertCircle className="h-10 w-10 text-rose-400" />
          <p className="text-sm font-semibold text-slate-700">Failed to load approval queue</p>
          <p className="text-xs text-slate-500 max-w-sm">
            {error?.response?.data?.message || error?.message || 'An unexpected error occurred.'}
          </p>
        </div>
      ) : movies.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-xl border border-slate-200 bg-white text-center gap-4">
          <div className="p-4 rounded-full bg-slate-100 border border-slate-200">
            <Inbox className="h-10 w-10 text-slate-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-800">Queue is Empty</h3>
            <p className="mt-1 text-sm text-slate-500 max-w-sm">
              There are no movies pending approval at this time. Check back later.
            </p>
          </div>
          <Link
            to="/movies"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-sm"
          >
            <Film className="w-3.5 h-3.5" />
            Browse All Movies
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {movies.map((movie) => {
            const genres = normalizeGenres(movie);
            const isApprovingThis =
              approveMutation.isPending && approveMutation.variables === movie._id;

            return (
              <div
                key={movie._id}
                className="flex items-start gap-4 rounded-xl border border-amber-100 bg-white p-4 shadow-sm hover:border-amber-200 hover:shadow-md transition-all"
              >
                {/* Poster */}
                <PosterCard
                  src={movie.posterUrl || movie.poster}
                  alt={movie.title}
                />

                {/* Movie Info */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 leading-tight">
                        {movie.title}
                      </h3>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">{movie._id}</p>
                    </div>
                    <StatusBadge status={movie.status} />
                  </div>

                  {/* Meta Row */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600">
                    {movie.language && (
                      <span className="flex items-center gap-1">
                        <Film className="w-3.5 h-3.5 text-slate-400" />
                        {movie.language}
                      </span>
                    )}
                    {(movie.duration || movie.durationMinutes) && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {formatDuration(movie.duration || movie.durationMinutes)}
                      </span>
                    )}
                    {movie.certification && (
                      <span className="flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                        {movie.certification}
                      </span>
                    )}
                    {movie.releaseDate && (
                      <span className="flex items-center gap-1">
                        <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                        {formatDate(movie.releaseDate)}
                      </span>
                    )}
                    {movie.createdAt && (
                      <span className="flex items-center gap-1 text-amber-700 font-medium">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        Submitted: {formatDate(movie.createdAt)}
                      </span>
                    )}
                  </div>

                  {/* Genres */}
                  {genres.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {genres.map((g) => (
                        <GenreBadge key={g} genre={g} />
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 shrink-0">
                  <Link
                    to={`/movies/${movie._id}`}
                    className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Details
                  </Link>
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => handleApprove(movie)}
                    isLoading={isApprovingThis}
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                    className="w-full justify-center"
                  >
                    <CheckCircle className="h-3.5 w-3.5 mr-1" />
                    Approve
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleOpenReject(movie)}
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                    className="w-full justify-center"
                  >
                    <XCircle className="h-3.5 w-3.5 mr-1" />
                    Reject
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination && !isLoading && movies.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <Pagination
            currentPage={page}
            totalPages={pagination.totalPages || 1}
            totalItems={pagination.totalItems || pagination.total}
            pageSize={PAGE_LIMIT}
            onPageChange={(p) => setPage(p)}
          />
        </div>
      )}

      {/* Reject Reason Modal */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => {
          if (!rejectMutation.isPending) {
            setRejectModalOpen(false);
            setReasonError('');
          }
        }}
        title={`Reject Movie: ${selectedMovie?.title || ''}`}
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          {/* Movie preview inside modal */}
          {selectedMovie && (
            <div className="flex items-center gap-3 rounded-lg bg-slate-50 border border-slate-200 p-3">
              <PosterCard
                src={selectedMovie.posterUrl || selectedMovie.poster}
                alt={selectedMovie.title}
              />
              <div>
                <p className="text-sm font-semibold text-slate-900">{selectedMovie.title}</p>
                {selectedMovie.language && (
                  <p className="text-xs text-slate-500 mt-0.5">{selectedMovie.language}</p>
                )}
                <StatusBadge status={selectedMovie.status} className="mt-1.5" />
              </div>
            </div>
          )}

          <p className="text-xs text-slate-600 leading-relaxed">
            Please provide a detailed reason for rejecting this movie. This reason is mandatory,
            will be permanently recorded in the audit log, and communicated to the content team.
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
              placeholder="e.g. Missing CBFC certification, insufficient content information, inappropriate content for platform guidelines..."
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
