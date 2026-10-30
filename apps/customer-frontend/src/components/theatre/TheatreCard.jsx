import React from 'react';
import { MapPin, Info, Utensils, Smartphone, Volume2, Car } from 'lucide-react';
import ShowtimePill from '../show/ShowtimePill';

export function TheatreCard({ theatre, shows = [] }) {
  const address = theatre.address
    ? `${theatre.address.street ? theatre.address.street + ', ' : ''}${theatre.address.area || ''}`
    : '';

  const facilities = theatre.facilities || [
    'M-Ticket',
    'Food & Beverage',
    'Dolby Atmos'
  ];

  return (
    <div className="bg-cinema-card border border-cinema-border rounded-xl p-4 sm:p-5 transition-colors hover:border-slate-700">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-cinema-border/60">
        <div>
          <h3 className="font-bold text-base sm:text-lg text-slate-100 flex items-center gap-2">
            <span>{theatre.name}</span>
          </h3>
          {address && (
            <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
              <MapPin className="w-3.5 h-3.5 text-brand flex-shrink-0" />
              <span>{address}</span>
            </p>
          )}
        </div>

        {/* Facilities badges */}
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
          {facilities.includes('M-Ticket') && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Smartphone className="w-3 h-3" />
              <span>M-Ticket</span>
            </span>
          )}
          {facilities.includes('Food & Beverage') && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Utensils className="w-3 h-3" />
              <span>F&B</span>
            </span>
          )}
          {facilities.includes('Dolby Atmos') && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Volume2 className="w-3 h-3" />
              <span>Dolby Atmos</span>
            </span>
          )}
        </div>
      </div>

      {/* Showtimes Row */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
          Available Showtimes
        </p>
        {shows.length > 0 ? (
          <div className="flex flex-wrap gap-2.5 sm:gap-3">
            {shows.map(show => (
              <ShowtimePill key={show._id} show={show} />
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic">
            No shows scheduled for the selected date at this cinema.
          </p>
        )}
      </div>
    </div>
  );
}

export default TheatreCard;

