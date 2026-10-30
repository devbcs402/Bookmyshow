import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore, Roles } from '../../store/auth.store';
import LoadingSpinner from '../ui/LoadingSpinner';

export default function ProtectedRoute({ children }) {
  const location = useLocation();
  const { isAuthenticated, user, isLoading, initializeAuth } = useAuthStore();

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-slate-900">
        <div className="text-center">
          <LoadingSpinner size="lg" className="text-primary-500" />
          <p className="mt-4 text-sm font-medium text-slate-300 tracking-wide">
            Verifying Platform Admin Privileges...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Strict Super Admin Verification
  if (user.role !== Roles.SUPER_ADMIN) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}

