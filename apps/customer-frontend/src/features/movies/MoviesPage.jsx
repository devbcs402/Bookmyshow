import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Film, Filter, SlidersHorizontal, X } from 'lucide-react';
import MovieCard from '../../components/movie/MovieCard';
import { MovieCardSkeleton } from '../../components/common/Skeleton';
import EmptyState from '../../components/common/EmptyState';
import Button from '../../components/common/Button';
import { useCityStore } from '../../store/city.store';
import moviesApi from '../../services/api/movies.api';

export function MoviesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentCity } = useCityStore();

  const selectedGenre = searchParams.get('genre') || '';
  const selectedLanguage = searchParams.get('language') || '';
  const selectedStatus = searchParams.get('status') || '';
  const searchQuery = searchParams.get('q') || '';
  const sortBy = searchParams.get('sort') || 'popularity';
  const page = parseInt(searchParams.get('page') || '1', 10);

  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Fetch Genres & Languages filters
  const { data: genresData } = useQuery({
    queryKey: ['genres'],
    queryFn: () => moviesApi.getGenres(),
    staleTime: 30 * 60 * 1000
  });

  const { data: languagesData } = useQuery({
    queryKey: ['languages'],
    queryFn: () => moviesApi.getLanguages(),
    staleTime: 30 * 60 * 1000
  });

  // Fetch Movie Catalog with active filters
  const { data: catalogData, isLoading } = useQuery({
    queryKey: [
      'movies-catalog',
      {
        genre: selectedGenre,
        language: selectedLanguage,
        status: selectedStatus,
        search: searchQuery,
        sort: sortBy,
        page,
        cityId: currentCity?._id
      }
    ],
    queryFn: () =>
      moviesApi.getMovies({
        genre: selectedGenre || undefined,
        language: selectedLanguage || undefined,
        status: selectedStatus || undefined,
        search: searchQuery || undefined,
        sort: sortBy,
        page,
        limit: 12
      })
  });

  const movies = catalogData?.data || [];
  const meta = catalogData?.meta || { totalPages: 1, currentPage: 1 };
  const genres = genresData?.data || [];
  const languages = languagesData?.data || [];

  const updateFilter = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const clearAllFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  const hasActiveFilters = Boolean(
    selectedGenre || selectedLanguage || selectedStatus || searchQuery
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Bar: Title & Sorting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Film className="w-6 h-6 text-brand" />
            <span>Movies in {currentCity?.name || 'All Cities'}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Discover latest theatrical blockbusters and book tickets instantly
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Mobile Filter Toggle Button */}
          <button
            onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
            className="md:hidden flex items-center gap-2 px-3 py-2 rounded-lg bg-cinema-card border border-cinema-border text-xs text-slate-200"
          >
            <SlidersHorizontal className="w-4 h-4 text-brand" />
            <span>Filters</span>
          </button>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 hidden sm:inline">Sort:</span>
            <select
              value={sortBy}
              onChange={e => updateFilter('sort', e.target.value)}
              className="bg-cinema-card border border-cinema-border rounded-lg px-3 py-1.5 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-brand"
            >
              <option value="popularity">Most Popular</option>
              <option value="releaseDate">Release Date</option>
              <option value="title">Title (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Layout Grid (Filter Sidebar + Movie Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Sidebar Filters (Desktop & Mobile Drawer) */}
        <aside
          className={`space-y-6 ${
            isMobileFilterOpen
              ? 'block fixed inset-0 z-50 bg-[#0B0F19] p-6 overflow-y-auto'
              : 'hidden md:block'
          }`}
        >
          {isMobileFilterOpen && (
            <div className="flex items-center justify-between pb-4 border-b border-cinema-border md:hidden">
              <h3 className="font-bold text-lg text-white">Filter Movies</h3>
              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="p-1 rounded text-slate-400"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          )}

          {/* Clear Filters Header */}
          {hasActiveFilters && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-brand/10 border border-brand/20">
              <span className="text-xs text-brand font-medium">Filters Applied</span>
              <button
                onClick={clearAllFilters}
                className="text-xs text-slate-300 hover:text-white underline"
              >
                Clear All
              </button>
            </div>
          )}

          {/* Status Filter */}
          <div className="bg-cinema-card border border-cinema-border rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Status
            </h4>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() =>
                  updateFilter('status', selectedStatus === 'NOW_SHOWING' ? '' : 'NOW_SHOWING')
                }
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  selectedStatus === 'NOW_SHOWING'
                    ? 'bg-brand text-white border-brand'
                    : 'bg-cinema-elevated/80 border-cinema-border text-slate-300 hover:text-white'
                }`}
              >
                Now Showing
              </button>
              <button
                onClick={() =>
                  updateFilter('status', selectedStatus === 'UPCOMING' ? '' : 'UPCOMING')
                }
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  selectedStatus === 'UPCOMING'
                    ? 'bg-brand text-white border-brand'
                    : 'bg-cinema-elevated/80 border-cinema-border text-slate-300 hover:text-white'
                }`}
              >
                Upcoming
              </button>
            </div>
          </div>

          {/* Genres Filter */}
          <div className="bg-cinema-card border border-cinema-border rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Genres
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {genres.map(genre => {
                const isSelected = selectedGenre === genre.name;
                return (
                  <button
                    key={genre._id || genre.name}
                    onClick={() => updateFilter('genre', isSelected ? '' : genre.name)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                      isSelected
                        ? 'bg-brand text-white border-brand'
                        : 'bg-cinema-elevated/60 border-cinema-border text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {genre.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Languages Filter */}
          <div className="bg-cinema-card border border-cinema-border rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Languages
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {languages.map(lang => {
                const name = lang.name || lang;
                const isSelected = selectedLanguage === name;
                return (
                  <button
                    key={lang._id || name}
                    onClick={() => updateFilter('language', isSelected ? '' : name)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                      isSelected
                        ? 'bg-brand text-white border-brand'
                        : 'bg-cinema-elevated/60 border-cinema-border text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          </div>

          {isMobileFilterOpen && (
            <Button
              variant="primary"
              fullWidth
              size="lg"
              onClick={() => setIsMobileFilterOpen(false)}
            >
              Apply Filters
            </Button>
          )}
        </aside>

        {/* Movie Grid */}
        <main className="md:col-span-3 space-y-8">
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <MovieCardSkeleton key={i} />
              ))}
            </div>
          ) : movies.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {movies.map(movie => (
                  <MovieCard key={movie._id || movie.slug} movie={movie} />
                ))}
              </div>

              {/* Pagination */}
              {meta.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-8">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => updateFilter('page', String(page - 1))}
                  >
                    Previous
                  </Button>
                  <span className="text-xs text-slate-400 px-3">
                    Page {page} of {meta.totalPages}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page >= meta.totalPages}
                    onClick={() => updateFilter('page', String(page + 1))}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          ) : (
            <EmptyState
              title="No movies found"
              description="No movies match your selected filter criteria. Try clearing some filters or searching for something else."
              actionText="Reset Filters"
              onAction={clearAllFilters}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default MoviesPage;

