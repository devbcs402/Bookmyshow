import React, { useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { 
  Bell, 
  ChevronRight, 
  LogOut, 
  ShieldAlert, 
  User, 
  Activity, 
  Search,
  ExternalLink
} from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { useQuery } from '@tanstack/react-query';
import { healthApi } from '../../services/api/health.api';

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  // Health poll every 30 seconds
  const { data: healthData, isError } = useQuery({
    queryKey: ['system-health-live'],
    queryFn: healthApi.getLive,
    refetchInterval: 30000,
    retry: 1,
  });

  const isHealthy = !isError && healthData?.status === 'ok';

  // Build breadcrumb segments from pathname
  const pathnames = location.pathname.split('/').filter(Boolean);
  const breadcrumbs = [
    { label: 'Super Admin', path: '/' },
    ...pathnames.map((segment, index) => {
      const path = `/${pathnames.slice(0, index + 1).join('/')}`;
      const formatted = segment
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
      return { label: formatted, path };
    }),
  ];

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch {
      navigate('/login');
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm">
      {/* Left: Breadcrumbs & Page Context */}
      <div className="flex items-center space-x-2 text-sm text-slate-500">
        <nav aria-label="Breadcrumb" className="flex items-center space-x-1.5">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={crumb.path}>
              {idx > 0 && <ChevronRight className="h-4 w-4 text-slate-400" />}
              {idx === breadcrumbs.length - 1 ? (
                <span className="font-semibold text-slate-800">{crumb.label}</span>
              ) : (
                <Link
                  to={crumb.path}
                  className="hover:text-primary-600 transition-colors"
                >
                  {crumb.label}
                </Link>
              )}
            </React.Fragment>
          ))}
        </nav>
      </div>

      {/* Right: Actions, Health Status & Super Admin Profile */}
      <div className="flex items-center space-x-4">
        {/* Live System Health Badge */}
        <Link
          to="/system-health"
          title="Inspect Infrastructure Health"
          className="flex items-center space-x-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <span
            className={`h-2 w-2 rounded-full ${
              isHealthy ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
            }`}
          />
          <span className="hidden sm:inline">
            {isHealthy ? 'Systems Live' : 'Health Alert'}
          </span>
          <Activity className="h-3.5 w-3.5 text-slate-400" />
        </Link>

        {/* Global Admin Search / Quick Jump */}
        <button
          onClick={() => navigate('/bookings')}
          title="Search Bookings & Records"
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
        >
          <Search className="h-4 w-4" />
        </button>

        {/* Notifications Jump */}
        <Link
          to="/notifications"
          title="Announcements & Alerts"
          className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary-600" />
        </Link>

        <div className="h-6 w-px bg-slate-200" />

        {/* User Pill & Dropdown */}
        <div className="relative">
          <button
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="flex items-center space-x-3 rounded-lg p-1.5 hover:bg-slate-50 transition-colors focus:outline-none"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white shadow-sm ring-2 ring-primary-500/20">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : 'SA'}
            </div>
            <div className="hidden text-left md:block">
              <p className="text-xs font-semibold text-slate-900">
                {user?.name || 'Super Admin'}
              </p>
              <span className="inline-block rounded bg-primary-50 px-1.5 py-0.2 text-[10px] font-semibold uppercase tracking-wider text-primary-700">
                Platform Admin
              </span>
            </div>
          </button>

          {userDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 bg-white py-2 shadow-xl z-50">
              <div className="border-b border-slate-100 px-4 py-2.5">
                <p className="text-xs font-semibold text-slate-900 truncate">
                  {user?.name || 'Platform Administrator'}
                </p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                <div className="mt-1.5 inline-flex items-center space-x-1 rounded bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                  <ShieldAlert className="h-3 w-3 text-amber-600" />
                  <span>Full Platform Privileges</span>
                </div>
              </div>

              <div className="py-1">
                <Link
                  to="/settings"
                  onClick={() => setUserDropdownOpen(false)}
                  className="flex items-center space-x-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <User className="h-4 w-4 text-slate-400" />
                  <span>Platform Settings</span>
                </Link>
                <Link
                  to="/audit-logs"
                  onClick={() => setUserDropdownOpen(false)}
                  className="flex items-center space-x-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Activity className="h-4 w-4 text-slate-400" />
                  <span>View Security Audit Logs</span>
                </Link>
              </div>

              <div className="border-t border-slate-100 pt-1">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center space-x-2.5 px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out of Platform</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

