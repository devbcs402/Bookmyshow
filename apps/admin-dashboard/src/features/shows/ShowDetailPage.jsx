import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, 
  Film, 
  Building2, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  Users, 
  Ticket, 
  ShieldAlert,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { adminShowsApi } from '../../services/api/admin-shows.api';
import StatusBadge from '../../components/ui/StatusBadge';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';
import { formatDate, formatTime, formatCurrency, formatNumber } from '../../utils/formatters';

export default function ShowDetailPage() {
  const { showId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [errorMsg, setErrorMsg] = useState(null);

  const { data: show, isLoading, isError } = useQuery({
    queryKey: ['admin-show-detail', showId],
    queryFn: () => adminShowsApi.getShowById(showId),
  });

  const { data: pricingData } = useQuery({
    queryKey: ['admin-show-pricing', showId],
    queryFn: () => adminShowsApi.getShowPricing(showId),
    enabled: !!showId,
    retry: false,
  });

  const cancelMutation = useMutation({
    mutationFn: (reason) => adminShowsApi.cancelShow(showId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-show-detail', showId] });
      queryClient.invalidateQueries({ queryKey: ['admin-shows'] });
      setCancelModalOpen(false);
      setCancelReason('');
    },
    onError: (err) => {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to cancel show');
    }
  });

  const handleConfirmCancel = () => {
    if (!cancelReason.trim()) {
      setErrorMsg('Mandatory reason required for emergency show cancellation.');
      return;
    }
    cancelMutation.mutate(cancelReason.trim());
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isError || !show) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-rose-500 mb-2" />
        <h3 className="text-sm font-bold text-rose-900">Show Screening Not Found</h3>
        <p className="text-xs text-rose-700 mt-1">Unable to locate show session ID: {showId}</p>
        <Link to="/shows" className="mt-4 inline-block">
          <Button variant="outline" size="sm">Back to Shows</Button>
        </Link>
      </div>
    );
  }

  const isLiveOrScheduled = show.status === 'SCHEDULED' || show.status === 'LIVE';

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/shows')}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {show.movie?.title || 'Movie Screening'}
              </h1>
              <StatusBadge status={show.status} />
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">Show ID: {show._id}</p>
          </div>
        </div>

        {isLiveOrScheduled && (
          <Button
            variant="danger"
            onClick={() => {
              setErrorMsg(null);
              setCancelModalOpen(true);
            }}
          >
            <AlertTriangle className="h-4 w-4 mr-1.5" />
            Emergency Cancel Show
          </Button>
        )}
      </div>

      {errorMsg && (
        <div className="flex items-center space-x-2 rounded-xl border border-rose-300 bg-rose-50 p-4 text-xs font-medium text-rose-800">
          <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Grid of Key Info */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Screening Details */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center">
            <Film className="h-4 w-4 mr-2 text-primary-600" />
            Screening Details
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-50 text-slate-600">
              <span>Date:</span>
              <span className="font-semibold text-slate-900">{formatDate(show.showTime || show.startTime)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50 text-slate-600">
              <span>Start Time:</span>
              <span className="font-semibold text-slate-900">{formatTime(show.showTime || show.startTime)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50 text-slate-600">
              <span>End Time:</span>
              <span className="font-semibold text-slate-900">{show.endTime ? formatTime(show.endTime) : 'TBD'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50 text-slate-600">
              <span>Language:</span>
              <span className="font-semibold text-slate-900">{show.language || 'Original'}</span>
            </div>
            <div className="flex justify-between py-1 text-slate-600">
              <span>Screen Format:</span>
              <span className="font-semibold text-slate-900">{show.screenFormat || '2D'}</span>
            </div>
          </div>
        </div>

        {/* Venue & Screen Info */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center">
            <Building2 className="h-4 w-4 mr-2 text-emerald-600" />
            Venue & Auditorium
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-50 text-slate-600">
              <span>Theatre:</span>
              <span className="font-semibold text-slate-900">{show.theatre?.name || 'Partner Theatre'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50 text-slate-600">
              <span>Branch:</span>
              <span className="font-semibold text-slate-900">{show.branch?.name || show.theatre?.city || 'Main'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50 text-slate-600">
              <span>Auditorium / Screen:</span>
              <span className="font-semibold text-slate-900">{show.screen?.name || 'Screen 1'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50 text-slate-600">
              <span>Seating Capacity:</span>
              <span className="font-semibold text-slate-900">{show.screen?.capacity || 'N/A'} seats</span>
            </div>
            <div className="flex justify-between py-1 text-slate-600">
              <span>Layout Version:</span>
              <span className="font-semibold text-slate-900 font-mono">v{show.layoutVersion || 1}</span>
            </div>
          </div>
        </div>

        {/* Occupancy / Booking Progress */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center">
            <Users className="h-4 w-4 mr-2 text-indigo-600" />
            Booking Occupancy
          </h3>
          <div className="text-center py-2">
            <div className="text-3xl font-extrabold text-slate-900">
              {show.confirmedBookingsCount || 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">Confirmed seats reserved</p>
          </div>
          <div className="space-y-1.5 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Status:</span>
              <span className="font-semibold text-slate-900">{show.status}</span>
            </div>
            {show.cancellationReason && (
              <div className="rounded bg-rose-50 p-2 text-rose-800 text-[11px] mt-2">
                <span className="font-bold">Cancellation Reason:</span> {show.cancellationReason}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Seat Category Pricing Matrix */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 px-6 py-4">
          <h3 className="text-sm font-bold text-slate-900">Seat Category Pricing Matrix</h3>
          <p className="text-xs text-slate-500">Tiered pricing published for this specific show time</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Category Tier</th>
                <th className="px-6 py-3">Base Price</th>
                <th className="px-6 py-3">Convenience Fee</th>
                <th className="px-6 py-3">Total Customer Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pricingData?.pricing?.length > 0 ? (
                pricingData.pricing.map((tier, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-6 py-3.5 font-bold text-slate-900">{tier.categoryName || tier.category}</td>
                    <td className="px-6 py-3.5 font-semibold text-slate-800">{formatCurrency(tier.basePrice || tier.price || 0)}</td>
                    <td className="px-6 py-3.5 text-slate-500">{formatCurrency(tier.convenienceFee || 0)}</td>
                    <td className="px-6 py-3.5 font-bold text-primary-700">{formatCurrency((tier.basePrice || tier.price || 0) + (tier.convenienceFee || 0))}</td>
                  </tr>
                ))
              ) : show.pricing?.length > 0 ? (
                show.pricing.map((tier, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-6 py-3.5 font-bold text-slate-900">{tier.categoryName || tier.category}</td>
                    <td className="px-6 py-3.5 font-semibold text-slate-800">{formatCurrency(tier.price || 0)}</td>
                    <td className="px-6 py-3.5 text-slate-500">₹0.00</td>
                    <td className="px-6 py-3.5 font-bold text-primary-700">{formatCurrency(tier.price || 0)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="px-6 py-6 text-center text-slate-400">
                    Standard show pricing configured at the venue level.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Emergency Cancellation Warning Notice */}
      {isLiveOrScheduled && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 flex items-start space-x-3">
          <ShieldAlert className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Administrative Show Cancellation Protocol:</span>
            <p className="mt-0.5 leading-relaxed">
              Cancelling an active show automatically terminates all associated locks, notifies affected ticket holders,
              and initiates 100% gateway refunds to customers via the automated Razorpay pipeline.
            </p>
          </div>
        </div>
      )}

      {/* Emergency Cancel Modal */}
      <Modal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="Emergency Show Cancellation"
        size="md"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
            <span className="font-bold block mb-1">CRITICAL CONSEQUENCES:</span>
            This action will cancel the screening for all ticket holders, trigger automated 100% refunds,
            and log an emergency incident in administrative audit records.
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Cancellation Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Projector hardware failure, theatre air conditioning breakdown, or civic curfew."
              className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 placeholder-slate-400 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <Button variant="outline" size="sm" onClick={() => setCancelModalOpen(false)}>
              Back Out
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleConfirmCancel}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? 'Processing Cancellation...' : 'Confirm Show Cancellation'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
