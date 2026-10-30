import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Ticket, Home, AlertCircle } from 'lucide-react';
import bookingsApi from '../../services/api/bookings.api';
import DigitalTicketCard from '../../components/booking/DigitalTicketCard';
import Button from '../../components/common/Button';

export function BookingConfirmationPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();

  const { data: bookingData, isLoading, error } = useQuery({
    queryKey: ['booking-confirmation', bookingId],
    queryFn: () => bookingsApi.getBookingById(bookingId)
  });

  const booking = bookingData?.data;

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-slate-400">Loading confirmed ticket pass...</p>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold text-white">Ticket Not Found</h2>
        <p className="text-xs text-slate-400">
          The requested booking ticket could not be loaded.
        </p>
        <Button variant="secondary" size="sm" onClick={() => navigate('/')}>
          Return Home
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Top Banner (hidden in print) */}
      <div className="text-center space-y-2 print:hidden">
        <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-3">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
          Booking Confirmed!
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
          Your payment was successful and your seats are guaranteed. A confirmation has been added to your profile.
        </p>
      </div>

      {/* Verified Digital Ticket Card */}
      <DigitalTicketCard booking={booking} />

      {/* Navigation Actions (hidden in print) */}
      <div className="flex flex-wrap items-center justify-center gap-4 pt-4 print:hidden">
        <Link to="/my-bookings">
          <Button variant="secondary" size="md" leftIcon={Ticket}>
            View All Bookings
          </Button>
        </Link>
        <Link to="/">
          <Button variant="ghost" size="md" leftIcon={Home}>
            Book More Movies
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default BookingConfirmationPage;

