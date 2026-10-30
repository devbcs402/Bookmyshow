import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Film,
  MapPin,
  ChevronDown,
  Bell,
  Heart,
  User,
  LogOut,
  Ticket,
  Menu,
  X,
  Compass
} from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { useCityStore } from '../../store/city.store';
import CitySelectorModal from './CitySelectorModal';
import SearchAutocompleteDropdown from './SearchAutocompleteDropdown';
import Button from '../common/Button';
import notificationsApi from '../../services/api/notifications.api';

export function Header() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { currentCity } = useCityStore();
  const [isCityModalOpen, setIsCityModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsUserMenuOpen(false);
  }, [location.pathname]);

  // Fetch unread notification count if authenticated
  useEffect(() => {
    let mounted = true;
    if (isAuthenticated) {
      notificationsApi
        .getUnreadCount()
        .then(res => {
          if (mounted && res?.data?.unreadCount !== undefined) {
            setUnreadCount(res.data.unreadCount);
          }
        })
        .catch(() => {});
    } else {
      setUnreadCount(0);
    }
    return () => {
      mounted = false;
    };
  }, [isAuthenticated, location.pathname]);

  const handleLogout = async () => {
    await logout();
    setIsUserMenuOpen(false);
    navigate('/');
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-cinema-darkest/95 backdrop-blur-md border-b border-cinema-border/80 transition-all">
        {/* Main Header Row */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Left: Brand Logo & City Selector */}
          <div className="flex items-center gap-4 sm:gap-6">
            <Link to="/" className="flex items-center gap-2 group flex-shrink-0">
              <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center text-white shadow-cinema-glow transition-transform group-hover:scale-105">
                <Film className="w-5 h-5" />
              </div>
              <span className="font-extrabold text-lg sm:text-xl tracking-tight text-white flex items-center">
                Book<span className="text-brand">My</span>Show
              </span>
            </Link>

            {/* City Selector Button */}
            <button
              onClick={() => setIsCityModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cinema-elevated/80 border border-cinema-border text-xs sm:text-sm text-slate-200 hover:text-white hover:border-slate-500 transition-all"
            >
              <MapPin className="w-3.5 h-3.5 text-brand" />
              <span className="max-w-[100px] sm:max-w-[140px] truncate font-medium">
                {currentCity?.name || 'Select City'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>

          {/* Center: Search Autocomplete (hidden on mobile, shown on md+) */}
          <div className="hidden md:block flex-1 max-w-md mx-2">
            <SearchAutocompleteDropdown />
          </div>

          {/* Right Navigation Controls */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Quick Links */}
            <nav className="hidden lg:flex items-center gap-5 text-sm font-medium text-slate-300">
              <Link to="/movies" className="hover:text-white transition-colors">
                Movies
              </Link>
              <Link to="/theatres" className="hover:text-white transition-colors">
                Theatres
              </Link>
            </nav>

            {/* Wishlist Link */}
            <Link
              to="/wishlist"
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              title="Wishlist"
            >
              <Heart className="w-4 h-4 sm:w-5 sm:h-5" />
            </Link>

            {/* Notifications Link with Badge */}
            {isAuthenticated && (
              <Link
                to="/notifications"
                className="relative p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                title="Notifications"
              >
                <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-brand text-[10px] font-bold text-white rounded-full flex items-center justify-center animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
            )}

            {/* User Profile / Auth State */}
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-800 transition-colors focus:outline-none"
                >
                  <div className="w-8 h-8 rounded-full bg-brand/20 border border-brand/40 text-brand flex items-center justify-center font-bold text-xs uppercase">
                    {user?.name ? user.name[0] : 'U'}
                  </div>
                  <span className="hidden sm:inline text-xs font-medium text-slate-200 max-w-[90px] truncate">
                    {user?.name || 'My Account'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {/* Dropdown Menu */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-cinema-card border border-cinema-border rounded-xl shadow-2xl py-1.5 z-50 animate-fade-in text-sm">
                    <div className="px-4 py-2 border-b border-cinema-border/60">
                      <p className="font-semibold text-slate-100 truncate text-xs">
                        {user?.name || 'Customer'}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {user?.email}
                      </p>
                    </div>

                    <Link
                      to="/my-bookings"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                      <Ticket className="w-4 h-4 text-brand" />
                      <span>My Bookings</span>
                    </Link>

                    <Link
                      to="/profile"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                      <User className="w-4 h-4 text-slate-400" />
                      <span>Profile & Settings</span>
                    </Link>

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-red-400 hover:bg-red-500/10 transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/login')}
                >
                  Sign In
                </Button>
              </div>
            )}

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Search Bar Row (shown only on mobile) */}
        <div className="md:hidden px-4 pb-3">
          <SearchAutocompleteDropdown />
        </div>

        {/* Mobile Slide-down Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-cinema-border bg-cinema-darkest px-4 pt-3 pb-5 space-y-3 animate-fade-in">
            <Link
              to="/movies"
              className="flex items-center gap-3 p-2 rounded-lg text-slate-200 hover:bg-slate-800"
            >
              <Film className="w-4 h-4 text-brand" />
              <span className="text-sm font-medium">Browse Movies</span>
            </Link>
            <Link
              to="/theatres"
              className="flex items-center gap-3 p-2 rounded-lg text-slate-200 hover:bg-slate-800"
            >
              <Compass className="w-4 h-4 text-sky-400" />
              <span className="text-sm font-medium">Explore Theatres</span>
            </Link>
            {isAuthenticated && (
              <>
                <Link
                  to="/my-bookings"
                  className="flex items-center gap-3 p-2 rounded-lg text-slate-200 hover:bg-slate-800"
                >
                  <Ticket className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-medium">My Bookings</span>
                </Link>
                <Link
                  to="/profile"
                  className="flex items-center gap-3 p-2 rounded-lg text-slate-200 hover:bg-slate-800"
                >
                  <User className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-medium">Profile & Preferences</span>
                </Link>
              </>
            )}
          </div>
        )}
      </header>

      {/* City Selector Modal */}
      <CitySelectorModal
        isOpen={isCityModalOpen}
        onClose={() => setIsCityModalOpen(false)}
      />
    </>
  );
}

export default Header;

