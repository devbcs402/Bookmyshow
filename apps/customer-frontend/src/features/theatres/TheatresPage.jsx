import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { MapPin, Search, ChevronRight, Smartphone, Utensils, Volume2 } from 'lucide-react';
import { useCityStore } from '../../store/city.store';
import theatresApi from '../../services/api/theatres.api';
import EmptyState from '../../components/common/EmptyState';

export function TheatresPage() {
  const { currentCity } = useCityStore();
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const { data: theatresData, isLoading } = useQuery({
    queryKey: ['theatres-list', currentCity?._id, searchTerm],
    queryFn: () =>
      theatresApi.getTheatres({
        cityId: currentCity?._id,
        search: searchTerm || undefined
      })
  });

  const theatres = theatresData?.data || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-cinema-border pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
            <MapPin className="w-6 h-6 text-brand" />
            <span>Cinemas in {currentCity?.name || 'City'}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Browse verified multiplexes, IMAX screens, and boutique cinemas
          </p>
        </div>

        {/* Search within Theatres */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search theatre or area..."
            className="w-full bg-cinema-card border border-cinema-border rounded-lg pl-9 pr-4 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand"
          />
        </div>
      </div>

      {/* Theatres Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 rounded-xl bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : theatres.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {theatres.map(theatre => {
            const address = theatre.address
              ? `${theatre.address.street ? theatre.address.street + ', ' : ''}${theatre.address.area || ''}`
              : '';
            const facilities = theatre.facilities || ['M-Ticket', 'Food & Beverage', 'Dolby Atmos'];

            return (
              <div
                key={theatre._id}
                onClick={() => navigate(`/theatres/id/${theatre._id}`)}
                className="group cursor-pointer bg-cinema-card border border-cinema-border rounded-xl p-5 hover:border-slate-500 transition-all flex flex-col justify-between"
              >
                <div>
                  <h3 className="font-bold text-base text-slate-100 group-hover:text-brand transition-colors">
                    {theatre.name}
                  </h3>
                  {address && (
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-1.5 line-clamp-2">
                      <MapPin className="w-3.5 h-3.5 text-brand flex-shrink-0" />
                      <span>{address}</span>
                    </p>
                  )}
                  {theatre.screensCount && (
                    <p className="text-[11px] text-slate-500 mt-2 font-medium">
                      {theatre.screensCount} Cinema Screens Available
                    </p>
                  )}
                </div>

                <div className="pt-4 mt-4 border-t border-cinema-border/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                      <Smartphone className="w-3 h-3" />
                      M-Ticket
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-amber-400">
                      <Utensils className="w-3 h-3" />
                      F&B
                    </span>
                  </div>
                  <span className="text-slate-400 group-hover:text-white flex items-center font-medium">
                    View Shows <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={MapPin}
          title="No theatres found"
          description={`No cinema complexes match "${searchTerm}" in ${currentCity?.name}. Try clearing search or choosing another city.`}
        />
      )}
    </div>
  );
}

export default TheatresPage;

