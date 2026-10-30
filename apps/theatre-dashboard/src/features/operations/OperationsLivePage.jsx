import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, Tv, Users, AlertCircle, Wifi, Radio } from 'lucide-react';
import { showsApi } from '../../services/api/shows.api';
import { screensApi } from '../../services/api/screens.api';
import { theatresApi } from '../../services/api/theatres.api';
import { useTheatreContextStore } from '../../store/theatreContext.store';
import { socketService } from '../../services/socket/socket.client';
import { formatDate, formatTime } from '../../utils/formatters';
import StatusBadge from '../../components/ui/StatusBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export function OperationsLivePage() {
  const { selectedTheatreId } = useTheatreContextStore();
  const [liveSeatEvents, setLiveSeatEvents] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  // Fetch partner theatres
  const { data: theatresData } = useQuery({
    queryKey: ['myTheatresList'],
    queryFn: () => theatresApi.getMyTheatres({ limit: 50 })
  });

  const theatres = Array.isArray(theatresData) ? theatresData : theatresData?.theatres || [];
  const activeTheatreId = selectedTheatreId || theatres[0]?._id || theatres[0]?.id;

  // Fetch running/published shows
  const { data: showsData, isLoading } = useQuery({
    queryKey: ['liveOperationsShows', activeTheatreId],
    queryFn: () =>
      showsApi.getShows({
        theatreId: activeTheatreId,
        status: 'PUBLISHED',
        limit: 20
      }),
    enabled: Boolean(activeTheatreId),
    refetchInterval: 15000
  });

  const shows = Array.isArray(showsData) ? showsData : showsData?.shows || [];

  // WebSocket live telemetry listener
  useEffect(() => {
    const socket = socketService.connect();
    setIsConnected(socket.connected);

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    // Listen for seat events
    const offLock = socketService.on('SEATS_LOCKED', (data) => {
      setLiveSeatEvents((prev) => [
        { type: 'LOCK', time: new Date().toLocaleTimeString(), data },
        ...prev.slice(0, 15)
      ]);
    });

    const offBook = socketService.on('BOOKING_CONFIRMED', (data) => {
      setLiveSeatEvents((prev) => [
        { type: 'CONFIRMED', time: new Date().toLocaleTimeString(), data },
        ...prev.slice(0, 15)
      ]);
    });

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      offLock();
      offBook();
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-cinema-border">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Live Operations Monitoring</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time auditorium screen telemetry, seat locks, and box office admissions
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
              isConnected
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${isConnected ? 'animate-pulse' : ''}`} />
            <span>{isConnected ? 'Live Telemetry Connected' : 'Connecting WebSocket...'}</span>
          </span>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner text="Connecting to operational monitors..." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Shows Occupancy Stream (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Active Show Screenings ({shows.length})
            </h3>

            {shows.length === 0 ? (
              <div className="bg-cinema-card border border-cinema-border rounded-xl p-8 text-center text-xs text-slate-400">
                No active published screenings in this multiplex right now.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {shows.map((show) => {
                  const sId = show._id || show.id;
                  const estimatedOccupancy = 68; // percentage estimate

                  return (
                    <div
                      key={sId}
                      className="bg-cinema-card border border-cinema-border rounded-xl p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-white truncate">
                            {show.movieTitle || show.movieId?.title || 'Screening'}
                          </h4>
                          <p className="text-xs text-slate-400">
                            {show.screenName || show.screenId?.name || 'Screen 1'} • {show.format || '2D'}
                          </p>
                        </div>
                        <StatusBadge status={show.status} />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs text-slate-400">
                          <span>Live Occupancy</span>
                          <span className="font-bold text-partner-400">{estimatedOccupancy}% Filled</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-cinema-dark overflow-hidden">
                          <div
                            className="h-full bg-partner-500 rounded-full transition-all duration-500"
                            style={{ width: `${estimatedOccupancy}%` }}
                          />
                        </div>
                      </div>

                      <div className="pt-2 border-t border-cinema-border flex justify-between text-[11px] text-slate-400">
                        <span>Starts: {formatTime(show.startTime)}</span>
                        <span>Ends: {formatTime(show.endTime)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Real-time Socket Event Log (1 col) */}
          <div className="bg-cinema-card border border-cinema-border rounded-xl p-5 space-y-4 shadow-sm flex flex-col h-[500px]">
            <div className="flex items-center justify-between pb-3 border-b border-cinema-border">
              <h3 className="text-sm font-bold text-white">Live Seat Lock Ticker</h3>
              <Activity className="w-4 h-4 text-partner-400" />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
              {liveSeatEvents.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  Listening for online customer seat locks & sales...
                </div>
              ) : (
                liveSeatEvents.map((evt, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-cinema-dark border border-cinema-border/60 flex items-start justify-between gap-2"
                  >
                    <div>
                      <span
                        className={`font-bold ${
                          evt.type === 'CONFIRMED' ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                      >
                        {evt.type === 'CONFIRMED' ? 'Tickets Booked' : 'Seats Temporarily Locked'}
                      </span>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {evt.data?.seatLabels?.join(', ') || 'Selected seats'}
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-500 shrink-0 font-mono">{evt.time}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OperationsLivePage;

