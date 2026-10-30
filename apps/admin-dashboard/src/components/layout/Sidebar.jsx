import React from 'react';
import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Building2,
  CheckSquare,
  Film,
  Tv,
  Calendar,
  Ticket,
  CreditCard,
  DollarSign,
  Users,
  Bell,
  BarChart3,
  FileText,
  Activity,
  Settings,
  Tag
} from 'lucide-react';
import { adminTheatresApi } from '../../services/api/admin-theatres.api';
import { adminMoviesApi } from '../../services/api/admin-movies.api';
import { useAuthStore } from '../../store/auth.store';
import { cn } from '../../utils/cn';

export function Sidebar({ isOpen, onClose }) {
  const { user } = useAuthStore();

  // Query pending theatre approvals count
  const { data: pendingTheatresData } = useQuery({
    queryKey: ['pendingTheatresCount'],
    queryFn: () => adminTheatresApi.getAllTheatres({ status: 'PENDING_APPROVAL', limit: 1 }),
    refetchInterval: 30000
  });

  const pendingTheatresCount = pendingTheatresData?.total ?? 0;

  const navSections = [
    {
      title: 'Platform Intelligence',
      items: [
        { label: 'Master Overview', path: '/', icon: LayoutDashboard },
        { label: 'Analytics & Reports', path: '/analytics', icon: BarChart3 },
        { label: 'System Health & Metrics', path: '/system-health', icon: Activity }
      ]
    },
    {
      title: 'Exhibitor Governance',
      items: [
        {
          label: 'Theatre Approvals',
          path: '/theatre-approvals',
          icon: CheckSquare,
          badge: pendingTheatresCount > 0 ? pendingTheatresCount : null
        },
        { label: 'Theatres & Multiplexes', path: '/theatres', icon: Building2 },
        { label: 'Branches Oversight', path: '/branches', icon: Building2 }
      ]
    },
    {
      title: 'Content & Scheduling',
      items: [
        { label: 'Movie Catalog', path: '/movies', icon: Film },
        { label: 'Movie Approvals', path: '/movie-approvals', icon: CheckSquare },
        { label: 'Screens & Layouts', path: '/screens', icon: Tv },
        { label: 'Show Schedules', path: '/shows', icon: Calendar }
      ]
    },
    {
      title: 'Commerce & Financials',
      items: [
        { label: 'Bookings Explorer', path: '/bookings', icon: Ticket },
        { label: 'Payments & Transactions', path: '/payments', icon: CreditCard },
        { label: 'Refunds Management', path: '/refunds', icon: DollarSign },
        { label: 'Settlements & Commission', path: '/settlements', icon: DollarSign },
        { label: 'Coupons & Promotions', path: '/coupons', icon: Tag }
      ]
    },
    {
      title: 'Administration',
      items: [
        { label: 'User Accounts', path: '/users', icon: Users },
        { label: 'Announcements', path: '/notifications', icon: Bell },
        { label: 'Administrative Audit Logs', path: '/audit-logs', icon: FileText },
        { label: 'Platform Settings', path: '/settings', icon: Settings }
      ]
    }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed top-0 bottom-0 left-0 z-40 w-64 bg-admin-sidebar text-slate-300 border-r border-slate-800 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-3 bg-admin-sidebar/80">
          <div className="w-8 h-8 rounded-lg bg-admin-primary flex items-center justify-center font-black text-white text-base shadow-sm">
            BMS
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-wide">SUPER ADMIN</h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
              Platform Governance
            </p>
          </div>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-6">
          {navSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                {section.title}
              </p>
              {section.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  onClick={() => {
                    if (window.innerWidth < 1024) onClose();
                  }}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150',
                      isActive
                        ? 'bg-admin-primary text-white font-semibold shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-admin-sidebarHover'
                    )
                  }
                >
                  <div className="flex items-center gap-2.5">
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-500 text-slate-900">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </div>

        {/* Footer Admin Tag */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-admin-primary/20 border border-admin-primary/40 flex items-center justify-center text-xs font-bold text-admin-primary uppercase">
              SA
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{user?.name || 'Super Administrator'}</p>
              <p className="text-[10px] text-emerald-400 font-semibold tracking-wider truncate">
                ROOT PRIVILEGES
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;

