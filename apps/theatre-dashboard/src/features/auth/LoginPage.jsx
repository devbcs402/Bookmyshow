import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogIn, Lock, Mail, AlertCircle } from 'lucide-react';
import { authApi } from '../../services/api/auth.api';
import { useAuthStore, Roles } from '../../store/auth.store';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const loginSchema = z.object({
  identifier: z.string().min(3, 'Email or Mobile Number is required'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: '',
      password: ''
    }
  });

  const onSubmit = async (values) => {
    setServerError('');
    try {
      const response = await authApi.login(values.identifier, values.password);
      const data = response.data || response;

      // Ensure user role belongs to theatre administration
      const user = data.user;
      if (
        user.role !== Roles.THEATRE_OWNER &&
        user.role !== Roles.THEATRE_MANAGER &&
        user.role !== Roles.THEATRE_STAFF &&
        user.role !== Roles.SUPER_ADMIN
      ) {
        setServerError('Access restricted. This portal is exclusively for Theatre Partners and Operations Staff.');
        return;
      }

      setAuth(user, data.accessToken);
      const origin = location.state?.from?.pathname || '/';
      navigate(origin, { replace: true });
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Authentication failed. Please verify your credentials.';
      setServerError(msg);
    }
  };

  return (
    <div className="min-h-screen bg-cinema-darkest flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-cinema-card border border-cinema-border rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        {/* Subtle top brand accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand via-partner-500 to-brand" />

        {/* Branding & Heading */}
        <div className="text-center space-y-2 mb-8">
          <div className="inline-flex w-12 h-12 rounded-xl bg-brand items-center justify-center text-white font-black text-xl shadow-lg shadow-brand/20">
            BMS
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Theatre Partner Portal</h2>
          <p className="text-xs text-slate-400">
            Secure administrative console for cinema owners & operations staff
          </p>
        </div>

        {/* Error Alert */}
        {serverError && (
          <div className="mb-6 p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-start gap-3 text-rose-400 text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{serverError}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Business Email or Mobile"
            type="text"
            placeholder="partner@theatre.com or 9876543210"
            icon={Mail}
            error={errors.identifier?.message}
            {...register('identifier')}
          />

          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            icon={Lock}
            error={errors.password?.message}
            {...register('password')}
          />

          <Button
            type="submit"
            variant="secondary"
            className="w-full mt-2"
            size="lg"
            isLoading={isSubmitting}
            icon={LogIn}
          >
            Sign In to Console
          </Button>
        </form>

        {/* Onboarding Link */}
        <div className="mt-8 pt-6 border-t border-cinema-border text-center text-xs text-slate-400">
          Want to partner your cinema with BookMyShow?{' '}
          <Link to="/register" className="text-partner-400 font-semibold hover:underline">
            Register Partner Account
          </Link>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;

