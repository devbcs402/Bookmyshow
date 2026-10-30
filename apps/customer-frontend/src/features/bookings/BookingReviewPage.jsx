import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Film, Calendar, Clock, MapPin, ArrowLeft, ShieldCheck, AlertCircle } from 'lucide-react';
import bookingsApi from '../../services/api/bookings.api';
import { useSeatLockStore } from '../../store/seatLock.store';
import CountdownTimer from '../../components/common/CountdownTimer';
import PriceSummaryBreakdown from '../../components/booking/PriceSummaryBreakdown';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import { formatDate, formatTime, formatCurrency } from '../../utils/formatters';

export function BookingReviewPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { remainingSeconds, isExpired } = useSeatLockStore();

  const [isLoadingPayment, setIsLoadingPayment] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Fetch Booking Details from Backend
  const {
    data: bookingData,
    isLoading,
    error
  } = useQuery({
    queryKey: ['booking-review', bookingId],
    queryFn: () => bookingsApi.getBookingById(bookingId),
    initialData: location.state?.booking ? { data: location.state.booking } : undefined
  });

  const booking = bookingData?.data;

  const handleProceedToPayment = () => {
    if (isExpired || remainingSeconds <= 0) {
      setErrorMessage(
        'Your seat lock has expired. Please select your seats again.'
      );
      return;
    }
    navigate(`/booking/${bookingId}/payment`, {
      state: { booking }
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-slate-400">Loading booking review...</p>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold text-white">Booking Not Found</h2>
        <p className="text-xs text-slate-400">
          {error?.message || 'The booking session could not be retrieved.'}
        </p>
        <Button variant="secondary" size="sm" onClick={() => navigate('/')}>
          Return Home
        </Button>
      </div>
    );
  }

  const snapshot = booking.snapshot || {};
  const pricing = booking.pricing || {};
  const seats = booking.seats || [];
  const showDate = snapshot.showStartTime || booking.createdAt;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header with Back button & Lock Timer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-cinema-border pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-lg bg-cinema-card border border-cinema-border text-slate-300 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">
              Review Your Booking
            </h1>
            <p className="text-xs text-slate-400">
              Reference: <span className="font-mono text-slate-200">{booking.bookingReference}</span>
            </p>
          </div>
        </div>

        <CountdownTimer />
      </div>

      {/* Expiration Error Alert */}
      {(isExpired || errorMessage) && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>
              {errorMessage || 'Your temporary seat reservation has expired. Please re-select your seats.'}
            </span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate(`/booking/${booking.showId}/seats`)}
          >
            Re-select Seats
          </Button>
        </div>
      )}

      {/* Main Review Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        {/* Left Column: Movie & Theatre Summary */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-cinema-card border border-cinema-border rounded-xl p-5 sm:p-6 space-y-4">
            <div className="flex gap-4">
              {snapshot.moviePosterUrl ? (
                <img
                  src={snapshot.moviePosterUrl}
                  alt={snapshot.movieTitle}
                  className="w-20 h-28 object-cover rounded-lg bg-slate-800 shadow flex-shrink-0"
                />
              ) : (
                <div className="w-20 h-28 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500 flex-shrink-0">
                  <Film className="w-8 h-8" />
                </div>
              )}

              <div className="space-y-1.5">
                <h2 className="text-lg font-bold text-white">
                  {snapshot.movieTitle || 'Movie'}
                </h2>
                <p className="text-xs font-semibold text-slate-300">
                  {snapshot.theatreName} • {snapshot.screenName}
                </p>
                {snapshot.theatreAddress && (
                  <p className="text-[11px] text-slate-400">
                    {snapshot.theatreAddress}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-300">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-brand" />
                    {formatDate(showDate)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-brand" />
                    {formatTime(showDate)}
                  </span>
                </div>
              </div>
            </div>

            <hr className="border-cinema-border/60" />

            {/* Seats Assigned */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Reserved Seats:</span>
              <span className="font-bold text-emerald-400 text-sm">
                {seats.map(s => s.seatLabel).join(', ')}
              </span>
            </div>
          </div>

          {/* Security Guarantee Notice */}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs text-emerald-300">
            <ShieldCheck className="w-5 h-5 flex-shrink-0 text-emerald-400" />
            <span>
              Your seats are temporarily held in our distributed locking engine for the duration shown above.
            </span>
          </div>
        </div>

        {/* Right Column: Server-Calculated Price Breakdown */}
        <div className="space-y-6">
          <PriceSummaryBreakdown
            seats={seats}
            baseAmount={pricing.subtotal || pricing.baseTicketAmount || 0}
            convenienceFee={pricing.convenienceFee || 0}
            taxAmount={pricing.taxes || pricing.taxAmount || 0}
            totalAmount={pricing.totalPayable || booking.totalAmount || 0}
          />

          <Button
            variant="primary"
            fullWidth
            size="lg"
            disabled={isExpired || remainingSeconds <= 0}
            isLoading={isLoadingPayment}
            onClick={handleProceedToPayment}
            className="shadow-cinema-glow"
          >
            Proceed to Payment ({formatCurrency(pricing.totalPayable || booking.totalAmount)})
          </Button>
        </div>
      </div>
    </div>
  );
}

export default BookingReviewPage;

