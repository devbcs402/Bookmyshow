import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Settings, Shield, User, Lock, CheckCircle, AlertCircle } from 'lucide-react';
import { authApi } from '../../services/api/auth.api';
import { useAuthStore } from '../../store/auth.store';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters long'),
    confirmPassword: z.string().min(1, 'Please confirm your new password')
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  });

export function SettingsPage() {
  const { user, setUser } = useAuthStore();
  const [passwordFeedback, setPasswordFeedback] = useState({ type: '', message: '' });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPasswordForm,
    formState: { errors: passwordErrors, isSubmitting: isPasswordSubmitting }
  } = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
  });

  const passwordMutation = useMutation({
    mutationFn: ({ currentPassword, newPassword }) =>
      authApi.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      setPasswordFeedback({ type: 'success', message: 'Password updated successfully.' });
      resetPasswordForm();
    },
    onError: (err) => {
      setPasswordFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to update password.'
      });
    }
  });

  const onPasswordSubmit = (values) => {
    setPasswordFeedback({ type: '', message: '' });
    passwordMutation.mutate(values);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Partner Settings & Security</h1>
        <p className="text-xs text-slate-400 mt-1">
          Manage your exhibitor organization profile, operational preferences, and access credentials
        </p>
      </div>

      {/* Partner Identity Card */}
      <div className="bg-cinema-card border border-cinema-border rounded-xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2 pb-3 border-b border-cinema-border">
          <User className="w-5 h-5 text-partner-400" />
          <h3 className="text-sm font-bold text-white">Partner Organization Profile</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <p className="text-slate-400">Account Name</p>
            <p className="font-bold text-white text-sm mt-0.5">{user?.name || 'Partner Account'}</p>
          </div>
          <div>
            <p className="text-slate-400">Registered Email</p>
            <p className="font-semibold text-slate-200 text-sm mt-0.5">{user?.email || 'N/A'}</p>
          </div>
          <div>
            <p className="text-slate-400">Assigned RBAC Role</p>
            <span className="inline-block mt-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-partner-600/20 text-partner-400 border border-partner-500/30">
              {user?.role?.replace('_', ' ')}
            </span>
          </div>
          <div>
            <p className="text-slate-400">Partner Organization ID</p>
            <p className="font-mono text-slate-300 text-xs mt-1 truncate">
              {user?.partnerId || user?.theatreId || 'PAR-ORG-MAIN'}
            </p>
          </div>
        </div>
      </div>

      {/* Security: Password Change */}
      <div className="bg-cinema-card border border-cinema-border rounded-xl p-6 space-y-5 shadow-sm">
        <div className="flex items-center gap-2 pb-3 border-b border-cinema-border">
          <Lock className="w-5 h-5 text-partner-400" />
          <h3 className="text-sm font-bold text-white">Change Access Password</h3>
        </div>

        {passwordFeedback.message && (
          <div
            className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
              passwordFeedback.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
            }`}
          >
            {passwordFeedback.type === 'success' ? (
              <CheckCircle className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{passwordFeedback.message}</span>
          </div>
        )}

        <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-4">
          <Input
            label="Current Password"
            type="password"
            placeholder="••••••••"
            error={passwordErrors.currentPassword?.message}
            {...registerPassword('currentPassword')}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="New Password"
              type="password"
              placeholder="Min 8 characters"
              error={passwordErrors.newPassword?.message}
              {...registerPassword('newPassword')}
            />

            <Input
              label="Confirm New Password"
              type="password"
              placeholder="••••••••"
              error={passwordErrors.confirmPassword?.message}
              {...registerPassword('confirmPassword')}
            />
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              type="submit"
              variant="secondary"
              isLoading={isPasswordSubmitting || passwordMutation.isPending}
            >
              Update Password
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SettingsPage;

