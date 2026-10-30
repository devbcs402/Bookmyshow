import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Film,
  Building2,
  Tv,
  Calendar,
  Ticket,
  DollarSign,
  Users,
  Activity,
  Bell,
  Settings,
  Grid
} from 'lucide-react';
import { useAuthStore, Roles, Permissions } from '../../store/auth.store';
import { cn } from '../../utils/cn';

export function Sidebar({ isOpen, onClose }) {
  const { user, hasRole, hasPermission } = useAuthStore();

  const navSections = [
    {
      title: 'Operations & Core',
      items: [
        {
          label: 'Overview',
          path: '/',
          icon: LayoutDashboard,
          show: true
        },
        {
          label: 'Live Operations',
          path: '/operations',
          icon: Activity,
          show: hasPermission(Permissions.THEATRE_READ)
        },
        {
          label: 'Show Schedule',
          path: '/shows',
          icon: Calendar,
          show: hasPermission(Permissions.SHOW_READ)
        },
        {
          label: 'Bookings & Admissions',
          path: '/bookings',
          icon: Ticket,
          show: hasPermission(Permissions.BOOKING_READ)
        }
      ]
    },
    {
      title: 'Infrastructure',
      items: [
        {
          label: 'Theatres',
          path: '/theatres',
          icon: Building2,
          show: hasPermission(Permissions.THEATRE_READ)
        },
        {
          label: 'Branches & Multiplexes',
          path: '/branches',
          icon: Building2,
          show: hasPermission(Permissions.THEATRE_READ)
        },
        {
          label: 'Auditorium Screens',
          path: '/screens',
          icon: Tv,
          show: hasPermission(Permissions.THEATRE_READ)
        },
        {
          label: 'Seat Categories',
          path: '/seat-categories',
          icon: Grid,
          show: hasPermission(Permissions.SCREEN_MANAGE)
        },
        {
          label: 'Movie Catalog',
          path: '/movies',
          icon: Film,
          show: hasPermission(Permissions.MOVIE_READ)
        }
      ]
    },
    {
      title: 'Management & Finance',
      items: [
        {
          label: 'Revenue & Settlements',
          path: '/revenue',
          icon: DollarSign,
          show: hasRole(Roles.THEATRE_OWNER) && hasPermission(Permissions.REPORT_READ)
        },
        {
          label: 'Staff Oversight',
          path: '/staff',
          icon: Users,
          show: hasPermission(Permissions.STAFF_MANAGE)
        },
        {
          label: 'Notifications',
          path: '/notifications',
          icon: Bell,
          show: true
        },
        {
          label: 'Partner Settings',
          path: '/settings',
          icon: Settings,
          show: true
        }
      ]
    }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed top-0 bottom-0 left-0 z-40 w-64 bg-cinema-dark border-r border-cinema-border flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 border-b border-cinema-border gap-3 bg-cinema-card/50">
          <div className="w-9 h-9 rounded-lg bg-brand flex items-center justify-center font-black text-white text-lg tracking-wider shadow-sm">
            BMS
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-wide">THEATRE PARTNER</h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Management Console</p>
          </div>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
          {navSections.map((section, idx) => {
            const visibleItems = section.items.filter((item) => item.show);
            if (visibleItems.length === 0) return null;

            return (
              <div key={idx} className="space-y-1">
                <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                  {section.title}
                </p>
                {visibleItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/'}
                    onClick={() => {
                      if (window.innerWidth < 1024) onClose();
                    }}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150',
                        isActive
                          ? 'bg-partner-600/15 text-partner-400 font-semibold border-l-2 border-partner-500 pl-2.5'
                          : 'text-slate-400 hover:text-white hover:bg-cinema-elevated'
                      )
                    }
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            );
          })}
        </div>

        {/* User Card Footer */}
        <div className="p-4 border-t border-cinema-border bg-cinema-card/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-partner-500/20 border border-partner-500/30 flex items-center justify-center text-xs font-bold text-partner-400 uppercase">
              {user?.name ? user.name.slice(0, 2) : 'TP'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user?.name || 'Partner Account'}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider truncate">
                {user?.role?.replace('_', ' ') || 'STAFF'}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;

