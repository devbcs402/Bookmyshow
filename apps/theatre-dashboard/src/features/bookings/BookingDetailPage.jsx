import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Ticket, CheckCircle2, QrCode, User, Phone, Mail, Clock } from 'lucide-react';
import { bookingsApi } from '../../services/api/bookings.api';
import { formatCurrency, formatDate, formatTime } from '../../utils/formatters';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export function BookingDetailPage() {
  const { bookingId } = useParams();
  const [admitStatus, setAdmitStatus] = useState(null);

  const { data: booking, isLoading } = useQuery({
    queryKey: ['bookingDetail', bookingId],
    queryFn: () => bookingsApi.getBookingById(bookingId)
  });

  if (isLoading) {
    return <LoadingSpinner text="Retrieving booking admission record..." />;
  }

  if (!booking) {
    return (
      <div className="text-center py-12 space-y-4">
        <h2 className="text-lg font-bold text-white">Booking Not Found</h2>
        <Link to="/bookings">
          <Button variant="outline">Back to Bookings</Button>
        </Link>
      </div>
    );
  }

  const isConfirmed = booking.status === 'CONFIRMED';

  const handleValidateTicket = () => {
    if (isConfirmed) {
      setAdmitStatus('ADMITTED');
    } else {
      setAdmitStatus('INVALID');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-cinema-border">
        <div className="flex items-center gap-3">
          <Link
            to="/bookings"
            className="p-2 rounded-lg bg-cinema-card border border-cinema-border text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-white tracking-tight">
                Ref: {booking.bookingReference || booking._id?.slice(-8).toUpperCase()}
              </h1>
              <StatusBadge status={booking.status} />
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Booked on {formatDate(booking.createdAt)}, {formatTime(booking.createdAt)}
            </p>
          </div>
        </div>

        {/* Admission Action */}
        {isConfirmed && !admitStatus && (
          <Button variant="success" size="sm" icon={CheckCircle2} onClick={handleValidateTicket}>
            Admit Customer
          </Button>
        )}
      </div>

      {/* Admitted Confirmation Banner */}
      {admitStatus === 'ADMITTED' && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 shrink-0" />
          <div>
            <p className="font-bold text-sm">Customer Admitted Successfully</p>
            <p className="text-xs text-emerald-300">
              Ticket verified and registered at cinema entrance.
            </p>
          </div>
        </div>
      )}

      {/* Main Grid: Ticket Details & Customer */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Screening Info */}
        <div className="bg-cinema-card border border-cinema-border rounded-xl p-5 space-y-4 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Screening Details</h3>
          <div className="space-y-2 text-xs">
            <div>
              <p className="text-slate-400">Movie Title</p>
              <p className="text-sm font-bold text-white">{booking.movieTitle || 'Movie'}</p>
            </div>
            <div>
              <p className="text-slate-400">Screen & Complex</p>
              <p className="text-slate-200">{booking.theatreName || 'Theatre Complex'}</p>
              <p className="text-slate-400 font-semibold">{booking.screenName || 'Screen 1'}</p>
            </div>
            <div>
              <p className="text-slate-400">Show Time</p>
              <p className="text-slate-200">
                {formatDate(booking.showTime)}, {formatTime(booking.showTime)}
              </p>
            </div>
          </div>
        </div>

        {/* Seat & Pricing Details */}
        <div className="bg-cinema-card border border-cinema-border rounded-xl p-5 space-y-4 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Allocated Inventory</h3>
          <div className="space-y-3 text-xs">
            <div>
              <p className="text-slate-400">Allocated Seats</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {Array.isArray(booking.seats) &&
                  booking.seats.map((s, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded bg-partner-600/20 text-partner-400 border border-partner-500/30 font-mono font-bold"
                    >
                      {s.seatLabel || s}
                    </span>
                  ))}
              </div>
            </div>

            <div className="pt-2 border-t border-cinema-border space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Base Ticket Amount</span>
                <span>{formatCurrency(booking.pricing?.baseTicketPrice ?? booking.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Convenience / Taxes</span>
                <span>{formatCurrency(booking.pricing?.convenienceFee ?? 0)}</span>
              </div>
              <div className="flex justify-between font-bold text-white text-sm pt-1 border-t border-cinema-border">
                <span>Total Amount Paid</span>
                <span>{formatCurrency(booking.pricing?.totalPrice ?? booking.totalAmount)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BookingDetailPage;

