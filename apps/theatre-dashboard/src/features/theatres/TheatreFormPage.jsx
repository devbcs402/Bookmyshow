import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, ArrowLeft, AlertCircle } from 'lucide-react';
import { theatresApi } from '../../services/api/theatres.api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const theatreFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  city: z.string().min(2, 'City is required'),
  address: z.string().min(5, 'Full street address is required'),
  state: z.string().optional(),
  pincode: z.string().regex(/^\d{6}$/, 'Must be a 6-digit PIN code'),
  contactEmail: z.string().email('Valid contact email is required'),
  contactPhone: z.string().regex(/^[6-9]\d{9}$/, '10-digit Indian phone number required'),
  gstin: z.string().optional(),
  pan: z.string().optional()
});

export function TheatreFormPage() {
  const { theatreId } = useParams();
  const isEdit = Boolean(theatreId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState('');

  // Fetch existing theatre if in Edit Mode
  const { data: existingTheatre, isLoading: isFetching } = useQuery({
    queryKey: ['theatreDetail', theatreId],
    queryFn: () => theatresApi.getTheatreById(theatreId),
    enabled: isEdit
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(theatreFormSchema),
    defaultValues: {
      name: '',
      city: '',
      address: '',
      state: '',
      pincode: '',
      contactEmail: '',
      contactPhone: '',
      gstin: '',
      pan: ''
    }
  });

  useEffect(() => {
    if (existingTheatre) {
      reset({
        name: existingTheatre.name || '',
        city: existingTheatre.city || existingTheatre.address?.city || '',
        address: existingTheatre.address?.street || existingTheatre.address || '',
        state: existingTheatre.address?.state || existingTheatre.state || '',
        pincode: existingTheatre.address?.pincode || existingTheatre.pincode || '',
        contactEmail: existingTheatre.contactEmail || '',
        contactPhone: existingTheatre.contactPhone || '',
        gstin: existingTheatre.gstin || '',
        pan: existingTheatre.pan || ''
      });
    }
  }, [existingTheatre, reset]);

  const mutation = useMutation({
    mutationFn: (values) => {
      if (isEdit) {
        return theatresApi.updateTheatre(theatreId, values);
      }
      return theatresApi.registerTheatre(values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['myTheatresList']);
      queryClient.invalidateQueries(['myTheatresSwitcher']);
      navigate('/theatres');
    },
    onError: (err) => {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Failed to save theatre information.';
      setServerError(msg);
    }
  });

  const onSubmit = (values) => {
    setServerError('');
    mutation.mutate(values);
  };

  if (isEdit && isFetching) {
    return <LoadingSpinner text="Loading theatre profile..." />;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back button & Heading */}
      <div className="flex items-center gap-3">
        <Link
          to="/theatres"
          className="p-2 rounded-lg bg-cinema-card border border-cinema-border text-slate-400 hover:text-white hover:bg-cinema-elevated transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            {isEdit ? 'Update Cinema Complex' : 'Register New Theatre Complex'}
          </h1>
          <p className="text-xs text-slate-400">
            {isEdit ? 'Edit operating information and company profile' : 'Add a new theatre property to your portfolio'}
          </p>
        </div>
      </div>

      {serverError && (
        <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-start gap-3 text-rose-400 text-xs font-medium">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{serverError}</span>
        </div>
      )}

      {/* Form Container */}
      <div className="bg-cinema-card border border-cinema-border rounded-xl p-6 shadow-sm">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Theatre Complex Name"
              placeholder="e.g. Cinepolis Nexus Mall"
              icon={Building2}
              error={errors.name?.message}
              {...register('name')}
            />

            <Input
              label="City"
              placeholder="e.g. Mumbai, Bengaluru"
              error={errors.city?.message}
              {...register('city')}
            />
          </div>

          <Input
            label="Street Address / Location"
            placeholder="Level 4, Commercial Complex, S.V. Road"
            error={errors.address?.message}
            {...register('address')}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="State"
              placeholder="e.g. Maharashtra, Karnataka"
              error={errors.state?.message}
              {...register('state')}
            />

            <Input
              label="Postal PIN Code"
              placeholder="e.g. 400050"
              error={errors.pincode?.message}
              {...register('pincode')}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Contact Email"
              type="email"
              placeholder="manager@multiplex.com"
              error={errors.contactEmail?.message}
              {...register('contactEmail')}
            />

            <Input
              label="Contact Phone"
              placeholder="9876543210"
              error={errors.contactPhone?.message}
              {...register('contactPhone')}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="GSTIN"
              placeholder="27AAACG0561D1Z1"
              error={errors.gstin?.message}
              {...register('gstin')}
            />

            <Input
              label="PAN"
              placeholder="AAACG0561D"
              error={errors.pan?.message}
              {...register('pan')}
            />
          </div>

          <div className="pt-4 border-t border-cinema-border flex items-center justify-end gap-3">
            <Link to="/theatres">
              <Button variant="ghost">Cancel</Button>
            </Link>
            <Button
              type="submit"
              variant="secondary"
              isLoading={isSubmitting || mutation.isPending}
            >
              {isEdit ? 'Save Changes' : 'Register Complex'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TheatreFormPage;

