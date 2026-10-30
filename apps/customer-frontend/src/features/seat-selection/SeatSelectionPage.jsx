import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Film, Clock, MapPin, AlertCircle, ArrowLeft, ShieldCheck, Check } from 'lucide-react';
import showsApi from '../../services/api/shows.api';
import seatLocksApi from '../../services/api/seat-locks.api';
import bookingsApi from '../../services/api/bookings.api';
import { useSeatLockStore } from '../../store/seatLock.store';
import { useAuthStore } from '../../store/auth.store';
import { useShowSeatsSocket } from '../../hooks/useShowSeatsSocket';
import SeatingLayoutGrid from '../../components/seat/SeatingLayoutGrid';
import CountdownTimer from '../../components/common/CountdownTimer';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import { formatDate, formatTime, formatCurrency } from '../../utils/formatters';

export function SeatSelectionPage() {
  const { showId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { setLock, clearLock, remainingSeconds, isExpired } = useSeatLockStore();

  const [selectedSeats, setSelectedSeats] = useState([]);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isLocking, setIsLocking] = useState(false);

  // 1. Connect Socket.IO Room for real-time seat lock & release broadcasts
  useShowSeatsSocket(showId, eventData => {
    // If our locked seats were affected externally (e.g. expired on server)
    if (eventData?.type === 'seat:expired') {
      setSelectedSeats(prev =>
        prev.filter(s => !eventData.seatIds?.includes(s._id))
      );
    }
  });

  // 2. Fetch authoritative Seating Grid Layout, Categories, and Real-time Availability
  const {
    data: seatLayoutData,
    isLoading,
    refetch,
    error: layoutError
  } = useQuery({
    queryKey: ['show-seats', showId],
    queryFn: () => showsApi.getShowSeats(showId),
    refetchOnWindowFocus: true
  });

  const show = seatLayoutData?.data?.show || {};
  const categories = seatLayoutData?.data?.categories || [];
  const layoutRows = seatLayoutData?.data?.rows || seatLayoutData?.data?.layout?.rows || [];

  // Toggle seat selection
  const handleToggleSeat = (seat, category) => {
    setErrorMessage(null);
    const seatId = seat._id || seat.id;
    const exists = selectedSeats.some(s => (s._id || s.id) === seatId);

    if (exists) {
      setSelectedSeats(prev => prev.filter(s => (s._id || s.id) !== seatId));
    } else {
      if (selectedSeats.length >= 10) {
        setErrorMessage('You can select a maximum of 10 seats per booking transaction.');
        return;
      }
      setSelectedSeats(prev => [
        ...prev,
        {
          _id: seatId,
          seatLabel: seat.seatLabel || `${seat.rowLabel || ''}${seat.seatNumber}`,
          rowLabel: seat.rowLabel,
          seatNumber: seat.seatNumber,
          categoryCode: category.code,
          categoryName: category.name,
          price: category.price || 250
        }
      ]);
    }
  };

  // Calculate selected total price
  const totalPrice = selectedSeats.reduce((sum, s) => sum + (s.price || 0), 0);

  // Submit atomic seat lock and proceed to review
  const handleProceedToReview = async () => {
    if (selectedSeats.length === 0) {
      setErrorMessage('Please select at least 1 seat to proceed.');
      return;
    }

    if (!isAuthenticated) {
      // Direct user to login preserving current route
      navigate('/login', {
        state: { from: { pathname: `/booking/${showId}/seats` } }
      });
      return;
    }

    setIsLocking(true);
    setErrorMessage(null);

    try {
      const seatIds = selectedSeats.map(s => s._id);
      const idempotencyKey = `lock-${showId}-${Date.now()}`;

      // Call Part 9 Atomic Redis Seat Lock API
      const lockRes = await seatLocksApi.lockSeats(showId, seatIds, idempotencyKey);

      if (lockRes?.data) {
        const { lockId, expiresAt, ttlSeconds } = lockRes.data;

        // Save active lock in global seat lock store
        setLock({
          showId,
          lockId,
          lockedSeatIds: seatIds,
          expiresAt,
          ttlSeconds: ttlSeconds || 300
        });

        // Create booking in PENDING_PAYMENT state using Part 10 booking API
        const bookingRes = await bookingsApi.createBooking(
          { showId, seatIds },
          idempotencyKey
        );

        const booking = bookingRes.data;
        navigate(`/booking/${booking._id}/review`, {
          state: { show, selectedSeats, booking }
        });
      }
    } catch (err) {
      // Conflict or lock error: refresh seat layout and show alert
      refetch();
      setErrorMessage(
        err.message ||
          'One or more selected seats were locked by another patron. Please select different seats.'
      );
    } finally {
      setIsLocking(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 space-y-6 text-center">
        <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-slate-400">Loading cinema seating layout...</p>
      </div>
    );
  }

  if (layoutError) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold text-white">Unable to Load Seats</h2>
        <p className="text-xs text-slate-400">
          {layoutError.message || 'The requested show is either sold out or cancelled.'}
        </p>
        <Button variant="secondary" size="sm" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070A10] text-slate-100 flex flex-col justify-between">
      {/* Top Header Bar */}
      <div className="bg-cinema-card/90 backdrop-blur border-b border-cinema-border sticky top-16 z-30 px-4 sm:px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>{show.movieSnapshot?.title || show.movieTitle || 'Movie'}</span>
                <Badge variant="outline" size="sm" className="font-mono text-[10px]">
                  {show.format || '2D'}
                </Badge>
              </h1>
              <p className="text-xs text-slate-400">
                {show.theatreSnapshot?.name || show.theatreName} • {show.screenSnapshot?.name || show.screenName} |{' '}
                {formatDate(show.startTime || show.showStartTime)} at{' '}
                {formatTime(show.startTime || show.showStartTime)}
              </p>
            </div>
          </div>

          {/* Right Status */}
          <div className="flex items-center gap-3 self-end sm:self-auto">
            {remainingSeconds > 0 && <CountdownTimer />}
            <span className="text-xs text-slate-400 hidden md:inline">
              Max 10 tickets
            </span>
          </div>
        </div>
      </div>

      {/* Error Conflict Banner */}
      {errorMessage && (
        <div className="max-w-3xl mx-auto px-4 mt-4 w-full">
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-slate-400 hover:text-white text-xs font-bold"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main Interactive Seating Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full flex-1 flex flex-col items-center">
        <SeatingLayoutGrid
          categories={categories}
          layoutRows={layoutRows}
          selectedSeats={selectedSeats}
          onToggleSeat={handleToggleSeat}
        />
      </main>

      {/* Bottom Floating Bar */}
      <div className="sticky bottom-0 z-30 bg-cinema-card/95 backdrop-blur-md border-t border-cinema-border p-4 shadow-2xl">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Seat summary */}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Selected:</span>
              <span className="text-sm font-bold text-white">
                {selectedSeats.length > 0
                  ? selectedSeats.map(s => s.seatLabel).join(', ')
                  : 'No seats selected'}
              </span>
              {selectedSeats.length > 0 && (
                <span className="text-xs text-emerald-400 font-semibold">
                  ({selectedSeats.length} seat{selectedSeats.length > 1 ? 's' : ''})
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Total Amount: <span className="font-bold text-slate-100 text-sm">{formatCurrency(totalPrice)}</span>
              <span className="text-[10px] text-slate-500 ml-1">plus taxes & fees</span>
            </p>
          </div>

          {/* Action Button */}
          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              size="lg"
              disabled={selectedSeats.length === 0}
              isLoading={isLocking}
              onClick={handleProceedToReview}
              className="w-full sm:w-auto px-8 shadow-cinema-glow"
            >
              Lock & Proceed ({formatCurrency(totalPrice)})
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SeatSelectionPage;

