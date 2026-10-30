import React from 'react';
import { Lock, Armchair, AlertCircle } from 'lucide-react';
import { SEAT_STATUS } from '../../constants';
import { formatCurrency } from '../../utils/formatters';

export function SeatingLayoutGrid({
  categories = [],
  layoutRows = [],
  selectedSeats = [],
  onToggleSeat,
  maxSelectable = 10
}) {
  const isSeatSelected = seatId =>
    selectedSeats.some(s => s._id === seatId || s.id === seatId);

  // Helper to determine active UI state of a seat
  const getSeatStatus = seat => {
    if (isSeatSelected(seat._id || seat.id)) {
      return SEAT_STATUS.SELECTED;
    }
    return seat.status || SEAT_STATUS.AVAILABLE;
  };

  return (
    <div className="w-full flex flex-col items-center select-none py-6">
      {/* Curved Cinema Screen SVG Indicator */}
      <div className="w-full max-w-2xl flex flex-col items-center mb-10">
        <svg
          viewBox="0 0 600 60"
          className="w-full text-slate-700/80 max-h-14 overflow-visible"
        >
          <defs>
            <linearGradient id="screenGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <path
            d="M 50 45 Q 300 10 550 45"
            fill="none"
            stroke="url(#screenGradient)"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M 50 45 Q 300 10 550 45 L 550 55 Q 300 20 50 55 Z"
            fill="url(#screenGradient)"
            opacity="0.15"
          />
        </svg>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 -mt-2">
          All eyes this way please (Screen)
        </span>
      </div>

      {/* Seating Categories & Grid Rows */}
      <div className="w-full max-w-4xl space-y-8 overflow-x-auto pb-6">
        {categories.map(category => {
          // Find rows belonging to this category
          const categoryRows = layoutRows.filter(
            r => r.categoryCode === category.code || r.categoryId === category._id || !r.categoryCode
          );

          const categoryPrice = category.price || category.basePrice || 250;

          return (
            <div key={category.code || category._id} className="space-y-3">
              {/* Category Tier Header */}
              <div className="flex items-center gap-3 border-b border-cinema-border/60 pb-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  {category.name || category.code}
                </span>
                <span className="text-xs font-semibold text-emerald-400">
                  {formatCurrency(categoryPrice)}
                </span>
              </div>

              {/* Rows within Category */}
              <div className="space-y-2.5 min-w-[650px] flex flex-col items-center">
                {categoryRows.map(row => (
                  <div key={row.rowLabel} className="flex items-center gap-3">
                    {/* Left Row Label */}
                    <span className="w-5 text-center text-xs font-bold text-slate-400">
                      {row.rowLabel}
                    </span>

                    {/* Seats in Row */}
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      {row.seats.map(seat => {
                        // Empty space or aisle
                        if (seat.isAisle || seat.isEmpty) {
                          return (
                            <div
                              key={`empty-${seat.colIndex}`}
                              className="w-7 h-7 sm:w-8 sm:h-8"
                            />
                          );
                        }

                        const status = getSeatStatus(seat);
                        const isAvailable = status === SEAT_STATUS.AVAILABLE;
                        const isSelected = status === SEAT_STATUS.SELECTED;
                        const isLockedMe = status === SEAT_STATUS.LOCKED_BY_ME;
                        const isLockedOther = status === SEAT_STATUS.LOCKED_BY_OTHER;
                        const isBooked =
                          status === SEAT_STATUS.BOOKED ||
                          status === SEAT_STATUS.BLOCKED ||
                          status === SEAT_STATUS.MAINTENANCE;

                        return (
                          <button
                            key={seat._id || `${row.rowLabel}-${seat.seatNumber}`}
                            type="button"
                            disabled={!isAvailable && !isSelected}
                            onClick={() => onToggleSeat(seat, category)}
                            title={`Seat ${seat.seatLabel || `${row.rowLabel}${seat.seatNumber}`} - ${category.name} (${formatCurrency(categoryPrice)})`}
                            className={`relative w-7 h-7 sm:w-8 sm:h-8 rounded-md text-[11px] font-bold flex items-center justify-center transition-all ${
                              isSelected
                                ? 'bg-emerald-500 text-white shadow-seat-selected scale-105 z-10'
                                : isLockedMe
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500'
                                : isLockedOther
                                ? 'bg-red-500/20 text-red-400 border border-red-500/40 cursor-not-allowed'
                                : isBooked
                                ? 'bg-slate-900 border border-slate-800 text-slate-600 cursor-not-allowed'
                                : 'bg-cinema-card border border-cinema-border text-slate-300 hover:border-emerald-500 hover:text-emerald-400 hover:scale-105'
                            }`}
                          >
                            {isLockedOther ? (
                              <Lock className="w-3 h-3 text-red-400" />
                            ) : (
                              seat.seatNumber
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Right Row Label */}
                    <span className="w-5 text-center text-xs font-bold text-slate-400">
                      {row.rowLabel}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend Bar */}
      <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 pt-6 border-t border-cinema-border/60 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-cinema-card border border-cinema-border" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold">
            ✓
          </div>
          <span>Selected</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-amber-500/20 border border-amber-500" />
          <span>Locked (You)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-red-500/20 border border-red-500/40 flex items-center justify-center">
            <Lock className="w-2.5 h-2.5 text-red-400" />
          </div>
          <span>Locked (Others)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-slate-900 border border-slate-800" />
          <span>Booked</span>
        </div>
      </div>
    </div>
  );
}

export default SeatingLayoutGrid;

