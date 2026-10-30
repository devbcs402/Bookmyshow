import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { ShieldAlert } from 'lucide-react';
import Button from '../ui/Button';

export function ProtectedRoute({ children, allowedRoles, requiredPermission }) {
  const location = useLocation();
  const { isAuthenticated, user, hasRole, hasPermission } = useAuthStore();

  // 1. Not Authenticated -> Redirect to Login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Role Check
  if (allowedRoles && allowedRoles.length > 0) {
    if (!hasRole(...allowedRoles)) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-4">
          <div className="p-4 rounded-full bg-rose-500/10 text-rose-400">
            <ShieldAlert className="w-12 h-12" />
          </div>
          <h2 className="text-xl font-bold text-white">Access Restricted</h2>
          <p className="text-sm text-slate-400 max-w-md">
            Your user account role (<span className="text-rose-400 font-semibold">{user.role}</span>) does not have
            authorization to access this administrative module.
          </p>
          <Button variant="outline" onClick={() => window.history.back()}>
            Go Back
          </Button>
        </div>
      );
    }
  }

  // 3. Permission Check
  if (requiredPermission) {
    if (!hasPermission(requiredPermission)) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-4">
          <div className="p-4 rounded-full bg-amber-500/10 text-amber-400">
            <ShieldAlert className="w-12 h-12" />
          </div>
          <h2 className="text-xl font-bold text-white">Permission Required</h2>
          <p className="text-sm text-slate-400 max-w-md">
            This operational module requires the specific privilege:
            <span className="block mt-1 font-mono text-xs text-amber-400 bg-amber-500/10 py-1 px-2 rounded">
              {requiredPermission}
            </span>
          </p>
          <Button variant="outline" onClick={() => window.history.back()}>
            Go Back
          </Button>
        </div>
      );
    }
  }

  return children;
}

export default ProtectedRoute;

