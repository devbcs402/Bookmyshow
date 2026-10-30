import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar as CalendarIcon, ArrowLeft, ChevronLeft, ChevronRight, Clock, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { showsApi } from '../../services/api/shows.api';
import { screensApi } from '../../services/api/screens.api';
import { theatresApi } from '../../services/api/theatres.api';
import { useTheatreContextStore } from '../../store/theatreContext.store';
import { formatDate, formatTime } from '../../utils/formatters';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const HOURS = Array.from({ length: 16 }, (_, i) => i + 8); // 8 AM to 11 PM (08:00 - 23:00)

export function ShowCalendarPage() {
  const { selectedTheatreId } = useTheatreContextStore();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));

  // Partner Theatres
  const { data: theatresData } = useQuery({
    queryKey: ['myTheatresList'],
    queryFn: () => theatresApi.getMyTheatres({ limit: 50 })
  });

  const theatres = Array.isArray(theatresData) ? theatresData : theatresData?.theatres || [];
  const activeTheatreId = selectedTheatreId || theatres[0]?._id || theatres[0]?.id;

  // Screens in active theatre
  const { data: screensData } = useQuery({
    queryKey: ['theatreScreens', activeTheatreId],
    queryFn: () => screensApi.getScreensByTheatre(activeTheatreId),
    enabled: Boolean(activeTheatreId)
  });

  const screens = Array.isArray(screensData) ? screensData : screensData?.screens || [];

  // Shows query for selected date
  const { data: showsData, isLoading: showsLoading } = useQuery({
    queryKey: ['showsCalendar', activeTheatreId, selectedDate],
    queryFn: () =>
      showsApi.getShows({
        theatreId: activeTheatreId,
        date: selectedDate,
        limit: 100
      }),
    enabled: Boolean(activeTheatreId)
  });

  const shows = Array.isArray(showsData) ? showsData : showsData?.shows || [];

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-cinema-border">
        <div className="flex items-center gap-3">
          <Link
            to="/shows"
            className="p-2 rounded-lg bg-cinema-card border border-cinema-border text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Timeline Show Calendar</h1>
            <p className="text-xs text-slate-400">
              Interactive timeline view across screens for scheduling conflict verification
            </p>
          </div>
        </div>

        {/* Date Selector Navigation */}
        <div className="flex items-center gap-2 bg-cinema-card border border-cinema-border rounded-lg p-1">
          <button
            onClick={handlePrevDay}
            className="p-1.5 rounded hover:bg-cinema-elevated text-slate-400 hover:text-white"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-transparent text-xs font-semibold text-slate-200 focus:outline-none cursor-pointer"
          />
          <button
            onClick={handleNextDay}
            className="p-1.5 rounded hover:bg-cinema-elevated text-slate-400 hover:text-white"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Timeline Grid */}
      {showsLoading ? (
        <LoadingSpinner text="Loading day timeline..." />
      ) : screens.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-xs">
          No auditorium screens found for this theatre complex.
        </div>
      ) : (
        <div className="bg-cinema-card border border-cinema-border rounded-xl p-5 overflow-x-auto shadow-sm">
          {/* Header Hours Row */}
          <div className="grid grid-cols-[140px_repeat(16,_minmax(80px,_1fr))] border-b border-cinema-border pb-3 text-xs font-semibold text-slate-400">
            <div className="text-left font-bold text-white">Auditorium</div>
            {HOURS.map((h) => (
              <div key={h} className="text-center">
                {h.toString().padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {/* Screen Rows */}
          <div className="divide-y divide-cinema-border/50">
            {screens.map((screen) => {
              const sId = screen._id || screen.id;
              // Filter shows belonging to this screen
              const screenShows = shows.filter(
                (s) => (s.screenId?._id || s.screenId) === sId
              );

              return (
                <div
                  key={sId}
                  className="grid grid-cols-[140px_repeat(16,_minmax(80px,_1fr))] py-4 items-center relative min-h-[72px]"
                >
                  {/* Screen Label */}
                  <div className="text-xs font-bold text-white pr-2 truncate">
                    {screen.name}
                    <p className="text-[10px] text-slate-500 font-normal">{screen.projectionType || '2D'}</p>
                  </div>

                  {/* Hourly Cells with scheduled blocks */}
                  <div className="col-span-16 relative h-12 flex items-center">
                    {screenShows.map((show) => {
                      const start = new Date(show.startTime);
                      const end = new Date(show.endTime);
                      const startHour = start.getHours() + start.getMinutes() / 60;
                      const endHour = end.getHours() + end.getMinutes() / 60;

                      // Position relative to 8 AM (8.0 to 24.0)
                      const leftPercent = Math.max(0, ((startHour - 8) / 16) * 100);
                      const widthPercent = Math.max(4, ((endHour - startHour) / 16) * 100);

                      return (
                        <Link
                          key={show._id || show.id}
                          to={`/shows/${show._id || show.id}/pricing`}
                          className="absolute h-10 rounded-lg p-2 bg-partner-600/30 border border-partner-500 hover:bg-partner-600/50 transition-all flex flex-col justify-center overflow-hidden z-10"
                          style={{
                            left: `${leftPercent}%`,
                            width: `${widthPercent}%`
                          }}
                          title={`${show.movieTitle} (${formatTime(show.startTime)} - ${formatTime(show.endTime)})`}
                        >
                          <span className="text-[11px] font-bold text-white truncate leading-none">
                            {show.movieTitle || show.movieId?.title || 'Screening'}
                          </span>
                          <span className="text-[9px] text-slate-300 leading-none mt-1 truncate">
                            {formatTime(show.startTime)}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default ShowCalendarPage;

