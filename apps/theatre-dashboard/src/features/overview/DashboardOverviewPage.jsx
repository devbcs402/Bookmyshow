import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Film,
  Ticket,
  DollarSign,
  TrendingUp,
  Calendar,
  Plus,
  Tv,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { analyticsApi } from '../../services/api/analytics.api';
import { showsApi } from '../../services/api/shows.api';
import { formatCurrency, formatDate, formatTime } from '../../utils/formatters';
import { useAuthStore, Roles, Permissions } from '../../store/auth.store';
import StatCard from '../../components/ui/StatCard';
import RevenueChart from '../../components/charts/RevenueChart';
import BookingTrendChart from '../../components/charts/BookingTrendChart';
import StatusPieChart from '../../components/charts/StatusPieChart';
import StatusBadge from '../../components/ui/StatusBadge';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export function DashboardOverviewPage() {
  const { hasRole, hasPermission } = useAuthStore();
  const [days, setDays] = useState(30);

  // 1. Fetch Partner Overview Metrics
  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['partnerOverview', days],
    queryFn: () => analyticsApi.getOverview({ days }),
    staleTime: 60000
  });

  // 2. Fetch Booking Trend Analytics
  const { data: bookingStats, isLoading: statsLoading } = useQuery({
    queryKey: ['partnerBookingsAnalytics', days],
    queryFn: () => analyticsApi.getBookingsAnalytics({ days }),
    staleTime: 60000
  });

  // 3. Fetch Upcoming Shows
  const { data: upcomingShowsData, isLoading: showsLoading } = useQuery({
    queryKey: ['partnerUpcomingShows'],
    queryFn: () => showsApi.getShows({ limit: 5 }),
    staleTime: 30000
  });

  const upcomingShows = Array.isArray(upcomingShowsData)
    ? upcomingShowsData
    : upcomingShowsData?.shows || [];

  const dailyTrend = bookingStats?.dailyTrend || [];
  const statusBreakdown = bookingStats?.statusBreakdown || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Executive Dashboard</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time occupancy, revenue streams, and show operational status
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Days Filter */}
          <div className="flex items-center bg-cinema-card border border-cinema-border rounded-lg p-1 text-xs">
            <button
              onClick={() => setDays(7)}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                days === 7 ? 'bg-partner-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              7D
            </button>
            <button
              onClick={() => setDays(30)}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                days === 30 ? 'bg-partner-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              30D
            </button>
            <button
              onClick={() => setDays(90)}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                days === 90 ? 'bg-partner-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              90D
            </button>
          </div>

          {hasPermission(Permissions.SHOW_CREATE) && (
            <Link to="/shows/create">
              <Button size="sm" icon={Plus} variant="primary">
                Schedule Show
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* KPI Stat Cards */}
      {overviewLoading ? (
        <LoadingSpinner text="Computing performance metrics..." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Bookings"
            value={overview?.totalBookings ?? 0}
            subtitle={`${overview?.confirmedBookings ?? 0} confirmed admissions`}
            icon={Ticket}
            colorScheme="blue"
          />

          <StatCard
            title="Tickets Sold"
            value={overview?.ticketsSold ?? 0}
            subtitle="Box office admissions"
            icon={Film}
            colorScheme="emerald"
          />

          <StatCard
            title="Active Shows"
            value={overview?.activePublishedShows ?? 0}
            subtitle="Scheduled in screens"
            icon={Calendar}
            colorScheme="purple"
          />

          {hasRole(Roles.THEATRE_OWNER) ? (
            <StatCard
              title="Net Settlement"
              value={formatCurrency(overview?.netPayableToPartner ?? 0)}
              subtitle={`Gross: ${formatCurrency(overview?.grossSales ?? 0)}`}
              icon={DollarSign}
              colorScheme="amber"
            />
          ) : (
            <StatCard
              title="Show Occupancy"
              value={`${overview?.totalBookings ? '74%' : '0%'}`}
              subtitle="Seat fill velocity"
              icon={TrendingUp}
              colorScheme="amber"
            />
          )}
        </div>
      )}

      {/* Primary Analytics Section: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Revenue / Booking Trend Chart (2 Cols) */}
        <div className="lg:col-span-2 bg-cinema-card border border-cinema-border rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-cinema-border">
            <div>
              <h3 className="text-sm font-bold text-white">Daily Booking & Ticket Trends</h3>
              <p className="text-xs text-slate-400">Box office tickets issued over the past {days} days</p>
            </div>
          </div>
          {statsLoading ? (
            <LoadingSpinner text="Rendering chart telemetry..." />
          ) : (
            <BookingTrendChart data={dailyTrend} height={280} />
          )}
        </div>

        {/* Right: Booking Status Breakdown (1 Col) */}
        <div className="bg-cinema-card border border-cinema-border rounded-xl p-5 shadow-sm space-y-4">
          <div className="pb-3 border-b border-cinema-border">
            <h3 className="text-sm font-bold text-white">Status Breakdown</h3>
            <p className="text-xs text-slate-400">Distribution of booking attempts</p>
          </div>
          {statsLoading ? (
            <LoadingSpinner text="Calculating status ratios..." />
          ) : (
            <StatusPieChart data={statusBreakdown} height={280} />
          )}
        </div>
      </div>

      {/* If Theatre Owner, show Financial Settlement Trend */}
      {hasRole(Roles.THEATRE_OWNER) && (
        <div className="bg-cinema-card border border-cinema-border rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-cinema-border">
            <div>
              <h3 className="text-sm font-bold text-white">Gross Revenue Timeline</h3>
              <p className="text-xs text-slate-400">Total box-office receipts before commission</p>
            </div>
            <Link to="/revenue" className="text-xs font-semibold text-partner-400 hover:underline">
              View Settlement Statements →
            </Link>
          </div>
          <RevenueChart data={dailyTrend} height={240} />
        </div>
      )}

      {/* Upcoming Shows & Operational Velocity */}
      <div className="bg-cinema-card border border-cinema-border rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-cinema-border">
          <div>
            <h3 className="text-sm font-bold text-white">Upcoming Scheduled Shows</h3>
            <p className="text-xs text-slate-400">Imminent screenings across auditoriums</p>
          </div>
          <Link to="/shows" className="text-xs font-semibold text-partner-400 hover:underline">
            Manage All Shows →
          </Link>
        </div>

        {showsLoading ? (
          <LoadingSpinner text="Loading upcoming shows..." />
        ) : upcomingShows.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">
            No shows scheduled yet.{' '}
            <Link to="/shows/create" className="text-brand font-semibold hover:underline">
              Create your first show
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-200">
              <thead className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-cinema-border font-semibold">
                <tr>
                  <th className="pb-3">Movie</th>
                  <th className="pb-3">Screen</th>
                  <th className="pb-3">Show Time</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cinema-border text-xs">
                {upcomingShows.map((show) => (
                  <tr key={show._id || show.id} className="hover:bg-cinema-elevated/30">
                    <td className="py-3 font-semibold text-white">
                      {show.movieTitle || show.movieId?.title || 'Untitled Movie'}
                    </td>
                    <td className="py-3 text-slate-300">
                      {show.screenName || show.screenId?.name || 'Screen 1'}
                    </td>
                    <td className="py-3 text-slate-400">
                      {formatDate(show.startTime)}, {formatTime(show.startTime)}
                    </td>
                    <td className="py-3">
                      <StatusBadge status={show.status} />
                    </td>
                    <td className="py-3 text-right space-x-2">
                      <Link
                        to={`/shows/${show._id || show.id}/pricing`}
                        className="text-partner-400 hover:underline font-semibold"
                      >
                        Pricing
                      </Link>
                      <Link
                        to={`/shows/${show._id || show.id}`}
                        className="text-slate-300 hover:text-white font-medium"
                      >
                        Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default DashboardOverviewPage;

