import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Film, Sparkles, TrendingUp, Calendar, MapPin, Play, ChevronRight, Compass } from 'lucide-react';
import MovieCarousel from '../../components/movie/MovieCarousel';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import { BannerSkeleton } from '../../components/common/Skeleton';
import { useCityStore } from '../../store/city.store';
import { useAuthStore } from '../../store/auth.store';
import moviesApi from '../../services/api/movies.api';
import discoveryApi from '../../services/api/discovery.api';
import theatresApi from '../../services/api/theatres.api';
import { formatDate } from '../../utils/formatters';

export function HomePage() {
  const { currentCity } = useCityStore();
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const [heroIndex, setHeroIndex] = useState(0);

  // 1. Fetch Now Showing Movies
  const { data: nowShowingData, isLoading: loadingNowShowing } = useQuery({
    queryKey: ['movies', 'now-showing', currentCity?._id],
    queryFn: () => moviesApi.getNowShowing({ cityId: currentCity?._id, limit: 10 }),
    staleTime: 5 * 60 * 1000
  });

  // 2. Fetch Trending Movies
  const { data: trendingData, isLoading: loadingTrending } = useQuery({
    queryKey: ['movies', 'trending'],
    queryFn: () => moviesApi.getTrending({ limit: 10 }),
    staleTime: 5 * 60 * 1000
  });

  // 3. Fetch Upcoming Movies
  const { data: upcomingData, isLoading: loadingUpcoming } = useQuery({
    queryKey: ['movies', 'upcoming'],
    queryFn: () => moviesApi.getUpcoming({ limit: 10 }),
    staleTime: 10 * 60 * 1000
  });

  // 4. Fetch Recommended Movies
  const { data: recommendationsData, isLoading: loadingRecommendations } = useQuery({
    queryKey: ['movies', 'recommendations', currentCity?._id],
    queryFn: () => discoveryApi.getRecommendations({ cityId: currentCity?._id, limit: 10 }),
    staleTime: 5 * 60 * 1000
  });

  // 5. Fetch Movie Genres
  const { data: genresData } = useQuery({
    queryKey: ['genres'],
    queryFn: () => moviesApi.getGenres(),
    staleTime: 30 * 60 * 1000
  });

  // 6. Fetch Popular Theatres in City
  const { data: theatresData, isLoading: loadingTheatres } = useQuery({
    queryKey: ['theatres', currentCity?._id],
    queryFn: () => theatresApi.getTheatres({ cityId: currentCity?._id, limit: 6 }),
    staleTime: 10 * 60 * 1000
  });

  // 7. Fetch Recently Viewed Movies (if authenticated)
  const { data: recentlyViewedData } = useQuery({
    queryKey: ['recently-viewed', isAuthenticated],
    queryFn: () => discoveryApi.getRecentlyViewed(),
    enabled: !!isAuthenticated,
    staleTime: 2 * 60 * 1000
  });

  const nowShowingMovies = nowShowingData?.data || [];
  const trendingMovies = trendingData?.data || [];
  const upcomingMovies = upcomingData?.data || [];
  const recommendedMovies = recommendationsData?.data || [];
  const genres = genresData?.data || [
    { _id: '1', name: 'Action' },
    { _id: '2', name: 'Drama' },
    { _id: '3', name: 'Comedy' },
    { _id: '4', name: 'Thriller' },
    { _id: '5', name: 'Sci-Fi' },
    { _id: '6', name: 'Romance' }
  ];
  const theatres = theatresData?.data || [];
  const recentlyViewed = recentlyViewedData?.data || [];

  // Hero feature movies: top 3 from trending or now showing
  const heroMovies = (trendingMovies.length > 0 ? trendingMovies : nowShowingMovies).slice(0, 4);
  const activeHero = heroMovies[heroIndex] || heroMovies[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-12">
      {/* Hero Banner Section */}
      {loadingTrending && heroMovies.length === 0 ? (
        <BannerSkeleton />
      ) : activeHero ? (
        <div className="relative w-full rounded-2xl overflow-hidden bg-cinema-darkest border border-cinema-border shadow-2xl min-h-[380px] sm:min-h-[440px] flex items-end">
          {/* Backdrop Image with gradient overlay */}
          <div className="absolute inset-0">
            {activeHero.backdropUrl || activeHero.posterUrl ? (
              <img
                src={activeHero.backdropUrl || activeHero.posterUrl}
                alt={activeHero.title}
                className="w-full h-full object-cover object-top opacity-35"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-red-950/40 to-slate-900" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F19] via-[#0B0F19]/80 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0B0F19] via-[#0B0F19]/50 to-transparent" />
          </div>

          {/* Banner Content */}
          <div className="relative z-10 p-6 sm:p-10 max-w-2xl space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="brand" size="sm">
                FEATURED PREMIERE
              </Badge>
              {activeHero.censorRating && (
                <Badge variant="default" size="sm" className="bg-black/60 text-white font-bold">
                  {activeHero.censorRating}
                </Badge>
              )}
              {activeHero.language && (
                <span className="text-xs text-slate-300 font-medium">
                  • {activeHero.language}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              {activeHero.title}
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 line-clamp-2 max-w-xl">
              {activeHero.description ||
                'Experience the cinematic spectacle on the big screen with Dolby Atmos and IMAX precision.'}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button
                variant="primary"
                size="md"
                onClick={() => navigate(`/movies/${activeHero.slug || activeHero._id}`)}
              >
                Book Tickets Now
              </Button>
              <Button
                variant="secondary"
                size="md"
                onClick={() => navigate(`/movies/${activeHero.slug || activeHero._id}`)}
              >
                View Details
              </Button>
            </div>
          </div>

          {/* Hero Indicator Tabs (dots) */}
          {heroMovies.length > 1 && (
            <div className="absolute bottom-6 right-6 z-20 flex items-center gap-2">
              {heroMovies.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setHeroIndex(idx)}
                  className={`h-2 rounded-full transition-all ${
                    heroIndex === idx ? 'w-6 bg-brand' : 'w-2 bg-slate-600 hover:bg-slate-400'
                  }`}
                  title={`Slide ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      ) : null}

      {/* Recommended For You Carousel */}
      <MovieCarousel
        title="Recommended Movies"
        subtitle={`Personalized picks for cinema lovers in ${currentCity?.name || 'your city'}`}
        viewAllLink="/movies"
        movies={recommendedMovies.length > 0 ? recommendedMovies : nowShowingMovies}
        isLoading={loadingRecommendations && loadingNowShowing}
      />

      {/* Now Showing Section */}
      <MovieCarousel
        title="Now Showing in Theatres"
        subtitle={`Current screenings in ${currentCity?.name || 'Mumbai'}`}
        viewAllLink="/movies?status=NOW_SHOWING"
        movies={nowShowingMovies}
        isLoading={loadingNowShowing}
      />

      {/* Explore by Genre Strip */}
      <section className="bg-cinema-card border border-cinema-border rounded-2xl p-6 sm:p-8">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span>Explore by Genre</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Find films tailored to your mood and taste
            </p>
          </div>
          <Link
            to="/movies"
            className="text-xs font-semibold text-brand hover:underline"
          >
            All Genres &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {genres.slice(0, 6).map(genre => (
            <button
              key={genre._id || genre.name}
              onClick={() => navigate(`/movies?genre=${encodeURIComponent(genre.name)}`)}
              className="p-3.5 rounded-xl bg-cinema-elevated/70 border border-cinema-border/80 text-left hover:border-brand hover:bg-cinema-elevated transition-all group"
            >
              <Film className="w-4 h-4 text-brand mb-2 group-hover:scale-110 transition-transform" />
              <p className="font-semibold text-xs text-slate-200 group-hover:text-white">
                {genre.name}
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* Trending Movies Section */}
      <MovieCarousel
        title="Trending Movies"
        subtitle="Most watched and discussed films this week"
        viewAllLink="/movies?sort=trending"
        movies={trendingMovies}
        isLoading={loadingTrending}
      />

      {/* Popular Theatres Section */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Compass className="w-6 h-6 text-sky-400" />
              <span>Popular Theatres in {currentCity?.name || 'City'}</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Top reviewed cinema multiplexes and IMAX venues
            </p>
          </div>
          <Link
            to="/theatres"
            className="text-xs sm:text-sm font-semibold text-brand hover:underline"
          >
            View All Theatres &rarr;
          </Link>
        </div>

        {loadingTheatres ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-28 rounded-xl bg-slate-800 animate-pulse" />
            ))}
          </div>
        ) : theatres.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {theatres.map(theatre => (
              <div
                key={theatre._id}
                onClick={() => navigate(`/theatres/id/${theatre._id}`)}
                className="group cursor-pointer bg-cinema-card border border-cinema-border rounded-xl p-5 hover:border-slate-500 transition-all flex flex-col justify-between"
              >
                <div>
                  <h3 className="font-bold text-base text-slate-100 group-hover:text-brand transition-colors">
                    {theatre.name}
                  </h3>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-brand flex-shrink-0" />
                    <span className="truncate">
                      {theatre.address?.area || theatre.address?.street || currentCity?.name}
                    </span>
                  </p>
                </div>
                <div className="flex items-center justify-between pt-4 mt-4 border-t border-cinema-border/60 text-xs">
                  <span className="text-emerald-400 font-medium">M-Ticket & F&B</span>
                  <span className="text-slate-400 group-hover:text-white flex items-center gap-0.5 font-medium">
                    Showtimes <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-xl bg-cinema-card/50 border border-cinema-border text-center text-xs text-slate-400">
            No partner multiplexes registered yet in {currentCity?.name}. Try switching city to Mumbai or Delhi.
          </div>
        )}
      </section>

      {/* Upcoming Movies Section */}
      <MovieCarousel
        title="Upcoming Releases"
        subtitle="Blockbusters hitting the silver screen soon"
        viewAllLink="/movies?status=UPCOMING"
        movies={upcomingMovies}
        isLoading={loadingUpcoming}
      />

      {/* Recently Viewed Carousel (if any) */}
      {recentlyViewed.length > 0 && (
        <MovieCarousel
          title="Recently Viewed Movies"
          subtitle="Continue where you left off"
          movies={recentlyViewed}
          isLoading={false}
        />
      )}
    </div>
  );
}

export default HomePage;

