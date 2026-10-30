import React from 'react';
import { Film, Calendar, Clock, MapPin, Printer, Download, CheckCircle2 } from 'lucide-react';
import TicketQR from './TicketQR';
import Badge from '../common/Badge';
import Button from '../common/Button';
import { formatDate, formatTime, formatCurrency } from '../../utils/formatters';

export function DigitalTicketCard({ booking, onPrint }) {
  if (!booking) return null;

  const snapshot = booking.snapshot || {};
  const movieTitle = snapshot.movieTitle || 'Movie Ticket';
  const moviePoster = snapshot.moviePosterUrl || '';
  const theatreName = snapshot.theatreName || 'Cinema';
  const theatreAddress = snapshot.theatreAddress || '';
  const screenName = snapshot.screenName || 'Screen 1';
  const showDate = snapshot.showStartTime || booking.createdAt;
  const seats = booking.seats || [];
  const seatLabels = seats.map(s => s.seatLabel).join(', ');
  const qrPayload = booking.ticketView?.qrPayload || booking.qrPayload || `BMS:${booking.bookingReference}`;

  const handlePrint = () => {
    if (typeof onPrint === 'function') {
      onPrint();
    } else {
      window.print();
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto bg-cinema-card border border-cinema-border rounded-2xl shadow-2xl overflow-hidden relative print:shadow-none print:border-black">
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-4 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-bold text-sm tracking-wide uppercase">
            Booking Confirmed
          </span>
        </div>
        <Badge variant="outline" size="sm" className="bg-black/20 text-white border-white/30 font-mono">
          PNR: {booking.bookingReference}
        </Badge>
      </div>

      {/* Ticket Details Container */}
      <div className="p-5 sm:p-6 space-y-5">
        {/* Movie Info Row */}
        <div className="flex gap-4">
          {moviePoster ? (
            <img
              src={moviePoster}
              alt={movieTitle}
              className="w-16 h-24 object-cover rounded-lg bg-slate-800 shadow"
            />
          ) : (
            <div className="w-16 h-24 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500">
              <Film className="w-6 h-6" />
            </div>
          )}

          <div className="space-y-1">
            <h2 className="text-base sm:text-lg font-bold text-slate-100 line-clamp-1">
              {movieTitle}
            </h2>
            <p className="text-xs font-semibold text-slate-300">
              {theatreName} • {screenName}
            </p>
            {theatreAddress && (
              <p className="text-[11px] text-slate-400 line-clamp-1">
                {theatreAddress}
              </p>
            )}
            <div className="flex items-center gap-3 pt-1 text-xs text-slate-300">
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

        {/* Perforated Divider */}
        <div className="relative py-2 -mx-6">
          <div className="border-b-2 border-dashed border-cinema-border" />
          <div className="absolute -left-3 top-0 w-6 h-6 rounded-full bg-[#0B0F19]" />
          <div className="absolute -right-3 top-0 w-6 h-6 rounded-full bg-[#0B0F19]" />
        </div>

        {/* Seats & Payment Breakdown */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <p className="text-[11px] text-slate-400 uppercase font-semibold">
              Seats ({seats.length})
            </p>
            <p className="text-sm font-bold text-emerald-400 mt-0.5">
              {seatLabels || 'Seats Assigned'}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-slate-400 uppercase font-semibold">
              Total Paid
            </p>
            <p className="text-sm font-bold text-slate-100 mt-0.5">
              {formatCurrency(booking.pricing?.totalPayable || booking.totalAmount)}
            </p>
          </div>
        </div>

        {/* QR Code Presentation */}
        <div className="flex flex-col items-center justify-center pt-2">
          <TicketQR qrPayload={qrPayload} size={150} />
          <p className="text-[11px] text-slate-400 mt-2 text-center">
            Booking ID: <span className="font-mono text-slate-300">{booking._id}</span>
          </p>
        </div>

        {/* Action Controls (hidden in print) */}
        <div className="pt-2 flex items-center justify-center gap-3 print:hidden">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={Printer}
            onClick={handlePrint}
          >
            Print Ticket
          </Button>
        </div>
      </div>
    </div>
  );
}

export default DigitalTicketCard;

