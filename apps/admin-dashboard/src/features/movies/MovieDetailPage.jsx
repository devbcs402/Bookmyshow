import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, 
  Film, 
  Calendar, 
  Clock, 
  Globe, 
  Award, 
  CheckCircle, 
  XCircle, 
  Trash2, 
  AlertCircle 
} from 'lucide-react';
import { adminMoviesApi } from '../../services/api/admin-movies.api';
import StatusBadge from '../../components/ui/StatusBadge';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { formatDate } from '../../utils/formatters';

export default function MovieDetailPage() {
  const { movieId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const { data: movie, isLoading, isError } = useQuery({
    queryKey: ['admin-movie-detail', movieId],
    queryFn: () => adminMoviesApi.getMovieById(movieId),
  });

  const approveMutation = useMutation({
    mutationFn: () => adminMoviesApi.approveMovie(movieId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-movie-detail', movieId] });
      queryClient.invalidateQueries({ queryKey: ['admin-movies'] });
      queryClient.invalidateQueries({ queryKey: ['admin-overview-kpis'] });
    },
    onError: (err) => {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to approve movie');
    }
  });

  const rejectMutation = useMutation({
    mutationFn: (reason) => adminMoviesApi.rejectMovie(movieId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-movie-detail', movieId] });
      queryClient.invalidateQueries({ queryKey: ['admin-movies'] });
      queryClient.invalidateQueries({ queryKey: ['admin-overview-kpis'] });
      setRejectModalOpen(false);
      setRejectionReason('');
    },
    onError: (err) => {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to reject movie');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => adminMoviesApi.deleteMovie(movieId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-movies'] });
      navigate('/movies');
    },
    onError: (err) => {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to archive/delete movie');
    }
  });

  const handleApprove = () => {
    if (window.confirm(`Approve "${movie?.title}" for public catalogue distribution?`)) {
      approveMutation.mutate();
    }
  };

  const handleConfirmReject = () => {
    if (!rejectionReason.trim()) {
      setErrorMsg('Mandatory rejection reason required for administrative compliance.');
      return;
    }
    rejectMutation.mutate(rejectionReason.trim());
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isError || !movie) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-rose-500 mb-2" />
        <h3 className="text-sm font-bold text-rose-900">Movie Not Found</h3>
        <p className="text-xs text-rose-700 mt-1">Unable to load details for Movie ID {movieId}.</p>
        <Link to="/movies" className="mt-4 inline-block">
          <Button variant="outline" size="sm">Back to Movies</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/movies')}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{movie.title}</h1>
            <p className="text-xs text-slate-500 font-mono mt-0.5">ID: {movie._id}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {movie.status === 'PENDING_APPROVAL' && (
            <>
              <Button
                variant="outline"
                className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                onClick={handleApprove}
                disabled={approveMutation.isPending}
              >
                <CheckCircle className="h-4 w-4 mr-1.5" />
                Approve Release
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  setErrorMsg(null);
                  setRejectModalOpen(true);
                }}
                disabled={rejectMutation.isPending}
              >
                <XCircle className="h-4 w-4 mr-1.5" />
                Reject Submission
              </Button>
            </>
          )}

          <Button
            variant="outline"
            className="border-rose-200 text-rose-700 hover:bg-rose-50"
            onClick={() => setDeleteConfirmOpen(true)}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="h-4 w-4 mr-1.5" />
            Delete / Archive
          </Button>
        </div>
      </div>

      {errorMsg && (
        <div className="flex items-center space-x-2 rounded-xl border border-rose-300 bg-rose-50 p-4 text-xs font-medium text-rose-800">
          <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Details Card */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Poster & Status */}
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm text-center">
            <div className="aspect-[2/3] w-full overflow-hidden rounded-lg bg-slate-100 border border-slate-100 flex items-center justify-center">
              {movie.posterUrl ? (
                <img src={movie.posterUrl} alt={movie.title} className="h-full w-full object-cover" />
              ) : (
                <Film className="h-16 w-16 text-slate-300" />
              )}
            </div>
            <div className="mt-4 flex items-center justify-center space-x-2">
              <StatusBadge status={movie.status} />
              {movie.certification && (
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
                  {movie.certification}
                </span>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3 text-xs">
            <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-2">Technical Metadata</h3>
            <div className="flex justify-between py-1 text-slate-600 border-b border-slate-50">
              <span className="flex items-center"><Globe className="h-3.5 w-3.5 mr-1.5 text-slate-400" /> Language:</span>
              <span className="font-semibold text-slate-900">{movie.language || 'N/A'}</span>
            </div>
            <div className="flex justify-between py-1 text-slate-600 border-b border-slate-50">
              <span className="flex items-center"><Clock className="h-3.5 w-3.5 mr-1.5 text-slate-400" /> Duration:</span>
              <span className="font-semibold text-slate-900">{movie.duration ? `${movie.duration} mins` : 'N/A'}</span>
            </div>
            <div className="flex justify-between py-1 text-slate-600 border-b border-slate-50">
              <span className="flex items-center"><Calendar className="h-3.5 w-3.5 mr-1.5 text-slate-400" /> Release Date:</span>
              <span className="font-semibold text-slate-900">{movie.releaseDate ? formatDate(movie.releaseDate) : 'TBD'}</span>
            </div>
            <div className="flex justify-between py-1 text-slate-600">
              <span className="flex items-center"><Award className="h-3.5 w-3.5 mr-1.5 text-slate-400" /> Formats:</span>
              <span className="font-semibold text-slate-900">{movie.formats?.join(', ') || '2D'}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Synopsis, Genres, Cast & Crew */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-2">Genres</h3>
              <div className="flex flex-wrap gap-1.5">
                {movie.genres?.length > 0 ? (
                  movie.genres.map((genre) => (
                    <span key={genre} className="rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
                      {genre}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400">No genres specified</span>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-2">Synopsis / Overview</h3>
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                {movie.description || movie.synopsis || 'No description provided for this catalog title.'}
              </p>
            </div>

            {movie.rejectionReason && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs">
                <span className="font-bold text-rose-900 block mb-1">Administrative Rejection Reason:</span>
                <p className="text-rose-800">{movie.rejectionReason}</p>
              </div>
            )}
          </div>

          {/* Cast & Crew Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-3 border-b border-slate-100 pb-2">Cast Members</h3>
              <div className="space-y-2">
                {movie.cast?.length > 0 ? (
                  movie.cast.map((c, i) => (
                    <div key={i} className="flex justify-between text-xs py-1 border-b border-slate-50 last:border-0">
                      <span className="font-semibold text-slate-800">{typeof c === 'string' ? c : c.name}</span>
                      <span className="text-slate-400">{typeof c === 'object' && c.role ? c.role : 'Actor'}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400">No cast members recorded.</p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-3 border-b border-slate-100 pb-2">Director & Crew</h3>
              <div className="space-y-2">
                {movie.crew?.length > 0 ? (
                  movie.crew.map((c, i) => (
                    <div key={i} className="flex justify-between text-xs py-1 border-b border-slate-50 last:border-0">
                      <span className="font-semibold text-slate-800">{typeof c === 'string' ? c : c.name}</span>
                      <span className="text-slate-400">{typeof c === 'object' && c.role ? c.role : 'Crew'}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400">No crew information recorded.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reject Reason Modal */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title={`Reject Movie: ${movie.title}`}
        size="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            State the mandatory content or compliance reason for rejecting this film submission.
          </p>
          <textarea
            rows={4}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="e.g. Missing valid CBFC certification document, or trailer media corrupted."
            className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 placeholder-slate-400 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
          />
          <div className="flex justify-end space-x-3 pt-2">
            <Button variant="outline" size="sm" onClick={() => setRejectModalOpen(false)}>
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

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="Archive or Delete Movie"
        message={`Are you sure you want to remove "${movie.title}" from the platform catalog? This action will prevent new shows from being scheduled.`}
        confirmText="Confirm Delete"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
