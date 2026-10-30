import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Film, Mail, Lock, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';

const loginSchema = z.object({
  emailOrPhone: z
    .string()
    .min(3, 'Please enter a valid email or 10-digit mobile number'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters long')
});

export function LoginPage() {
  const { login, isLoading, error } = useAuthStore();
  const [formError, setFormError] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      emailOrPhone: '',
      password: ''
    }
  });

  const onSubmit = async data => {
    setFormError(null);
    // Determine whether input is email or phone
    const isEmail = data.emailOrPhone.includes('@');
    const payload = {
      password: data.password,
      ...(isEmail
        ? { email: data.emailOrPhone.trim().toLowerCase() }
        : { phone: data.emailOrPhone.trim() })
    };

    const result = await login(payload);
    if (result.success) {
      navigate(from, { replace: true });
    } else {
      setFormError(result.error);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-cinema-card border border-cinema-border rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-brand flex items-center justify-center text-white shadow-cinema-glow">
              <Film className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-xl text-white">
              Book<span className="text-brand">My</span>Show
            </span>
          </Link>
          <h2 className="text-xl font-bold text-slate-100">Welcome Back</h2>
          <p className="text-xs text-slate-400">
            Sign in to access your movie bookings and tickets
          </p>
        </div>

        {/* Global Error Banner */}
        {(formError || error) && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{formError || error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Email or Mobile Number"
            placeholder="patron@cinema.com or 9876543210"
            leftIcon={Mail}
            error={errors.emailOrPhone?.message}
            {...register('emailOrPhone')}
          />

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-300">
                Password
              </label>
              <Link
                to="/forgot-password"
                className="text-xs text-brand hover:underline font-medium"
              >
                Forgot Password?
              </Link>
            </div>
            <Input
              type="password"
              placeholder="••••••••"
              leftIcon={Lock}
              error={errors.password?.message}
              {...register('password')}
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            fullWidth
            size="lg"
            isLoading={isLoading}
            className="mt-2"
          >
            Sign In
          </Button>
        </form>

        {/* Register CTA */}
        <div className="text-center text-xs text-slate-400 border-t border-cinema-border/60 pt-4">
          Don't have an account?{' '}
          <Link
            to="/register"
            state={{ from: location.state?.from }}
            className="text-brand hover:underline font-semibold"
          >
            Sign Up Now
          </Link>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;

