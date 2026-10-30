import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Ticket,
  Calendar,
  Clock,
  MapPin,
  Film,
  AlertTriangle,
  ChevronRight,
  XCircle,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import bookingsApi from '../../services/api/bookings.api';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import EmptyState from '../../components/common/EmptyState';
import { formatDate, formatTime, formatCurrency } from '../../utils/formatters';

const TABS = [
  { id: 'ALL', label: 'All Bookings' },
  { id: 'UPCOMING', label: 'Upcoming' },
  { id: 'CONFIRMED', label: 'Completed' },
  { id: 'CANCELLED', label: 'Cancelled' }
];

export function MyBookingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('ALL');
  const [selectedBookingForCancel, setSelectedBookingForCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState('Change of plans');
  const [cancelError, setCancelError] = useState(null);

  // Fetch authenticated customer's bookings
  const { data: bookingsData, isLoading, error } = useQuery({
    queryKey: ['my-bookings', activeTab],
    queryFn: () =>
      bookingsApi.getMyBookings({
        status: activeTab === 'ALL' ? undefined : activeTab,
        limit: 20
      })
  });

  const bookings = bookingsData?.data || [];

  // Cancel Booking Mutation
  const cancelMutation = useMutation({
    mutationFn: ({ bookingId, reason }) => bookingsApi.cancelBooking(bookingId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      setSelectedBookingForCancel(null);
      setCancelError(null);
    },
    onError: err => {
      setCancelError(err.message || 'Unable to cancel this booking due to policy constraints.');
    }
  });

  const handleCancelSubmit = () => {
    if (!selectedBookingForCancel) return;
    cancelMutation.mutate({
      bookingId: selectedBookingForCancel._id,
      reason: cancelReason
    });
  };

  const getStatusBadge = status => {
    switch (status) {
      case 'CONFIRMED':
        return <Badge variant="success" size="sm">CONFIRMED</Badge>;
      case 'CANCELLED':
        return <Badge variant="danger" size="sm">CANCELLED</Badge>;
      case 'PENDING_PAYMENT':
        return <Badge variant="warning" size="sm">PENDING</Badge>;
      case 'REFUNDED':
        return <Badge variant="outline" size="sm" className="text-purple-400 border-purple-400/30">REFUNDED</Badge>;
      default:
        return <Badge variant="default" size="sm">{status}</Badge>;
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Title */}
      <div className="border-b border-cinema-border pb-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
          <Ticket className="w-6 h-6 text-brand" />
          <span>My Cinema Bookings</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          View your confirmed passes, download digital tickets, or manage reservations
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-cinema-border gap-2 overflow-x-auto scrollbar-none">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 px-3 text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-brand text-brand'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bookings List */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-36 bg-cinema-card rounded-xl animate-pulse" />
          ))}
        </div>
      ) : bookings.length > 0 ? (
        <div className="space-y-4">
          {bookings.map(booking => {
            const snapshot = booking.snapshot || {};
            const movieTitle = snapshot.movieTitle || 'Movie';
            const moviePoster = snapshot.moviePosterUrl || '';
            const theatreName = snapshot.theatreName || 'Cinema';
            const showTime = snapshot.showStartTime || booking.createdAt;
            const seats = booking.seats || [];
            const seatLabels = seats.map(s => s.seatLabel).join(', ');
            const isConfirmed = booking.status === 'CONFIRMED';
            const isCancelled = booking.status === 'CANCELLED';

            return (
              <div
                key={booking._id}
                className="bg-cinema-card border border-cinema-border rounded-xl p-4 sm:p-5 flex flex-col md:flex-row gap-5 items-start justify-between hover:border-slate-700 transition-colors"
              >
                {/* Poster & Details */}
                <div className="flex gap-4">
                  {moviePoster ? (
                    <img
                      src={moviePoster}
                      alt={movieTitle}
                      className="w-16 h-24 object-cover rounded-lg bg-slate-800 shadow flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-24 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500 flex-shrink-0">
                      <Film className="w-6 h-6" />
                    </div>
                  )}

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-base text-white">
                        {movieTitle}
                      </h3>
                      {getStatusBadge(booking.status)}
                    </div>
                    <p className="text-xs text-slate-300">
                      {theatreName}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-slate-400 pt-0.5">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-brand" />
                        {formatDate(showTime)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-brand" />
                        {formatTime(showTime)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 pt-1">
                      Seats: <span className="font-bold text-emerald-400">{seatLabels}</span>
                    </p>
                    <p className="text-[11px] font-mono text-slate-500">
                      PNR: {booking.bookingReference}
                    </p>
                  </div>
                </div>

                {/* Right Actions & Amount */}
                <div className="flex md:flex-col items-end justify-between w-full md:w-auto gap-3 self-stretch md:self-auto border-t md:border-t-0 pt-3 md:pt-0 border-cinema-border/60">
                  <div className="text-left md:text-right">
                    <p className="text-[11px] text-slate-400 uppercase font-semibold">
                      Total Paid
                    </p>
                    <p className="text-base font-extrabold text-slate-100">
                      {formatCurrency(booking.pricing?.totalPayable || booking.totalAmount)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {isConfirmed && (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => navigate(`/booking/${booking._id}/confirmation`)}
                        >
                          View Pass
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          onClick={() => setSelectedBookingForCancel(booking)}
                        >
                          Cancel
                        </Button>
                      </>
                    )}
                    {booking.status === 'PENDING_PAYMENT' && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => navigate(`/booking/${booking._id}/payment`)}
                      >
                        Pay Now
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Ticket}
          title="No bookings found"
          description={
            activeTab === 'ALL'
              ? "You haven't booked any movie tickets yet. Discover exciting films in theatres now!"
              : `You have no ${activeTab.toLowerCase()} bookings.`
          }
          actionText="Browse Movies"
          onAction={() => navigate('/movies')}
        />
      )}

      {/* Cancellation Confirmation Modal */}
      {selectedBookingForCancel && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedBookingForCancel(null)}
          title="Confirm Ticket Cancellation"
          footer={
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedBookingForCancel(null)}
              >
                Keep Booking
              </Button>
              <Button
                variant="danger"
                size="sm"
                isLoading={cancelMutation.isPending}
                onClick={handleCancelSubmit}
              >
                Yes, Cancel Tickets
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex gap-2">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-400" />
              <div>
                <p className="font-bold">Cancellation Policy</p>
                <p className="mt-0.5 text-amber-200/80">
                  Tickets can be cancelled up to 2 hours prior to the show start time. Refunds are credited back to your original payment source.
                </p>
              </div>
            </div>

            {cancelError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                {cancelError}
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-slate-300 mb-1">
                Booking Reference: <span className="font-mono text-white">{selectedBookingForCancel.bookingReference}</span>
              </p>
              <p className="text-xs text-slate-400">
                Film: {selectedBookingForCancel.snapshot?.movieTitle} ({selectedBookingForCancel.seats?.map(s => s.seatLabel).join(', ')})
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Reason for Cancellation
              </label>
              <select
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                className="w-full bg-cinema-card border border-cinema-border rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-brand"
              >
                <option value="Change of plans">Change of plans</option>
                <option value="Booked wrong date/time">Booked wrong date/time</option>
                <option value="Emergency or travel delay">Emergency or travel delay</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default MyBookingsPage;

