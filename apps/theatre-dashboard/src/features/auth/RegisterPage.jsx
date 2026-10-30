import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, User, Mail, Phone, Lock, FileText, MapPin, CheckCircle, AlertCircle } from 'lucide-react';
import { authApi } from '../../services/api/auth.api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const partnerRegisterSchema = z.object({
  ownerName: z.string().min(2, 'Owner name must be at least 2 characters'),
  businessEmail: z.string().email('Valid business email is required'),
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Must be a valid 10-digit Indian mobile number'),
  businessName: z.string().min(3, 'Business / Cinema entity name must be at least 3 characters'),
  businessAddress: z.string().min(5, 'Registered address must be at least 5 characters'),
  gstin: z.string().optional(),
  pan: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters long')
});

export function RegisterPage() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(partnerRegisterSchema),
    defaultValues: {
      ownerName: '',
      businessEmail: '',
      mobile: '',
      businessName: '',
      businessAddress: '',
      gstin: '',
      pan: '',
      password: ''
    }
  });

  const onSubmit = async (values) => {
    setServerError('');
    try {
      await authApi.registerTheatreOwner(values);
      setIsSuccess(true);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Registration failed. Please check your information.';
      setServerError(msg);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-cinema-darkest flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-cinema-card border border-cinema-border rounded-2xl p-8 shadow-2xl text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white">Partner Application Received</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Your cinema partner account has been created and submitted for platform compliance review.
            Once verified by our Super Admin team, you will receive an activation email to log in and start scheduling shows.
          </p>
          <div className="pt-4">
            <Button variant="secondary" className="w-full" onClick={() => navigate('/login')}>
              Return to Partner Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cinema-darkest flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-2xl bg-cinema-card border border-cinema-border rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand via-partner-500 to-brand" />

        <div className="text-center space-y-2 mb-8">
          <h2 className="text-2xl font-bold text-white tracking-tight">Cinema Partner Registration</h2>
          <p className="text-xs text-slate-400">
            Join the BookMyShow exhibitor network. Reach millions of moviegoers across India.
          </p>
        </div>

        {serverError && (
          <div className="mb-6 p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-start gap-3 text-rose-400 text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Authorized Owner Name"
              placeholder="e.g. Yash Kacha"
              icon={User}
              error={errors.ownerName?.message}
              {...register('ownerName')}
            />

            <Input
              label="Business / Entity Name"
              placeholder="e.g. Galaxy Cinemas LLP"
              icon={Building2}
              error={errors.businessName?.message}
              {...register('businessName')}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Business Email"
              type="email"
              placeholder="operations@galaxycinemas.com"
              icon={Mail}
              error={errors.businessEmail?.message}
              {...register('businessEmail')}
            />

            <Input
              label="Mobile Number"
              placeholder="9876543210"
              icon={Phone}
              error={errors.mobile?.message}
              {...register('mobile')}
            />
          </div>

          <Input
            label="Registered Business Address"
            placeholder="Plot 42, Cinema Hub, Western Highway, Mumbai"
            icon={MapPin}
            error={errors.businessAddress?.message}
            {...register('businessAddress')}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="GSTIN (Optional)"
              placeholder="27ABCDE1234F1Z5"
              icon={FileText}
              error={errors.gstin?.message}
              {...register('gstin')}
            />

            <Input
              label="PAN Number (Optional)"
              placeholder="ABCDE1234F"
              icon={FileText}
              error={errors.pan?.message}
              {...register('pan')}
            />
          </div>

          <Input
            label="Secure Password"
            type="password"
            placeholder="Min 8 characters with letters & numbers"
            icon={Lock}
            error={errors.password?.message}
            {...register('password')}
          />

          <Button
            type="submit"
            variant="secondary"
            className="w-full mt-4"
            size="lg"
            isLoading={isSubmitting}
          >
            Submit Partner Application
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-cinema-border text-center text-xs text-slate-400">
          Already registered as a partner?{' '}
          <Link to="/login" className="text-partner-400 font-semibold hover:underline">
            Sign In Here
          </Link>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;

