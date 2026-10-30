import React from 'react';
import { formatCurrency } from '../../utils/formatters';

export function PriceSummaryBreakdown({
  seats = [],
  baseAmount = 0,
  convenienceFee = 0,
  taxAmount = 0,
  totalAmount = 0,
  className
}) {
  return (
    <div className={`bg-cinema-card border border-cinema-border rounded-xl p-5 space-y-4 ${className || ''}`}>
      <h3 className="font-bold text-sm uppercase tracking-wider text-slate-200 border-b border-cinema-border/60 pb-2">
        Payment Summary
      </h3>

      {/* Selected Seats Listing */}
      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between text-slate-300">
          <span>Tickets ({seats.length} seats)</span>
          <span className="font-semibold text-slate-100">
            {formatCurrency(baseAmount)}
          </span>
        </div>
        {seats.map((seat, idx) => (
          <div
            key={seat._id || idx}
            className="flex justify-between text-slate-400 pl-2 text-[11px]"
          >
            <span>
              Seat {seat.seatLabel || seat.seatNumber} ({seat.categoryName || 'Standard'})
            </span>
            <span>{formatCurrency(seat.price)}</span>
          </div>
        ))}
      </div>

      <hr className="border-cinema-border/60" />

      {/* Fees & Taxes */}
      <div className="space-y-1.5 text-xs text-slate-300">
        <div className="flex justify-between">
          <span>Convenience Fee</span>
          <span>{formatCurrency(convenienceFee)}</span>
        </div>
        <div className="flex justify-between text-slate-400 text-[11px]">
          <span>Integrated GST (18%)</span>
          <span>{formatCurrency(taxAmount)}</span>
        </div>
      </div>

      <hr className="border-cinema-border/60" />

      {/* Total Payable */}
      <div className="flex justify-between items-center text-sm sm:text-base font-bold text-white pt-1">
        <span>Amount Payable</span>
        <span className="text-emerald-400 text-base sm:text-lg">
          {formatCurrency(totalAmount)}
        </span>
      </div>
    </div>
  );
}

export default PriceSummaryBreakdown;

