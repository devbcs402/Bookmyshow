import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Film,
  Calendar,
  Clock,
  Heart,
  Share2,
  Play,
  MapPin,
  Check,
  Sparkles,
  Users
} from 'lucide-react';
import moviesApi from '../../services/api/movies.api';
import showsApi from '../../services/api/shows.api';
import discoveryApi from '../../services/api/discovery.api';
import wishlistApi from '../../services/api/wishlist.api';
import { useCityStore } from '../../store/city.store';
import DateSelector from '../../components/show/DateSelector';
import TheatreCard from '../../components/theatre/TheatreCard';
import MovieCarousel from '../../components/movie/MovieCarousel';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import { formatDate, formatDuration } from '../../utils/formatters';

export function MovieDetailsPage() {
  const { movieSlug } = useParams();
  const { currentCity } = useCityStore();
  const navigate = useNavigate();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isTrailerOpen, setIsTrailerOpen] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);

  // 1. Fetch Movie Details
  const {
    data: movieData,
    isLoading: loadingMovie,
    error: movieError
  } = useQuery({
    queryKey: ['movie-details', movieSlug],
    queryFn: () => moviesApi.getMovieBySlug(movieSlug)
  });

  const movie = movieData?.data;

  // Track user viewing impression
  useEffect(() => {
    if (movie?._id) {
      discoveryApi.trackMovieView(movie._id);
      setIsWishlisted(wishlistApi.isInWishlist(movie._id));
    }
  }, [movie?._id]);

  // 2. Fetch Shows for this Movie in Current City on Selected Date
  const dateString = selectedDate.toISOString().split('T')[0];
  const {
    data: showsData,
    isLoading: loadingShows
  } = useQuery({
    queryKey: ['movie-shows', movie?._id, currentCity?._id, dateString],
    queryFn: () =>
      showsApi.getMovieShows(movie._id, {
        cityId: currentCity?._id,
        date: dateString
      }),
    enabled: !!movie?._id
  });

  // 3. Fetch Similar Movies
  const { data: similarData } = useQuery({
    queryKey: ['similar-movies', movie?._id],
    queryFn: () => moviesApi.getSimilarMovies(movie._id),
    enabled: !!movie?._id
  });

  const shows = showsData?.data || [];
  const similarMovies = similarData?.data || [];

  // Group shows by Theatre
  const theatresMap = new Map();
  shows.forEach(show => {
    const theatre = show.theatre || {
      _id: show.theatreId,
      name: show.theatreName || 'Cinema Multiplex',
      address: show.theatreAddress
    };
    if (!theatresMap.has(theatre._id)) {
      theatresMap.set(theatre._id, {
        theatre,
        shows: []
      });
    }
    theatresMap.get(theatre._id).shows.push(show);
  });
  const theatreList = Array.from(theatresMap.values());

  const handleWishlistToggle = () => {
    if (!movie) return;
    wishlistApi.toggleWishlist(movie);
    setIsWishlisted(!isWishlisted);
  };

  if (loadingMovie) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 animate-pulse space-y-6">
        <div className="w-full h-80 bg-slate-800 rounded-2xl" />
        <div className="w-1/3 h-8 bg-slate-800 rounded" />
      </div>
    );
  }

  if (movieError || !movie) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-2xl font-bold text-white">Movie Not Found</h2>
        <p className="text-sm text-slate-400">
          The movie you are looking for is either unpublished or does not exist.
        </p>
        <Button variant="primary" size="md" onClick={() => navigate('/movies')}>
          Browse Movies
        </Button>
      </div>
    );
  }

  const posterUrl = movie.posterUrl || movie.poster || '';
  const backdropUrl = movie.backdropUrl || posterUrl;
  const genres = Array.isArray(movie.genres) ? movie.genres : [movie.genre].filter(Boolean);
  const languages = Array.isArray(movie.languages) ? movie.languages : [movie.language].filter(Boolean);
  const durationText = formatDuration(movie.duration || movie.runtimeMinutes);

  return (
    <div className="space-y-10 pb-20">
      {/* Hero Backdrop Banner */}
      <div className="relative w-full bg-cinema-darkest border-b border-cinema-border overflow-hidden">
        {/* Blurred Backdrop */}
        <div className="absolute inset-0 z-0">
          {backdropUrl && (
            <img
              src={backdropUrl}
              alt=""
              className="w-full h-full object-cover object-center opacity-25 filter blur-sm scale-105"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F19] via-[#0B0F19]/85 to-[#0B0F19]/60" />
        </div>

        {/* Content Container */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Movie Poster */}
            <div className="w-48 sm:w-64 aspect-[2/3] rounded-2xl overflow-hidden bg-cinema-card border-2 border-cinema-border/80 shadow-2xl flex-shrink-0 relative group">
              {posterUrl ? (
                <img
                  src={posterUrl}
                  alt={movie.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500">
                  <Film className="w-12 h-12" />
                </div>
              )}

              {movie.trailerUrl && (
                <button
                  onClick={() => setIsTrailerOpen(true)}
                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-2"
                >
                  <div className="w-12 h-12 rounded-full bg-brand flex items-center justify-center text-white shadow-cinema-glow">
                    <Play className="w-5 h-5 ml-1" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Watch Trailer
                  </span>
                </button>
              )}
            </div>

            {/* Movie Details */}
            <div className="flex-1 space-y-4">
              <div className="flex flex-wrap items-center gap-2.5">
                {movie.censorRating && (
                  <Badge variant="default" size="sm" className="bg-white/10 text-white font-bold">
                    {movie.censorRating}
                  </Badge>
                )}
                {movie.status === 'NOW_SHOWING' ? (
                  <Badge variant="success" size="sm">
                    NOW IN THEATRES
                  </Badge>
                ) : (
                  <Badge variant="brand" size="sm">
                    UPCOMING RELEASE
                  </Badge>
                )}
              </div>

              <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                {movie.title}
              </h1>

              {/* Metadata Pill Strip */}
              <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-slate-300">
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4 text-brand" />
                  {durationText}
                </span>
                <span>•</span>
                <span>{genres.join(', ')}</span>
                <span>•</span>
                <span>{languages.join(', ')}</span>
                {movie.releaseDate && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-brand" />
                      {formatDate(movie.releaseDate)}
                    </span>
                  </>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => {
                    const showSection = document.getElementById('showtimes-section');
                    if (showSection) {
                      showSection.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                >
                  Book Tickets
                </Button>

                {movie.trailerUrl && (
                  <Button
                    variant="secondary"
                    size="lg"
                    leftIcon={Play}
                    onClick={() => setIsTrailerOpen(true)}
                  >
                    Trailer
                  </Button>
                )}

                <button
                  onClick={handleWishlistToggle}
                  className={`p-3 rounded-lg border transition-colors ${
                    isWishlisted
                      ? 'bg-brand/10 border-brand text-brand'
                      : 'bg-cinema-card border-cinema-border text-slate-300 hover:text-white'
                  }`}
                  title={isWishlisted ? 'Wishlisted' : 'Add to Wishlist'}
                >
                  <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-brand' : ''}`} />
                </button>
              </div>

              {/* Synopsis */}
              <div className="pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  About the Movie
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl">
                  {movie.description || movie.synopsis || 'No description available for this movie.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cast & Crew Section */}
      {(movie.cast?.length > 0 || movie.crew?.length > 0) && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-brand" />
            <span>Cast & Crew</span>
          </h2>

          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none">
            {(movie.cast || []).map((person, idx) => (
              <div
                key={idx}
                className="min-w-[120px] max-w-[120px] flex flex-col items-center text-center p-3 rounded-xl bg-cinema-card border border-cinema-border"
              >
                <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-300 text-sm mb-2 uppercase">
                  {person.name ? person.name[0] : 'C'}
                </div>
                <p className="text-xs font-semibold text-slate-200 line-clamp-1">
                  {person.name}
                </p>
                <p className="text-[10px] text-slate-400 line-clamp-1">
                  {person.role || 'Actor'}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Showtime & Theatre Booking Section */}
      <section
        id="showtimes-section"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-cinema-border pb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              Theatres & Showtimes
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Select an available showtime in {currentCity?.name || 'City'}
            </p>
          </div>

          {/* Date Selector Strip */}
          <DateSelector
            selectedDate={selectedDate}
            onSelectDate={d => setSelectedDate(d)}
          />
        </div>

        {/* Theatres List */}
        {loadingShows ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 bg-slate-800/80 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : theatreList.length > 0 ? (
          <div className="space-y-4">
            {theatreList.map(({ theatre, shows }) => (
              <TheatreCard
                key={theatre._id}
                theatre={theatre}
                shows={shows}
              />
            ))}
          </div>
        ) : (
          <div className="p-10 rounded-2xl bg-cinema-card/50 border border-cinema-border text-center space-y-2">
            <Film className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="font-bold text-base text-slate-200">
              No shows scheduled on {formatDate(selectedDate)}
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Cinemas in {currentCity?.name} have not listed showtimes for this date yet. Try checking another date.
            </p>
          </div>
        )}
      </section>

      {/* Similar Movies */}
      {similarMovies.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <MovieCarousel
            title="You Might Also Like"
            subtitle="Films with similar genres and themes"
            movies={similarMovies}
          />
        </div>
      )}

      {/* Trailer Modal */}
      {movie.trailerUrl && (
        <Modal
          isOpen={isTrailerOpen}
          onClose={() => setIsTrailerOpen(false)}
          title={`${movie.title} - Official Trailer`}
          maxWidth="max-w-3xl"
        >
          <div className="aspect-video w-full rounded-lg overflow-hidden bg-black">
            <iframe
              src={movie.trailerUrl.replace('watch?v=', 'embed/')}
              title={`${movie.title} Trailer`}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </Modal>
      )}
    </div>
  );
}

export default MovieDetailsPage;

