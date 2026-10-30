import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import MovieCard from '../../components/movie/MovieCard';
import { MovieCardSkeleton } from '../../components/common/Skeleton';
import EmptyState from '../../components/common/EmptyState';
import discoveryApi from '../../services/api/discovery.api';

export function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';

  const { data: searchData, isLoading } = useQuery({
    queryKey: ['search-results', query],
    queryFn: () => discoveryApi.searchMovies({ q: query }),
    enabled: !!query.trim()
  });

  const movies = searchData?.data || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="border-b border-cinema-border pb-4">
        <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
          <Search className="w-5 h-5 text-brand" />
          <span>Search Results for "{query}"</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          {isLoading
            ? 'Searching...'
            : `Found ${movies.length} matching title${movies.length === 1 ? '' : 's'}`}
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <MovieCardSkeleton key={i} />
          ))}
        </div>
      ) : movies.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
          {movies.map(movie => (
            <MovieCard key={movie._id || movie.slug} movie={movie} />
          ))}
        </div>
      ) : (
        <EmptyState
          title={`No results found for "${query}"`}
          description="Check the spelling or try searching for another actor, director, or title."
        />
      )}
    </div>
  );
}

export default SearchPage;

