import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  User,
  Mail,
  Phone,
  Lock,
  Bell,
  Smartphone,
  Shield,
  CheckCircle2,
  AlertCircle,
  Laptop,
  Trash2
} from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import usersApi from '../../services/api/users.api';
import authApi from '../../services/api/auth.api';
import notificationsApi from '../../services/api/notifications.api';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';

const editProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian mobile number')
});

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(6, 'Current password is required'),
    newPassword: z.string().min(6, 'New password must be at least 6 characters long'),
    confirmPassword: z.string()
  })
  .refine(data => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword']
  });

export function ProfilePage() {
  const { user, updateUserProfile } = useAuthStore();
  const queryClient = useQueryClient();

  const [profileSuccess, setProfileSuccess] = useState(null);
  const [profileError, setProfileError] = useState(null);
  const [passwordSuccess, setPasswordSuccess] = useState(null);
  const [passwordError, setPasswordError] = useState(null);

  // Edit Profile Form
  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors, isSubmitting: isSubmittingProfile }
  } = useForm({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      name: user?.name || '',
      phone: user?.phone || ''
    }
  });

  // Change Password Form
  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPasswordForm,
    formState: { errors: passwordErrors, isSubmitting: isSubmittingPassword }
  } = useForm({
    resolver: zodResolver(changePasswordSchema)
  });

  // Fetch Notification Preferences
  const { data: preferencesData, refetch: refetchPreferences } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: () => notificationsApi.getPreferences()
  });

  const preferences = preferencesData?.data || {
    email: true,
    sms: true,
    whatsapp: true,
    inApp: true
  };

  // Toggle Preferences Mutation
  const preferenceMutation = useMutation({
    mutationFn: newPrefs => notificationsApi.updatePreferences(newPrefs),
    onSuccess: () => refetchPreferences()
  });

  // Fetch Active Sessions
  const { data: sessionsData, refetch: refetchSessions } = useQuery({
    queryKey: ['user-sessions'],
    queryFn: () => usersApi.getSessions()
  });

  const sessions = sessionsData?.data || [];

  const onUpdateProfile = async data => {
    setProfileSuccess(null);
    setProfileError(null);
    try {
      const res = await usersApi.updateProfile(data);
      if (res?.data) {
        updateUserProfile(res.data);
        setProfileSuccess('Profile updated successfully!');
      }
    } catch (err) {
      setProfileError(err.message || 'Failed to update profile.');
    }
  };

  const onChangePassword = async data => {
    setPasswordSuccess(null);
    setPasswordError(null);
    try {
      await authApi.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword
      });
      setPasswordSuccess('Password changed successfully!');
      resetPasswordForm();
    } catch (err) {
      setPasswordError(err.message || 'Failed to change password. Verify your current password.');
    }
  };

  const handleToggleChannel = (channel, currentValue) => {
    preferenceMutation.mutate({
      [channel]: !currentValue
    });
  };

  const handleRevokeSession = async sessionId => {
    try {
      await usersApi.revokeSession(sessionId);
      refetchSessions();
    } catch (_e) {}
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Title */}
      <div className="border-b border-cinema-border pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
            <User className="w-6 h-6 text-brand" />
            <span>Profile & Preferences</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage your personal cinema credentials, communication channels, and security
          </p>
        </div>
        <Badge variant="outline" size="sm" className="font-mono text-slate-300">
          Role: {user?.role || 'CUSTOMER'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Left Column: Personal Information Form */}
        <div className="bg-cinema-card border border-cinema-border rounded-2xl p-6 space-y-5">
          <h2 className="text-base font-bold text-white border-b border-cinema-border/60 pb-3 flex items-center gap-2">
            <User className="w-4 h-4 text-brand" />
            <span>Personal Information</span>
          </h2>

          {profileSuccess && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{profileSuccess}</span>
            </div>
          )}

          {profileError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{profileError}</span>
            </div>
          )}

          <form onSubmit={handleProfileSubmit(onUpdateProfile)} className="space-y-4">
            <Input
              label="Full Name"
              leftIcon={User}
              error={profileErrors.name?.message}
              {...registerProfile('name')}
            />

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Email Address (Permanent)
              </label>
              <div className="flex items-center px-3.5 py-2.5 rounded-lg bg-slate-900 border border-cinema-border text-slate-400 text-sm">
                <Mail className="w-4 h-4 mr-2.5 text-slate-500" />
                <span>{user?.email || 'N/A'}</span>
              </div>
            </div>

            <Input
              label="Mobile Number"
              type="tel"
              leftIcon={Phone}
              error={profileErrors.phone?.message}
              {...registerProfile('phone')}
            />

            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSubmittingProfile}
            >
              Save Profile Changes
            </Button>
          </form>
        </div>

        {/* Right Column: Change Password */}
        <div className="bg-cinema-card border border-cinema-border rounded-2xl p-6 space-y-5">
          <h2 className="text-base font-bold text-white border-b border-cinema-border/60 pb-3 flex items-center gap-2">
            <Lock className="w-4 h-4 text-brand" />
            <span>Change Security Password</span>
          </h2>

          {passwordSuccess && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          {passwordError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handlePasswordSubmit(onChangePassword)} className="space-y-4">
            <Input
              label="Current Password"
              type="password"
              leftIcon={Lock}
              error={passwordErrors.currentPassword?.message}
              {...registerPassword('currentPassword')}
            />

            <Input
              label="New Password"
              type="password"
              leftIcon={Lock}
              error={passwordErrors.newPassword?.message}
              {...registerPassword('newPassword')}
            />

            <Input
              label="Confirm New Password"
              type="password"
              leftIcon={Lock}
              error={passwordErrors.confirmPassword?.message}
              {...registerPassword('confirmPassword')}
            />

            <Button
              type="submit"
              variant="secondary"
              size="md"
              isLoading={isSubmittingPassword}
            >
              Update Password
            </Button>
          </form>
        </div>
      </div>

      {/* Notification Channel Preferences */}
      <div className="bg-cinema-card border border-cinema-border rounded-2xl p-6 space-y-5">
        <h2 className="text-base font-bold text-white border-b border-cinema-border/60 pb-3 flex items-center gap-2">
          <Bell className="w-4 h-4 text-brand" />
          <span>Ticket Alerts & Notification Channels</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-cinema-elevated/70 border border-cinema-border">
            <div>
              <p className="font-semibold text-slate-200">Email Notifications</p>
              <p className="text-[11px] text-slate-400">Receive digital receipts and QR codes via email</p>
            </div>
            <button
              onClick={() => handleToggleChannel('email', preferences.email)}
              className={`w-11 h-6 rounded-full transition-colors p-0.5 ${
                preferences.email ? 'bg-brand' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  preferences.email ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl bg-cinema-elevated/70 border border-cinema-border">
            <div>
              <p className="font-semibold text-slate-200">SMS Booking Alerts</p>
              <p className="text-[11px] text-slate-400">Instant SMS confirmation with ticket reference</p>
            </div>
            <button
              onClick={() => handleToggleChannel('sms', preferences.sms)}
              className={`w-11 h-6 rounded-full transition-colors p-0.5 ${
                preferences.sms ? 'bg-brand' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  preferences.sms ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl bg-cinema-elevated/70 border border-cinema-border">
            <div>
              <p className="font-semibold text-slate-200">WhatsApp Messaging</p>
              <p className="text-[11px] text-slate-400">Ticket passes sent directly to your WhatsApp</p>
            </div>
            <button
              onClick={() => handleToggleChannel('whatsapp', preferences.whatsapp)}
              className={`w-11 h-6 rounded-full transition-colors p-0.5 ${
                preferences.whatsapp ? 'bg-brand' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  preferences.whatsapp ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl bg-cinema-elevated/70 border border-cinema-border">
            <div>
              <p className="font-semibold text-slate-200">In-App Live Alerts</p>
              <p className="text-[11px] text-slate-400">Seat lock expiration warnings & booking status updates</p>
            </div>
            <button
              onClick={() => handleToggleChannel('inApp', preferences.inApp)}
              className={`w-11 h-6 rounded-full transition-colors p-0.5 ${
                preferences.inApp ? 'bg-brand' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  preferences.inApp ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Active Login Sessions */}
      {sessions.length > 0 && (
        <div className="bg-cinema-card border border-cinema-border rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-bold text-white border-b border-cinema-border/60 pb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>Active Login Sessions</span>
          </h2>

          <div className="space-y-2.5">
            {sessions.map(session => (
              <div
                key={session._id}
                className="flex items-center justify-between p-3 rounded-lg bg-cinema-elevated/50 border border-cinema-border text-xs"
              >
                <div className="flex items-center gap-3">
                  <Laptop className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="font-semibold text-slate-200">
                      {session.userAgent || 'Web Browser'}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      IP: {session.ipAddress || '127.0.0.1'} • Logged in: {new Date(session.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleRevokeSession(session._id)}
                  className="p-1.5 rounded text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  title="Revoke session"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfilePage;

