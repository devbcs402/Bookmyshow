import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Phone, Smartphone, Utensils, Volume2, Car, Film, Calendar } from 'lucide-react';
import theatresApi from '../../services/api/theatres.api';
import showsApi from '../../services/api/shows.api';
import DateSelector from '../../components/show/DateSelector';
import ShowtimePill from '../../components/show/ShowtimePill';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import { formatDate } from '../../utils/formatters';

export function TheatreDetailPage() {
  const { theatreId } = useParams();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date());

  // 1. Fetch Theatre Info
  const { data: theatreData, isLoading: loadingTheatre } = useQuery({
    queryKey: ['theatre-detail', theatreId],
    queryFn: () => theatresApi.getTheatreById(theatreId)
  });

  const theatre = theatreData?.data;

  // 2. Fetch Shows running at this Theatre for Selected Date
  const dateString = selectedDate.toISOString().split('T')[0];
  const { data: showsData, isLoading: loadingShows } = useQuery({
    queryKey: ['theatre-shows', theatreId, dateString],
    queryFn: () => showsApi.getTheatreShows(theatreId, { date: dateString }),
    enabled: !!theatreId
  });

  const shows = showsData?.data || [];

  // Group shows by Movie
  const moviesMap = new Map();
  shows.forEach(show => {
    const movie = show.movieSnapshot || show.movie || {
      _id: show.movieId,
      title: show.movieTitle || 'Movie'
    };
    const key = movie._id || movie.title;
    if (!moviesMap.has(key)) {
      moviesMap.set(key, {
        movie,
        shows: []
      });
    }
    moviesMap.get(key).shows.push(show);
  });
  const movieShowList = Array.from(moviesMap.values());

  if (loadingTheatre) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 animate-pulse space-y-4">
        <div className="h-40 bg-slate-800 rounded-2xl" />
        <div className="h-10 w-1/3 bg-slate-800 rounded" />
      </div>
    );
  }

  if (!theatre) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-2xl font-bold text-white">Cinema Not Found</h2>
        <Button variant="primary" size="md" onClick={() => navigate('/theatres')}>
          Browse All Cinemas
        </Button>
      </div>
    );
  }

  const address = theatre.address
    ? `${theatre.address.street ? theatre.address.street + ', ' : ''}${theatre.address.area ? theatre.address.area + ', ' : ''}${theatre.address.cityName || ''}`
    : '';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Theatre Profile Card */}
      <div className="bg-cinema-card border border-cinema-border rounded-2xl p-6 sm:p-8 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              {theatre.name}
            </h1>
            {address && (
              <p className="text-sm text-slate-400 flex items-center gap-1.5 mt-1.5">
                <MapPin className="w-4 h-4 text-brand flex-shrink-0" />
                <span>{address}</span>
              </p>
            )}
          </div>

          <Badge variant="success" size="md" className="self-start md:self-auto">
            VERIFIED PARTNER CINEMA
          </Badge>
        </div>

        {/* Facilities */}
        <div className="pt-4 border-t border-cinema-border/60 flex flex-wrap gap-3">
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cinema-elevated text-xs text-slate-300">
            <Smartphone className="w-4 h-4 text-emerald-400" />
            M-Ticket Contactless Entry
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cinema-elevated text-xs text-slate-300">
            <Utensils className="w-4 h-4 text-amber-400" />
            Food & Beverage Counter
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cinema-elevated text-xs text-slate-300">
            <Volume2 className="w-4 h-4 text-sky-400" />
            Dolby Surround Sound
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cinema-elevated text-xs text-slate-300">
            <Car className="w-4 h-4 text-purple-400" />
            Valet & Customer Parking
          </span>
        </div>
      </div>

      {/* Date Selector & Movie Schedules */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-cinema-border pb-4">
          <div>
            <h2 className="text-xl font-bold text-white">Select Date & Movie</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Available movies showing at {theatre.name}
            </p>
          </div>
          <DateSelector
            selectedDate={selectedDate}
            onSelectDate={d => setSelectedDate(d)}
          />
        </div>

        {/* Movies List */}
        {loadingShows ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-28 bg-slate-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : movieShowList.length > 0 ? (
          <div className="space-y-4">
            {movieShowList.map(({ movie, shows }) => (
              <div
                key={movie._id || movie.title}
                className="bg-cinema-card border border-cinema-border rounded-xl p-5 space-y-4"
              >
                <div className="flex items-center justify-between border-b border-cinema-border/60 pb-3">
                  <div>
                    <h3 className="font-bold text-base text-white">
                      {movie.title}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {[movie.language, movie.genre, movie.censorRating]
                        .filter(Boolean)
                        .join(' • ')}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/movies/${movie.slug || movie._id}`)}
                  >
                    View Details &rarr;
                  </Button>
                </div>

                <div className="flex flex-wrap gap-3">
                  {shows.map(show => (
                    <ShowtimePill key={show._id} show={show} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-10 rounded-2xl bg-cinema-card/50 border border-cinema-border text-center space-y-2">
            <Film className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-300">
              No shows scheduled on {formatDate(selectedDate)}
            </p>
            <p className="text-xs text-slate-500">
              Please choose another date from the strip above.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default TheatreDetailPage;

