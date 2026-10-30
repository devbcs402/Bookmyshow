import React from 'react';
import { useNavigate } from 'react-router-dom';
import { formatTime } from '../../utils/formatters';

export function ShowtimePill({ show, disabled = false }) {
  const navigate = useNavigate();

  const startTime = show.startTime || show.showStartTime;
  const format = show.format || show.screenFormat || '2D';
  const language = show.language || 'Hindi';
  const screenName = show.screenName || show.screen?.name || '';
  const isSoldOut = show.status === 'SOLD_OUT' || show.availableSeatsCount === 0;

  const handleClick = () => {
    if (disabled || isSoldOut) return;
    navigate(`/booking/${show._id}/seats`);
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || isSoldOut}
      className={`group relative flex flex-col items-center justify-center p-2.5 rounded-lg border text-left transition-all ${
        isSoldOut
          ? 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
          : 'bg-cinema-card border-cinema-border text-slate-200 hover:border-emerald-500 hover:text-emerald-400 hover:bg-slate-800/80 active:scale-95'
      }`}
    >
      <span className="text-xs sm:text-sm font-bold tracking-tight">
        {formatTime(startTime)}
      </span>
      <div className="flex items-center gap-1 mt-0.5">
        <span className="text-[10px] text-slate-400 font-medium uppercase group-hover:text-emerald-300">
          {format}
        </span>
        {screenName && (
          <span className="text-[9px] text-slate-500 hidden sm:inline">
            • {screenName}
          </span>
        )}
      </div>

      {isSoldOut && (
        <span className="text-[9px] text-red-400 font-semibold uppercase mt-0.5">
          Sold Out
        </span>
      )}
    </button>
  );
}

export default ShowtimePill;

