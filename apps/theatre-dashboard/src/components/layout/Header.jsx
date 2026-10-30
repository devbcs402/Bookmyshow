import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Menu, Bell, LogOut, Building, User } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { useTheatreContextStore } from '../../store/theatreContext.store';
import { theatresApi } from '../../services/api/theatres.api';
import { notificationsApi } from '../../services/api/notifications.api';
import Button from '../ui/Button';

export function Header({ onMenuClick }) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { selectedTheatreId, setSelectedTheatreId } = useTheatreContextStore();

  // Query theatres owned by partner for context switcher
  const { data: theatresData } = useQuery({
    queryKey: ['myTheatresSwitcher'],
    queryFn: () => theatresApi.getMyTheatres({ limit: 50 }),
    staleTime: 60000
  });

  const theatres = Array.isArray(theatresData)
    ? theatresData
    : theatresData?.theatres || [];

  // Automatically select first theatre if none selected
  React.useEffect(() => {
    if (theatres.length > 0 && !selectedTheatreId) {
      setSelectedTheatreId(theatres[0]._id || theatres[0].id);
    }
  }, [theatres, selectedTheatreId, setSelectedTheatreId]);

  // Query unread notifications count
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unreadNotificationsCount'],
    queryFn: () => notificationsApi.getUnreadCount(),
    refetchInterval: 30000
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="h-16 bg-cinema-dark border-b border-cinema-border px-4 lg:px-8 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Mobile Menu & Context Switcher */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-cinema-elevated lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Multiplex / Complex Switcher */}
        {theatres.length > 0 ? (
          <div className="flex items-center gap-2 bg-cinema-card border border-cinema-border rounded-lg px-3 py-1.5">
            <Building className="w-4 h-4 text-partner-400 shrink-0" />
            <select
              value={selectedTheatreId || ''}
              onChange={(e) => setSelectedTheatreId(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-200 focus:outline-none cursor-pointer max-w-[200px] truncate"
            >
              {theatres.map((t) => (
                <option key={t._id || t.id} value={t._id || t.id} className="bg-cinema-dark text-slate-200">
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
            <Building className="w-4 h-4 text-slate-500" />
            <span>Theatre Partner Console</span>
          </div>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* Notifications Icon */}
        <Link
          to="/notifications"
          className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-cinema-elevated transition-colors"
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand animate-pulse" />
          )}
        </Link>

        {/* User Profile Quick Link */}
        <Link
          to="/settings"
          className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-300 hover:text-white px-3 py-1.5 rounded-lg hover:bg-cinema-elevated transition-colors"
        >
          <User className="w-4 h-4 text-slate-400" />
          <span>{user?.name?.split(' ')[0] || 'Profile'}</span>
        </Link>

        {/* Logout Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          icon={LogOut}
          className="text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
        >
          <span className="hidden md:inline">Sign Out</span>
        </Button>
      </div>
    </header>
  );
}

export default Header;

