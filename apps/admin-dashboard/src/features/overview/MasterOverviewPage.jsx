import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  DollarSign,
  TrendingUp,
  Ticket,
  Building2,
  Film,
  Users,
  ShieldAlert,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import StatCard from '../../components/ui/StatCard';
import StatusBadge from '../../components/ui/StatusBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import RevenueTrendChart from '../../components/charts/RevenueTrendChart';
import BookingVelocityChart from '../../components/charts/BookingVelocityChart';
import StatusDonutChart from '../../components/charts/StatusDonutChart';
import { adminAnalyticsApi } from '../../services/api/admin-analytics.api';
import { adminTheatresApi } from '../../services/api/admin-theatres.api';
import { adminBookingsApi } from '../../services/api/admin-bookings.api';
import { formatCurrency, formatNumber, formatDate, formatTime } from '../../utils/formatters';

export default function MasterOverviewPage() {
  // Fetch high-level platform overview
  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['admin-overview-kpis'],
    queryFn: adminAnalyticsApi.getOverview,
    refetchInterval: 60000,
  });

  // Fetch 30-day revenue analytics
  const { data: revenueData, isLoading: revenueLoading } = useQuery({
    queryKey: ['admin-overview-revenue-trend'],
    queryFn: () => adminAnalyticsApi.getRevenue({ days: 30 }),
  });

  // Fetch 30-day booking trends
  const { data: bookingsData, isLoading: bookingsLoading } = useQuery({
    queryKey: ['admin-overview-bookings-trend'],
    queryFn: () => adminAnalyticsApi.getBookings({ days: 30 }),
  });

  // Fetch pending theatre approvals
  const { data: pendingTheatres } = useQuery({
    queryKey: ['admin-pending-theatres-mini'],
    queryFn: () => adminTheatresApi.getAllTheatres({ status: 'PENDING_APPROVAL', limit: 5 }),
  });

  // Fetch recent bookings
  const { data: recentBookings } = useQuery({
    queryKey: ['admin-recent-bookings-mini'],
    queryFn: () => adminBookingsApi.getAllBookings({ limit: 6, page: 1 }),
  });

  if (overviewLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const grossRevenue = overview?.bookings?.totalRevenue || 0;
  const platformCommission = grossRevenue * 0.10; // 10% standard platform take rate
  const totalBookings = overview?.bookings?.total || 0;
  const pendingApprovalsCount = (overview?.theatres?.pendingApproval || 0) + (overview?.movies?.pendingApproval || 0);

  // Status donut data
  const bookingStatusData = [
    { name: 'Confirmed', value: overview?.bookings?.confirmed || 0, color: '#10b981' },
    { name: 'Cancelled', value: overview?.bookings?.cancelled || 0, color: '#f43f5e' },
    { name: 'Pending / Other', value: Math.max(0, totalBookings - (overview?.bookings?.confirmed || 0) - (overview?.bookings?.cancelled || 0)), color: '#f59e0b' }
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner / Actions Needed */}
      {pendingApprovalsCount > 0 && (
        <div className="rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 p-4 shadow-sm sm:flex sm:items-center sm:justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-950">
                Compliance & Onboarding Actions Required
              </h3>
              <p className="text-xs text-amber-800">
                You have <span className="font-semibold">{overview?.theatres?.pendingApproval || 0}</span> theatre registration(s) and{' '}
                <span className="font-semibold">{overview?.movies?.pendingApproval || 0}</span> movie approval(s) waiting for review.
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center space-x-2 sm:mt-0">
            <Link
              to="/theatre-approvals"
              className="inline-flex items-center rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-amber-700 transition-colors"
            >
              Review Approvals
              <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Platform GMV"
          value={formatCurrency(grossRevenue)}
          description="Gross aggregate ticket sales"
          icon={DollarSign}
        />
        <StatCard
          title="Platform Commission (10%)"
          value={formatCurrency(platformCommission)}
          description="Earned net platform revenue"
          icon={TrendingUp}
        />
        <StatCard
          title="Total Platform Bookings"
          value={formatNumber(totalBookings)}
          description={`${formatNumber(overview?.bookings?.confirmed || 0)} confirmed`}
          icon={Ticket}
        />
        <StatCard
          title="Theatres / Exhibitors"
          value={`${formatNumber(overview?.theatres?.active || 0)} / ${formatNumber(overview?.theatres?.total || 0)}`}
          description={`${overview?.theatres?.pendingApproval || 0} pending review`}
          icon={Building2}
        />
      </div>

      {/* Secondary KPI Row */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Master Catalog</span>
            <Film className="h-4 w-4 text-primary-600" />
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-900">{formatNumber(overview?.movies?.published || 0)}</span>
            <span className="text-xs text-slate-500">published / {formatNumber(overview?.movies?.total || 0)} total</span>
          </div>
          <div className="mt-3 text-xs text-slate-600">
            <Link to="/movies" className="font-semibold text-primary-600 hover:text-primary-700 inline-flex items-center">
              Manage Movie Catalog <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Registered Users</span>
            <Users className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-900">{formatNumber(overview?.users?.total || 0)}</span>
            <span className="text-xs text-slate-500">customers & partners</span>
          </div>
          <div className="mt-3 text-xs text-slate-600">
            <Link to="/users" className="font-semibold text-primary-600 hover:text-primary-700 inline-flex items-center">
              Inspect Platform Users <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Settlements Ledger</span>
            <RotateCcw className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-900">{formatCurrency(grossRevenue - platformCommission)}</span>
            <span className="text-xs text-slate-500">theatre payable</span>
          </div>
          <div className="mt-3 text-xs text-slate-600">
            <Link to="/settlements" className="font-semibold text-primary-600 hover:text-primary-700 inline-flex items-center">
              View Settlement Accounts <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          </div>
        </div>
      </div>

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <RevenueTrendChart
            data={revenueData?.timeline || []}
            title="30-Day Platform Gross Sales vs Platform Commission"
          />
          <BookingVelocityChart
            data={bookingsData?.timeline || []}
            title="Daily Ticket Volume Velocity"
          />
        </div>

        <div className="space-y-6">
          <StatusDonutChart
            data={bookingStatusData}
            title="Booking Lifecycle Distribution"
          />

          {/* Pending Theatres Quick Queue */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Pending Exhibitor Approvals</h3>
              <Link to="/theatre-approvals" className="text-xs font-medium text-primary-600 hover:underline">
                View All
              </Link>
            </div>
            <div className="mt-3 divide-y divide-slate-100">
              {pendingTheatres?.theatres?.length > 0 ? (
                pendingTheatres.theatres.map((theatre) => (
                  <div key={theatre._id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-900">{theatre.name}</p>
                      <p className="text-[11px] text-slate-500">{theatre.city || 'Location unassigned'}</p>
                    </div>
                    <Link
                      to={`/theatre-approvals/${theatre._id}`}
                      className="rounded bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-200"
                    >
                      Audit
                    </Link>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-slate-400">
                  <CheckCircle2 className="mx-auto h-6 w-6 text-emerald-500 mb-1" />
                  No pending exhibitor registrations
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Bookings Stream Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Recent Platform Transactions</h3>
            <p className="text-xs text-slate-500">Live stream of customer bookings across all partner theatres</p>
          </div>
          <Link
            to="/bookings"
            className="inline-flex items-center text-xs font-semibold text-primary-600 hover:text-primary-700"
          >
            Explore All Bookings
            <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Booking ID / Ref</th>
                <th className="px-6 py-3">Show & Movie</th>
                <th className="px-6 py-3">Seats</th>
                <th className="px-6 py-3">Amount</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentBookings?.bookings?.length > 0 ? (
                recentBookings.bookings.map((booking) => (
                  <tr key={booking._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-3.5 font-mono font-medium text-slate-900">
                      <Link to={`/bookings/${booking._id}`} className="hover:text-primary-600">
                        {booking.bookingReference || booking._id.slice(-8)}
                      </Link>
                    </td>
                    <td className="px-6 py-3.5 font-medium text-slate-800">
                      {booking.show?.movie?.title || 'Screening'}
                    </td>
                    <td className="px-6 py-3.5 text-slate-600">
                      {booking.seats?.length || 1} seat(s)
                    </td>
                    <td className="px-6 py-3.5 font-semibold text-slate-900">
                      {formatCurrency(booking.totalAmount || 0)}
                    </td>
                    <td className="px-6 py-3.5">
                      <StatusBadge status={booking.status} />
                    </td>
                    <td className="px-6 py-3.5 text-slate-500">
                      {formatDate(booking.createdAt)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-slate-400">
                    No recent booking activity recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

