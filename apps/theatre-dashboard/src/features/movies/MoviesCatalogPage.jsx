import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Film, Calendar, Clock, Plus, Search, Tag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { moviesApi } from '../../services/api/movies.api';
import { formatDuration, formatDate } from '../../utils/formatters';
import { useAuthStore, Permissions } from '../../store/auth.store';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export function MoviesCatalogPage() {
  const { hasPermission } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: moviesData, isLoading } = useQuery({
    queryKey: ['approvedMoviesCatalog'],
    queryFn: () => moviesApi.getApprovedMovies({ limit: 100 })
  });

  const movies = Array.isArray(moviesData)
    ? moviesData
    : moviesData?.movies || [];

  const filteredMovies = movies.filter((m) =>
    m.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-cinema-border">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Approved Movie Catalog</h1>
          <p className="text-xs text-slate-400 mt-1">
            Master movie titles licensed and approved for exhibitor screening
          </p>
        </div>

        <div className="w-full sm:w-64">
          <Input
            placeholder="Search catalog titles..."
            icon={Search}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner text="Retrieving approved movie catalog..." />
      ) : filteredMovies.length === 0 ? (
        <div className="bg-cinema-card border border-cinema-border rounded-xl p-12 text-center space-y-4">
          <Film className="w-12 h-12 text-slate-500 mx-auto" />
          <h3 className="text-base font-bold text-white">No Movies Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchTerm ? 'No titles match your search criteria.' : 'No movies currently released or approved for exhibition.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredMovies.map((movie) => {
            const mId = movie._id || movie.id;
            return (
              <div
                key={mId}
                className="bg-cinema-card border border-cinema-border rounded-xl overflow-hidden flex flex-col justify-between hover:border-slate-600 transition-all shadow-sm group"
              >
                {/* Poster / Thumbnail */}
                <div className="aspect-[2/3] bg-cinema-dark relative overflow-hidden">
                  {movie.posterUrl ? (
                    <img
                      src={movie.posterUrl}
                      alt={movie.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 gap-2">
                      <Film className="w-10 h-10" />
                      <span className="text-xs">No Poster Available</span>
                    </div>
                  )}

                  {/* Certification Badge */}
                  {movie.certificate && (
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-bold bg-black/80 backdrop-blur-sm border border-white/20 text-white">
                      {movie.certificate}
                    </span>
                  )}
                </div>

                {/* Details */}
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-tight line-clamp-1 group-hover:text-brand transition-colors">
                      {movie.title}
                    </h3>

                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-2">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>{formatDuration(movie.duration)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Tag className="w-3.5 h-3.5 text-slate-500" />
                        <span>{movie.languages?.[0] || 'Hindi'}</span>
                      </div>
                    </div>

                    {movie.genres && movie.genres.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2.5">
                        {movie.genres.slice(0, 2).map((g, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded text-[10px] font-semibold bg-cinema-elevated text-slate-300"
                          >
                            {typeof g === 'object' ? g.name : g}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-cinema-border">
                    {hasPermission(Permissions.SHOW_CREATE) ? (
                      <Link to={`/shows/create?movieId=${mId}`} className="block">
                        <Button size="sm" variant="secondary" className="w-full text-xs" icon={Plus}>
                          Schedule Screening
                        </Button>
                      </Link>
                    ) : (
                      <span className="text-xs text-slate-500 block text-center">Licensed Title</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default MoviesCatalogPage;

