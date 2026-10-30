import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import MovieCard from './MovieCard';
import { MovieCardSkeleton } from '../common/Skeleton';

export function MovieCarousel({
  title,
  subtitle,
  viewAllLink,
  movies = [],
  isLoading = false
}) {
  const scrollRef = useRef(null);

  const handleScroll = direction => {
    if (scrollRef.current) {
      const scrollAmount = 350;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  if (!isLoading && (!movies || movies.length === 0)) {
    return null;
  }

  return (
    <section className="my-8 sm:my-12">
      {/* Header */}
      <div className="flex items-end justify-between mb-4 sm:mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {viewAllLink && (
            <Link
              to={viewAllLink}
              className="text-xs sm:text-sm font-semibold text-brand hover:underline"
            >
              See All &rarr;
            </Link>
          )}

          {/* Carousel Arrows */}
          <div className="hidden sm:flex items-center gap-1.5">
            <button
              onClick={() => handleScroll('left')}
              className="p-1.5 rounded-lg bg-cinema-card border border-cinema-border text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              title="Previous"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleScroll('right')}
              className="p-1.5 rounded-lg bg-cinema-card border border-cinema-border text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              title="Next"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Carousel Track */}
      <div
        ref={scrollRef}
        className="flex gap-4 sm:gap-6 overflow-x-auto pb-4 pt-1 -mx-4 px-4 sm:-mx-0 sm:px-0 scrollbar-none scroll-smooth snap-x snap-mandatory"
      >
        {isLoading ? (
          Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="min-w-[160px] sm:min-w-[200px] max-w-[200px] flex-shrink-0"
            >
              <MovieCardSkeleton />
            </div>
          ))
        ) : (
          movies.map(movie => (
            <div
              key={movie._id || movie.slug}
              className="min-w-[160px] sm:min-w-[200px] max-w-[200px] flex-shrink-0 snap-start"
            >
              <MovieCard movie={movie} />
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export default MovieCarousel;

