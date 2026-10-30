import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Film, User, Mail, Phone, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';

const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email address'),
    phone: z
      .string()
      .regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian mobile number'),
    password: z.string().min(6, 'Password must be at least 6 characters long'),
    confirmPassword: z.string()
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword']
  });

export function RegisterPage() {
  const { register: registerUser, isLoading } = useAuthStore();
  const [formError, setFormError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: ''
    }
  });

  const onSubmit = async data => {
    setFormError(null);
    setSuccessMessage(null);

    const payload = {
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      phone: data.phone.trim(),
      password: data.password
    };

    const result = await registerUser(payload);
    if (result.success) {
      setSuccessMessage('Account created successfully! Redirecting...');
      setTimeout(() => {
        navigate(from, { replace: true });
      }, 1000);
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
          <h2 className="text-xl font-bold text-slate-100">Create an Account</h2>
          <p className="text-xs text-slate-400">
            Join millions of cinema lovers and book tickets with 0 convenience hassle
          </p>
        </div>

        {/* Global Error Banner */}
        {formError && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {/* Success Banner */}
        {successMessage && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Full Name"
            placeholder="John Doe"
            leftIcon={User}
            error={errors.name?.message}
            {...register('name')}
          />

          <Input
            label="Email Address"
            type="email"
            placeholder="patron@cinema.com"
            leftIcon={Mail}
            error={errors.email?.message}
            {...register('email')}
          />

          <Input
            label="Mobile Number"
            type="tel"
            placeholder="9876543210"
            leftIcon={Phone}
            error={errors.phone?.message}
            {...register('phone')}
          />

          <Input
            label="Password"
            type="password"
            placeholder="Minimum 6 characters"
            leftIcon={Lock}
            error={errors.password?.message}
            {...register('password')}
          />

          <Input
            label="Confirm Password"
            type="password"
            placeholder="Repeat password"
            leftIcon={Lock}
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />

          <Button
            type="submit"
            variant="primary"
            fullWidth
            size="lg"
            isLoading={isLoading}
            className="mt-2"
          >
            Create Account
          </Button>
        </form>

        {/* Login CTA */}
        <div className="text-center text-xs text-slate-400 border-t border-cinema-border/60 pt-4">
          Already have an account?{' '}
          <Link
            to="/login"
            state={{ from: location.state?.from }}
            className="text-brand hover:underline font-semibold"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;

