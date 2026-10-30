import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Film, Calendar, Clock, Tv, Building2, ArrowLeft, AlertCircle, Info } from 'lucide-react';
import { showsApi } from '../../services/api/shows.api';
import { moviesApi } from '../../services/api/movies.api';
import { theatresApi } from '../../services/api/theatres.api';
import { screensApi } from '../../services/api/screens.api';
import { formatDuration } from '../../utils/formatters';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const showFormSchema = z.object({
  movieId: z.string().min(1, 'Please select a movie title'),
  theatreId: z.string().min(1, 'Please select a theatre complex'),
  screenId: z.string().min(1, 'Please select an auditorium screen'),
  startTime: z.string().min(1, 'Start date and time is required'),
  format: z.string().default('2D'),
  language: z.string().min(1, 'Audio language is required'),
  hasSubtitles: z.boolean().default(false)
});

export function ShowFormPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryMovieId = searchParams.get('movieId');
  const queryScreenId = searchParams.get('screenId');

  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState('');
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [computedEndTime, setComputedEndTime] = useState('');

  // 1. Fetch Approved Movies Catalog
  const { data: moviesData, isLoading: moviesLoading } = useQuery({
    queryKey: ['approvedMoviesCatalog'],
    queryFn: () => moviesApi.getApprovedMovies({ limit: 100 })
  });

  const movies = Array.isArray(moviesData)
    ? moviesData
    : moviesData?.movies || [];

  // 2. Fetch Partner Theatres
  const { data: theatresData, isLoading: theatresLoading } = useQuery({
    queryKey: ['myTheatresList'],
    queryFn: () => theatresApi.getMyTheatres({ limit: 50 })
  });

  const theatres = Array.isArray(theatresData)
    ? theatresData
    : theatresData?.theatres || [];

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(showFormSchema),
    defaultValues: {
      movieId: queryMovieId || '',
      theatreId: '',
      screenId: queryScreenId || '',
      startTime: '',
      format: '2D',
      language: 'Hindi',
      hasSubtitles: false
    }
  });

  const watchedTheatreId = watch('theatreId');
  const watchedMovieId = watch('movieId');
  const watchedStartTime = watch('startTime');

  // Fetch screens for selected theatre
  const { data: screensData, isLoading: screensLoading } = useQuery({
    queryKey: ['theatreScreens', watchedTheatreId],
    queryFn: () => screensApi.getScreensByTheatre(watchedTheatreId),
    enabled: Boolean(watchedTheatreId)
  });

  const screens = Array.isArray(screensData)
    ? screensData
    : screensData?.screens || [];

  // Automatically update selectedMovie when movieId changes
  useEffect(() => {
    if (watchedMovieId && movies.length > 0) {
      const match = movies.find((m) => (m._id || m.id) === watchedMovieId);
      setSelectedMovie(match || null);
      if (match?.languages?.[0]) {
        setValue('language', match.languages[0]);
      }
    }
  }, [watchedMovieId, movies, setValue]);

  // Automatically calculate end time: startTime + duration + 30 min (intermission + cleaning buffer)
  useEffect(() => {
    if (watchedStartTime && selectedMovie?.duration) {
      const start = new Date(watchedStartTime);
      if (!isNaN(start.getTime())) {
        const totalMinutes = selectedMovie.duration + 30; // 30 min buffer
        const end = new Date(start.getTime() + totalMinutes * 60000);
        setComputedEndTime(end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }
    } else {
      setComputedEndTime('');
    }
  }, [watchedStartTime, selectedMovie]);

  const mutation = useMutation({
    mutationFn: (values) => {
      const payload = {
        movieId: values.movieId,
        theatreId: values.theatreId,
        screenId: values.screenId,
        startTime: new Date(values.startTime).toISOString(),
        format: values.format,
        language: values.language,
        subtitles: values.hasSubtitles ? ['English'] : []
      };
      return showsApi.createShow(payload);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries(['partnerShows']);
      const showId = res?._id || res?.id;
      if (showId) {
        // Direct to pricing configuration for this new show!
        navigate(`/shows/${showId}/pricing`);
      } else {
        navigate('/shows');
      }
    },
    onError: (err) => {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Failed to schedule show. Please check for screen time conflicts.';
      setServerError(msg);
    }
  });

  const onSubmit = (values) => {
    setServerError('');
    mutation.mutate(values);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/shows"
          className="p-2 rounded-lg bg-cinema-card border border-cinema-border text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Schedule New Screening</h1>
          <p className="text-xs text-slate-400">
            Map movie title, auditorium hall, projection time, and language options
          </p>
        </div>
      </div>

      {serverError && (
        <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-start gap-3 text-rose-400 text-xs font-medium">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{serverError}</span>
        </div>
      )}

      <div className="bg-cinema-card border border-cinema-border rounded-xl p-6 shadow-sm">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Movie Title Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Select Approved Movie Title
            </label>
            <select
              className="w-full bg-cinema-dark border border-cinema-border rounded-lg px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand"
              {...register('movieId')}
            >
              <option value="">Select Movie from Master Catalog</option>
              {movies.map((m) => (
                <option key={m._id || m.id} value={m._id || m.id}>
                  {m.title} ({formatDuration(m.duration)}) • {m.certificate || 'UA'}
                </option>
              ))}
            </select>
            {errors.movieId && (
              <p className="text-xs text-rose-400 font-medium">{errors.movieId.message}</p>
            )}
          </div>

          {/* Theatre Complex Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Exhibitor Cinema Complex
            </label>
            <select
              className="w-full bg-cinema-dark border border-cinema-border rounded-lg px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand"
              {...register('theatreId')}
            >
              <option value="">Select Theatre Complex</option>
              {theatres.map((t) => (
                <option key={t._id || t.id} value={t._id || t.id}>
                  {t.name} ({t.city || 'City'})
                </option>
              ))}
            </select>
            {errors.theatreId && (
              <p className="text-xs text-rose-400 font-medium">{errors.theatreId.message}</p>
            )}
          </div>

          {/* Auditorium Screen Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Auditorium Screen
            </label>
            <select
              className="w-full bg-cinema-dark border border-cinema-border rounded-lg px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand disabled:opacity-50"
              disabled={!watchedTheatreId}
              {...register('screenId')}
            >
              <option value="">Select Screen</option>
              {screens.map((s) => (
                <option key={s._id || s.id} value={s._id || s.id}>
                  {s.name} (Screen #{s.screenNumber}) • {s.projectionType} • {s.totalSeats} seats
                </option>
              ))}
            </select>
            {errors.screenId && (
              <p className="text-xs text-rose-400 font-medium">{errors.screenId.message}</p>
            )}
          </div>

          {/* Start Time & Computed End Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Show Start Date & Time
              </label>
              <input
                type="datetime-local"
                className="w-full bg-cinema-dark border border-cinema-border rounded-lg px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand"
                {...register('startTime')}
              />
              {errors.startTime && (
                <p className="text-xs text-rose-400 font-medium">{errors.startTime.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Estimated End Time (with 30m buffer)
              </label>
              <div className="h-10 bg-cinema-dark border border-cinema-border rounded-lg px-3.5 py-2 text-sm text-slate-300 flex items-center justify-between">
                <span>{computedEndTime || 'Select Start Time & Movie'}</span>
                {computedEndTime && <Clock className="w-4 h-4 text-partner-400" />}
              </div>
            </div>
          </div>

          {/* Formats & Audio Language */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Visual Format"
              options={[
                { value: '2D', label: 'Standard 2D' },
                { value: '3D', label: 'RealD 3D' },
                { value: 'IMAX 2D', label: 'IMAX 2D' },
                { value: 'IMAX 3D', label: 'IMAX 3D' },
                { value: '4DX', label: '4DX Dynamic' }
              ]}
              {...register('format')}
            />

            <Input
              label="Playback Language"
              placeholder="e.g. Hindi, English, Tamil"
              error={errors.language?.message}
              {...register('language')}
            />
          </div>

          {/* Subtitles Toggle */}
          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="hasSubtitles"
              className="w-4 h-4 rounded bg-cinema-dark border-cinema-border text-brand focus:ring-brand"
              {...register('hasSubtitles')}
            />
            <label htmlFor="hasSubtitles" className="text-xs text-slate-300 cursor-pointer select-none">
              Display English Subtitles (CC / Open Captions)
            </label>
          </div>

          <div className="pt-4 border-t border-cinema-border flex items-center justify-end gap-3">
            <Link to="/shows">
              <Button variant="ghost">Cancel</Button>
            </Link>
            <Button
              type="submit"
              variant="secondary"
              isLoading={isSubmitting || mutation.isPending}
            >
              Save & Configure Pricing →
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ShowFormPage;

