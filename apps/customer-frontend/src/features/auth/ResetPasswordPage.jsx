import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Film, Lock, CheckCircle2, AlertCircle } from 'lucide-react';
import authApi from '../../services/api/auth.api';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';

const schema = z
  .object({
    token: z.string().min(1, 'Reset token is required'),
    newPassword: z.string().min(6, 'Password must be at least 6 characters long'),
    confirmPassword: z.string()
  })
  .refine(data => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword']
  });

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || '';
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      token: tokenFromUrl,
      newPassword: '',
      confirmPassword: ''
    }
  });

  const onSubmit = async data => {
    setIsLoading(true);
    setError(null);
    try {
      await authApi.resetPassword({
        token: data.token.trim(),
        newPassword: data.newPassword
      });
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err.message || 'Password reset failed. Token may be invalid or expired.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-cinema-card border border-cinema-border rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-brand flex items-center justify-center text-white shadow-cinema-glow">
              <Film className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-xl text-white">
              Book<span className="text-brand">My</span>Show
            </span>
          </Link>
          <h2 className="text-xl font-bold text-slate-100">Set New Password</h2>
          <p className="text-xs text-slate-400">
            Create a strong new password for your account
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="text-center py-6 space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-100 text-base">Password Updated!</h3>
            <p className="text-xs text-slate-400">
              Your password has been changed successfully. Redirecting to login...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Reset Security Token"
              placeholder="Paste token received in email"
              error={errors.token?.message}
              {...register('token')}
            />

            <Input
              label="New Password"
              type="password"
              placeholder="Minimum 6 characters"
              leftIcon={Lock}
              error={errors.newPassword?.message}
              {...register('newPassword')}
            />

            <Input
              label="Confirm New Password"
              type="password"
              placeholder="Repeat new password"
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
            >
              Update Password
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

export default ResetPasswordPage;

