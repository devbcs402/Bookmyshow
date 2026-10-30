import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, ArrowLeft, AlertCircle } from 'lucide-react';
import { branchesApi } from '../../services/api/branches.api';
import { theatresApi } from '../../services/api/theatres.api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const branchSchema = z.object({
  name: z.string().min(2, 'Branch name must be at least 2 characters'),
  city: z.string().min(2, 'City is required'),
  address: z.string().min(5, 'Street address is required'),
  pincode: z.string().regex(/^\d{6}$/, 'Must be a 6-digit PIN code'),
  contactEmail: z.string().email('Valid email is required'),
  contactPhone: z.string().regex(/^[6-9]\d{9}$/, '10-digit mobile number required'),
  theatreId: z.string().min(1, 'Associated Theatre is required')
});

const AVAILABLE_FACILITIES = [
  'Parking',
  'Food Court',
  'Dolby Atmos',
  'IMAX',
  'Wheelchair Accessible',
  'Recliner Seating',
  '4DX Motion'
];

export function BranchFormPage() {
  const { branchId } = useParams();
  const [searchParams] = useSearchParams();
  const queryTheatreId = searchParams.get('theatreId');
  const isEdit = Boolean(branchId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState('');
  const [selectedFacilities, setSelectedFacilities] = useState([]);

  // Fetch partner theatres for dropdown selection
  const { data: theatresData } = useQuery({
    queryKey: ['myTheatresList'],
    queryFn: () => theatresApi.getMyTheatres({ limit: 50 })
  });

  const theatres = Array.isArray(theatresData)
    ? theatresData
    : theatresData?.theatres || [];

  // Fetch branch details if edit
  const { data: existingBranch, isLoading: isFetching } = useQuery({
    queryKey: ['branchDetail', branchId],
    queryFn: () => branchesApi.getBranchById(branchId),
    enabled: isEdit
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(branchSchema),
    defaultValues: {
      name: '',
      city: '',
      address: '',
      pincode: '',
      contactEmail: '',
      contactPhone: '',
      theatreId: queryTheatreId || ''
    }
  });

  useEffect(() => {
    if (existingBranch) {
      reset({
        name: existingBranch.name || '',
        city: existingBranch.city || existingBranch.address?.city || '',
        address: existingBranch.address?.street || existingBranch.address || '',
        pincode: existingBranch.address?.pincode || existingBranch.pincode || '',
        contactEmail: existingBranch.contactEmail || '',
        contactPhone: existingBranch.contactPhone || '',
        theatreId: existingBranch.theatreId?._id || existingBranch.theatreId || ''
      });
      if (Array.isArray(existingBranch.facilities)) {
        setSelectedFacilities(existingBranch.facilities);
      }
    } else if (queryTheatreId) {
      reset((prev) => ({ ...prev, theatreId: queryTheatreId }));
    }
  }, [existingBranch, queryTheatreId, reset]);

  const toggleFacility = (facility) => {
    setSelectedFacilities((prev) =>
      prev.includes(facility) ? prev.filter((f) => f !== facility) : [...prev, facility]
    );
  };

  const mutation = useMutation({
    mutationFn: (values) => {
      const payload = { ...values, facilities: selectedFacilities };
      if (isEdit) {
        return branchesApi.updateBranch(branchId, payload);
      }
      return branchesApi.createBranch(values.theatreId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['theatreBranches']);
      navigate('/branches');
    },
    onError: (err) => {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Failed to save branch.';
      setServerError(msg);
    }
  });

  const onSubmit = (values) => {
    setServerError('');
    mutation.mutate(values);
  };

  if (isEdit && isFetching) {
    return <LoadingSpinner text="Retrieving branch record..." />;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/branches"
          className="p-2 rounded-lg bg-cinema-card border border-cinema-border text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            {isEdit ? 'Update Multiplex Branch' : 'Create Multiplex Location'}
          </h1>
          <p className="text-xs text-slate-400">
            Configure physical premises, contact information, and guest amenities
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
                Parent Theatre Complex
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
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Branch Name"
              placeholder="e.g. Phoenix Marketcity Branch"
              icon={Building2}
              error={errors.name?.message}
              {...register('name')}
            />

            <Input
              label="City"
              placeholder="e.g. Bengaluru"
              error={errors.city?.message}
              {...register('city')}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Street Address / Mall Name"
              placeholder="Level 3, Food Court Wing"
              error={errors.address?.message}
              {...register('address')}
            />

            <Input
              label="Postal PIN Code"
              placeholder="e.g. 560048"
              error={errors.pincode?.message}
              {...register('pincode')}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Branch Contact Email"
              type="email"
              placeholder="phoenix@theatre.com"
              error={errors.contactEmail?.message}
              {...register('contactEmail')}
            />

            <Input
              label="Branch Contact Phone"
              placeholder="9876543210"
              error={errors.contactPhone?.message}
              {...register('contactPhone')}
            />
          </div>

          {/* Amenities & Facilities Checkboxes */}
          <div className="space-y-2 pt-2 border-t border-cinema-border">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Guest Amenities & Cinema Facilities
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {AVAILABLE_FACILITIES.map((facility) => {
                const checked = selectedFacilities.includes(facility);
                return (
                  <button
                    key={facility}
                    type="button"
                    onClick={() => toggleFacility(facility)}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-medium text-left transition-all ${
                      checked
                        ? 'bg-partner-600/20 border-partner-500 text-white'
                        : 'bg-cinema-dark border-cinema-border text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                        checked ? 'bg-partner-500 border-partner-500 text-white' : 'border-slate-500'
                      }`}
                    >
                      {checked && <div className="w-1.5 h-1.5 rounded-sm bg-white" />}
                    </div>
                    <span className="truncate">{facility}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-cinema-border flex items-center justify-end gap-3">
            <Link to="/branches">
              <Button variant="ghost">Cancel</Button>
            </Link>
            <Button
              type="submit"
              variant="secondary"
              isLoading={isSubmitting || mutation.isPending}
            >
              {isEdit ? 'Update Branch' : 'Create Branch'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default BranchFormPage;

