import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Film, Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import authApi from '../../services/api/auth.api';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';

const schema = z.object({
  email: z.string().email('Please enter a valid email address')
});

export function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(schema)
  });

  const onSubmit = async data => {
    setIsLoading(true);
    setError(null);
    try {
      await authApi.forgotPassword({ email: data.email.trim().toLowerCase() });
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Unable to process password reset request');
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
          <h2 className="text-xl font-bold text-slate-100">Reset Your Password</h2>
          <p className="text-xs text-slate-400">
            Enter the email associated with your account to receive a reset link
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="text-center py-4 space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <p className="text-sm text-slate-200">
              If an account matches that email address, password reset instructions have been sent.
            </p>
            <div className="pt-2">
              <Link to="/login">
                <Button variant="secondary" size="sm" fullWidth leftIcon={ArrowLeft}>
                  Return to Sign In
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Account Email"
              type="email"
              placeholder="patron@cinema.com"
              leftIcon={Mail}
              error={errors.email?.message}
              {...register('email')}
            />

            <Button
              type="submit"
              variant="primary"
              fullWidth
              size="lg"
              isLoading={isLoading}
            >
              Send Reset Link
            </Button>

            <div className="text-center pt-2">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Sign In</span>
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default ForgotPasswordPage;

