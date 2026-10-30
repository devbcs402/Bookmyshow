import React from 'react';
import { formatDate } from '../../utils/formatters';

export function DateSelector({ selectedDate, onSelectDate, daysCount = 7 }) {
  // Generate array of next N dates starting from today
  const dates = React.useMemo(() => {
    const list = [];
    const now = new Date();
    for (let i = 0; i < daysCount; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      list.push(d);
    }
    return list;
  }, [daysCount]);

  const isSameDay = (d1, d2) => {
    if (!d1 || !d2) return false;
    const a = typeof d1 === 'string' ? new Date(d1) : d1;
    const b = typeof d2 === 'string' ? new Date(d2) : d2;
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  };

  return (
    <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-3 pt-1 scrollbar-none">
      {dates.map((date, idx) => {
        const isSelected = isSameDay(date, selectedDate);
        const isToday = idx === 0;
        const dayName = isToday ? 'TODAY' : formatDate(date, { weekday: 'short' }).toUpperCase();
        const dayNumber = date.getDate();
        const monthName = formatDate(date, { month: 'short' }).toUpperCase();

        return (
          <button
            key={date.toISOString()}
            onClick={() => onSelectDate(date)}
            className={`flex flex-col items-center justify-center min-w-[62px] sm:min-w-[70px] py-2 px-1 rounded-xl border transition-all text-center ${
              isSelected
                ? 'bg-brand text-white border-brand shadow-cinema-glow font-bold'
                : 'bg-cinema-card border-cinema-border text-slate-300 hover:border-slate-500 hover:bg-cinema-elevated'
            }`}
          >
            <span className="text-[10px] tracking-wider uppercase font-semibold">
              {dayName}
            </span>
            <span className="text-base sm:text-lg font-extrabold leading-tight my-0.5">
              {dayNumber}
            </span>
            <span className="text-[10px] tracking-wider uppercase opacity-80">
              {monthName}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default DateSelector;

