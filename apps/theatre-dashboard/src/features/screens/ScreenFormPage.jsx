import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tv, ArrowLeft, AlertCircle } from 'lucide-react';
import { screensApi } from '../../services/api/screens.api';
import { theatresApi } from '../../services/api/theatres.api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const PROJECTION_OPTIONS = [
  { value: 'STANDARD_2D', label: 'Standard 2D Digital' },
  { value: 'REAL_3D', label: 'RealD 3D' },
  { value: 'IMAX_2D', label: 'IMAX 2D Digital' },
  { value: 'IMAX_3D', label: 'IMAX 3D Laser' },
  { value: '4DX', label: '4DX Motion Dynamics' },
  { value: 'SCREEN_X', label: 'ScreenX 270° Panoramic' }
];

const SOUND_OPTIONS = [
  { value: 'DOLBY_ATMOS', label: 'Dolby Atmos 360°' },
  { value: 'DOLBY_DIGITAL_7_1', label: 'Dolby Digital 7.1 Surround' },
  { value: 'DOLBY_DIGITAL_5_1', label: 'Dolby Digital 5.1' },
  { value: 'IMAX_IMMERSIVE', label: 'IMAX Immersive 12-Channel' },
  { value: 'DTS_X', label: 'DTS:X Spatial Audio' }
];

const screenSchema = z.object({
  name: z.string().min(2, 'Screen name must be at least 2 characters'),
  screenNumber: z.coerce.number().int().min(1, 'Screen number must be at least 1'),
  projectionType: z.string().min(1, 'Projection type is required'),
  soundSystem: z.string().min(1, 'Sound system is required'),
  theatreId: z.string().min(1, 'Theatre complex is required')
});

export function ScreenFormPage() {
  const { screenId } = useParams();
  const [searchParams] = useSearchParams();
  const queryTheatreId = searchParams.get('theatreId');
  const isEdit = Boolean(screenId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState('');

  // Fetch partner theatres
  const { data: theatresData } = useQuery({
    queryKey: ['myTheatresList'],
    queryFn: () => theatresApi.getMyTheatres({ limit: 50 })
  });

  const theatres = Array.isArray(theatresData)
    ? theatresData
    : theatresData?.theatres || [];

  // Fetch existing screen if edit
  const { data: existingScreen, isLoading: isFetching } = useQuery({
    queryKey: ['screenDetail', screenId],
    queryFn: () => screensApi.getScreenById(screenId),
    enabled: isEdit
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(screenSchema),
    defaultValues: {
      name: '',
      screenNumber: 1,
      projectionType: 'STANDARD_2D',
      soundSystem: 'DOLBY_ATMOS',
      theatreId: queryTheatreId || ''
    }
  });

  useEffect(() => {
    if (existingScreen) {
      reset({
        name: existingScreen.name || '',
        screenNumber: existingScreen.screenNumber || 1,
        projectionType: existingScreen.projectionType || 'STANDARD_2D',
        soundSystem: existingScreen.soundSystem || 'DOLBY_ATMOS',
        theatreId: existingScreen.theatreId?._id || existingScreen.theatreId || ''
      });
    } else if (queryTheatreId) {
      reset((prev) => ({ ...prev, theatreId: queryTheatreId }));
    }
  }, [existingScreen, queryTheatreId, reset]);

  const mutation = useMutation({
    mutationFn: (values) => {
      if (isEdit) {
        return screensApi.updateScreen(screenId, values);
      }
      return screensApi.createScreen(values.theatreId, values);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries(['theatreScreens']);
      const sId = res?._id || res?.id || screenId;
      if (!isEdit && sId) {
        // Redirect directly to the Layout Builder for the newly created screen!
        navigate(`/screens/${sId}/layout`);
      } else {
        navigate('/screens');
      }
    },
    onError: (err) => {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Failed to save screen.';
      setServerError(msg);
    }
  });

  const onSubmit = (values) => {
    setServerError('');
    mutation.mutate(values);
  };

  if (isEdit && isFetching) {
    return <LoadingSpinner text="Retrieving screen configuration..." />;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/screens"
          className="p-2 rounded-lg bg-cinema-card border border-cinema-border text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            {isEdit ? 'Update Screen Specifications' : 'Create Auditorium Screen'}
          </h1>
          <p className="text-xs text-slate-400">
            Define hall projection hardware and sound acoustics
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
          {!isEdit && (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Theatre Complex
              </label>
              <select
                className="w-full bg-cinema-dark border border-cinema-border rounded-lg px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand"
                {...register('theatreId')}
              >
                <option value="">Select Theatre Complex</option>
                {theatres.map((t) => (
                  <option key={t._id || t.id} value={t._id || t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              {errors.theatreId && (
                <p className="text-xs text-rose-400 font-medium">{errors.theatreId.message}</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Auditorium Name"
              placeholder="e.g. Audi 1, IMAX Hall"
              icon={Tv}
              error={errors.name?.message}
              {...register('name')}
            />

            <Input
              label="Screen Index Number"
              type="number"
              placeholder="1"
              error={errors.screenNumber?.message}
              {...register('screenNumber')}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Projection Technology"
              options={PROJECTION_OPTIONS}
              error={errors.projectionType?.message}
              {...register('projectionType')}
            />

            <Select
              label="Audio Acoustics Engine"
              options={SOUND_OPTIONS}
              error={errors.soundSystem?.message}
              {...register('soundSystem')}
            />
          </div>

          <div className="pt-4 border-t border-cinema-border flex items-center justify-end gap-3">
            <Link to="/screens">
              <Button variant="ghost">Cancel</Button>
            </Link>
            <Button
              type="submit"
              variant="secondary"
              isLoading={isSubmitting || mutation.isPending}
            >
              {isEdit ? 'Save Screen' : 'Save & Build Layout →'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ScreenFormPage;

