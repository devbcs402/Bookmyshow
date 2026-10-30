import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldX, LogOut, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import Button from '../../components/ui/Button';

export default function UnauthorizedPage() {
  const { user, logout } = useAuthStore();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 px-4 text-center">
      <div className="rounded-2xl border border-rose-500/20 bg-slate-800/80 p-8 shadow-2xl backdrop-blur-md max-w-md w-full">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10 text-rose-400">
          <ShieldX className="h-8 w-8" />
        </div>
        
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-white">
          Access Denied
        </h1>
        
        <p className="mt-2 text-sm text-slate-400">
          This portal is strictly restricted to <span className="font-semibold text-rose-400">SUPER_ADMIN</span> credentials.
          {user?.role && (
            <span className="block mt-1">
              Your current account role is <code className="bg-slate-700 text-slate-200 px-1.5 py-0.5 rounded text-xs">{user.role}</code>.
            </span>
          )}
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <Button
            variant="danger"
            onClick={logout}
            className="w-full justify-center"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out & Switch Account
          </Button>
          <Link to="/login">
            <Button variant="outline" className="w-full justify-center border-slate-700 text-slate-300 hover:bg-slate-700">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Return to Login
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

