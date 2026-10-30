import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  Building2,
  Film,
  CalendarDays,
  TicketCheck,
  XCircle,
  TrendingUp,
  Banknote,
  RotateCcw,
  Landmark,
  Clock,
  BarChart3,
  Star,
  MapPin,
  ChevronRight
} from 'lucide-react';
import { adminAnalyticsApi } from '../../services/api/admin-analytics.api';
import RevenueTrendChart from '../../components/charts/RevenueTrendChart';
import BookingVelocityChart from '../../components/charts/BookingVelocityChart';
import StatusDonutChart from '../../components/charts/StatusDonutChart';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { formatCurrency, formatCompactNumber, formatDate } from '../../utils/formatters';

// ─── Constants ─────────────────────────────────────────────────────────────────
const TABS = ['OVERVIEW', 'BOOKINGS', 'REVENUE', 'MOVIES', 'THEATRES'];

const DATE_PRESETS = [
  { label: 'Last 7 Days', days: 7 },
  { label: 'Last 30 Days', days: 30 },
  { label: 'Last 90 Days', days: 90 },
  { label: 'This Month', days: null, thisMonth: true }
];

// ─── Helpers ───────────────────────────────────────────────────────────────────
function getDateRange(preset) {
  const now = new Date();
  const to = now.toISOString().slice(0, 10);
  if (preset.thisMonth) {
    const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    return { from, to };
  }
  const from = new Date(now - preset.days * 86400000).toISOString().slice(0, 10);
  return { from, to };
}

// ─── Sub-components ────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, color = 'text-blue-600', bg = 'bg-blue-50', loading }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-start gap-4">
      <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${bg} flex items-center justify-center`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
        {loading ? (
          <div className="h-6 w-24 bg-slate-100 rounded animate-pulse mt-1" />
        ) : (
          <p className="text-xl font-bold text-slate-900 mt-0.5 truncate">{value ?? '—'}</p>
        )}
      </div>
    </div>
  );
}

function SectionCard({ title, children, className = '' }) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 ${className}`}>
      {title && (
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

function EmptyState({ message = 'No data available for the selected period.' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
      <BarChart3 className="w-10 h-10 mb-3 opacity-30" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

function RankTable({ columns, rows, emptyMessage }) {
  if (!rows || rows.length === 0) return <EmptyState message={emptyMessage} />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`pb-3 pt-1 text-xs font-semibold text-slate-500 uppercase tracking-wide ${col.align === 'right' ? 'text-right' : 'text-left'}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`py-3 ${col.align === 'right' ? 'text-right' : 'text-left'} ${col.bold ? 'font-semibold text-slate-900' : 'text-slate-600'}`}
                >
                  {col.render ? col.render(row[col.key], row, idx) : (row[col.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Tab: Overview ─────────────────────────────────────────────────────────────
function OverviewTab({ params }) {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics-overview', params],
    queryFn: () => adminAnalyticsApi.getOverview(params),
    staleTime: 60000
  });

  const kpis = [
    { icon: Users, label: 'Total Users', value: formatCompactNumber(data?.totalUsers), color: 'text-violet-600', bg: 'bg-violet-50' },
    { icon: Building2, label: 'Total Theatres', value: formatCompactNumber(data?.totalTheatres), color: 'text-blue-600', bg: 'bg-blue-50' },
    { icon: Film, label: 'Total Movies', value: formatCompactNumber(data?.totalMovies), color: 'text-cyan-600', bg: 'bg-cyan-50' },
    { icon: CalendarDays, label: 'Total Shows', value: formatCompactNumber(data?.totalShows), color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { icon: TicketCheck, label: 'Total Bookings', value: formatCompactNumber(data?.totalBookings), color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { icon: TicketCheck, label: 'Confirmed Bookings', value: formatCompactNumber(data?.confirmedBookings), color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { icon: XCircle, label: 'Cancelled Bookings', value: formatCompactNumber(data?.cancelledBookings), color: 'text-rose-600', bg: 'bg-rose-50' },
    { icon: TrendingUp, label: 'Gross Merch. Value', value: formatCurrency(data?.gmv), color: 'text-green-600', bg: 'bg-green-50' },
    { icon: Landmark, label: 'Platform Commission', value: formatCurrency(data?.commission), color: 'text-teal-600', bg: 'bg-teal-50' },
    { icon: RotateCcw, label: 'Total Refunds', value: formatCurrency(data?.refunds), color: 'text-orange-600', bg: 'bg-orange-50' },
    { icon: Banknote, label: 'Net Settlement', value: formatCurrency(data?.netSettlement), color: 'text-slate-700', bg: 'bg-slate-100' },
    { icon: Clock, label: 'Pending Approvals', value: formatCompactNumber(data?.pendingApprovals), color: 'text-amber-600', bg: 'bg-amber-50' }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {kpis.map((kpi) => (
        <KpiCard key={kpi.label} {...kpi} loading={isLoading} />
      ))}
    </div>
  );
}

// ─── Tab: Bookings ─────────────────────────────────────────────────────────────
function BookingsTab({ params }) {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics-bookings', params],
    queryFn: () => adminAnalyticsApi.getBookings(params),
    staleTime: 60000
  });

  if (isLoading) return <LoadingSpinner text="Loading booking analytics..." />;

  const trendsData = data?.trends ?? [];
  const statusBreakdown = data?.statusBreakdown ?? [];
  const popularMovies = data?.popularMovies ?? [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <SectionCard title="Booking Velocity" className="xl:col-span-2">
          <BookingVelocityChart data={trendsData} height={280} />
        </SectionCard>
        <SectionCard title="Booking Status Distribution">
          <StatusDonutChart data={statusBreakdown} height={260} />
        </SectionCard>
      </div>

      <SectionCard title="Popular Movies by Bookings">
        <RankTable
          emptyMessage="No movie booking data available."
          columns={[
            { key: 'rank', label: '#', render: (_, __, i) => <span className="font-bold text-slate-400">{i + 1}</span> },
            { key: 'title', label: 'Movie', bold: true },
            { key: 'language', label: 'Language' },
            { key: 'bookings', label: 'Bookings', align: 'right', render: (v) => formatCompactNumber(v) },
            { key: 'revenue', label: 'Revenue', align: 'right', render: (v) => formatCurrency(v) }
          ]}
          rows={popularMovies}
        />
      </SectionCard>
    </div>
  );
}

// ─── Tab: Revenue ──────────────────────────────────────────────────────────────
function RevenueTab({ params }) {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics-revenue', params],
    queryFn: () => adminAnalyticsApi.getRevenue(params),
    staleTime: 60000
  });

  if (isLoading) return <LoadingSpinner text="Loading revenue analytics..." />;

  const trendsData = data?.trends ?? [];
  const topTheatres = data?.topTheatres ?? [];

  const breakdown = [
    { label: 'Gross Merchandise Value', value: formatCurrency(data?.gmv), color: 'border-l-green-500' },
    { label: 'Platform Commission', value: formatCurrency(data?.commission), color: 'border-l-blue-500' },
    { label: 'Total Refunds', value: formatCurrency(data?.refunds), color: 'border-l-rose-500' },
    { label: 'Net Revenue', value: formatCurrency(data?.netRevenue), color: 'border-l-emerald-600' }
  ];

  return (
    <div className="space-y-6">
      <SectionCard title="Revenue Trend">
        <RevenueTrendChart data={trendsData} height={300} />
      </SectionCard>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {breakdown.map((item) => (
          <div key={item.label} className={`bg-white rounded-xl border border-slate-200 border-l-4 ${item.color} p-4`}>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{item.label}</p>
            <p className="text-lg font-bold text-slate-900 mt-1">{item.value}</p>
          </div>
        ))}
      </div>

      <SectionCard title="Top Revenue-Generating Theatres">
        <RankTable
          emptyMessage="No theatre revenue data available."
          columns={[
            { key: 'rank', label: '#', render: (_, __, i) => <span className="font-bold text-slate-400">{i + 1}</span> },
            { key: 'name', label: 'Theatre', bold: true },
            { key: 'city', label: 'City', render: (v) => <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{v}</span> },
            { key: 'bookings', label: 'Bookings', align: 'right', render: (v) => formatCompactNumber(v) },
            { key: 'revenue', label: 'Revenue', align: 'right', render: (v) => formatCurrency(v) }
          ]}
          rows={topTheatres}
        />
      </SectionCard>
    </div>
  );
}

// ─── Tab: Movies ───────────────────────────────────────────────────────────────
function MoviesTab({ params }) {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics-movies', params],
    queryFn: () => adminAnalyticsApi.getTopMovies(params),
    staleTime: 60000
  });

  if (isLoading) return <LoadingSpinner text="Loading movie analytics..." />;

  const movies = data?.movies ?? [];
  const genreDistribution = data?.genreDistribution ?? [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <SectionCard title="Top Movies by Bookings" className="xl:col-span-2">
          <RankTable
            emptyMessage="No movie performance data available."
            columns={[
              {
                key: 'rank', label: '#',
                render: (_, __, i) => (
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                    {i + 1}
                  </span>
                )
              },
              { key: 'title', label: 'Title', bold: true },
              { key: 'language', label: 'Language' },
              { key: 'genre', label: 'Genre' },
              { key: 'bookings', label: 'Bookings', align: 'right', render: (v) => formatCompactNumber(v) },
              { key: 'revenue', label: 'Revenue', align: 'right', render: (v) => formatCurrency(v) }
            ]}
            rows={movies}
          />
        </SectionCard>
        <SectionCard title="Genre Distribution">
          {genreDistribution.length > 0 ? (
            <StatusDonutChart data={genreDistribution} height={280} />
          ) : (
            <EmptyState message="No genre data available." />
          )}
        </SectionCard>
      </div>
    </div>
  );
}

// ─── Tab: Theatres ─────────────────────────────────────────────────────────────
function TheatresTab({ params }) {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics-theatres', params],
    queryFn: () => adminAnalyticsApi.getTopTheatres(params),
    staleTime: 60000
  });

  if (isLoading) return <LoadingSpinner text="Loading theatre analytics..." />;

  const theatres = data?.theatres ?? [];
  const growth = data?.growth ?? {};

  const growthCards = [
    { label: 'New Theatres Onboarded', value: growth.newTheatres ?? '—' },
    { label: 'Total Active Theatres', value: growth.activeTheatres ?? '—' },
    { label: 'Avg. Occupancy Rate', value: growth.avgOccupancy != null ? `${growth.avgOccupancy}%` : '—' },
    { label: 'Cities Covered', value: growth.citiesCovered ?? '—' }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {growthCards.map((g) => (
          <div key={g.label} className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{g.label}</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{g.value}</p>
          </div>
        ))}
      </div>

      <SectionCard title="Top Performing Theatres">
        <RankTable
          emptyMessage="No theatre performance data available."
          columns={[
            { key: 'rank', label: '#', render: (_, __, i) => <span className="font-bold text-slate-400">{i + 1}</span> },
            { key: 'name', label: 'Theatre', bold: true },
            { key: 'city', label: 'City', render: (v) => <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-400" />{v}</span> },
            { key: 'bookings', label: 'Bookings', align: 'right', render: (v) => formatCompactNumber(v) },
            { key: 'revenue', label: 'Revenue', align: 'right', render: (v) => formatCurrency(v) },
            {
              key: 'occupancy', label: 'Occupancy', align: 'right',
              render: (v) => (
                <div className="flex items-center justify-end gap-2">
                  <div className="w-16 bg-slate-100 rounded-full h-1.5">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full"
                      style={{ width: `${Math.min(v ?? 0, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs w-8">{v != null ? `${v}%` : '—'}</span>
                </div>
              )
            }
          ]}
          rows={theatres}
        />
      </SectionCard>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function PlatformAnalyticsPage() {
  const [activeTab, setActiveTab] = useState('OVERVIEW');
  const [activePreset, setActivePreset] = useState(1); // Last 30 Days
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [useCustom, setUseCustom] = useState(false);

  const dateParams = useCustom
    ? { from: customFrom, to: customTo }
    : getDateRange(DATE_PRESETS[activePreset]);

  const handlePreset = (idx) => {
    setActivePreset(idx);
    setUseCustom(false);
    setCustomFrom('');
    setCustomTo('');
  };

  const handleCustomApply = () => {
    if (customFrom && customTo) setUseCustom(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Platform Analytics</h1>
        <p className="text-sm text-slate-500 mt-1">
          Consolidated KPIs, trends, and performance insights across the BookMyShow platform.
        </p>
      </div>

      {/* Date Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide mr-1">Period:</span>
        {DATE_PRESETS.map((p, i) => (
          <button
            key={p.label}
            onClick={() => handlePreset(i)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              !useCustom && activePreset === i
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {p.label}
          </button>
        ))}
        <div className="flex items-center gap-2 ml-2 border-l border-slate-200 pl-3">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => { setCustomFrom(e.target.value); setUseCustom(false); }}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-xs text-slate-400">to</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => { setCustomTo(e.target.value); setUseCustom(false); }}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleCustomApply}
            disabled={!customFrom || !customTo}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Apply
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-0.5">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'OVERVIEW' && <OverviewTab params={dateParams} />}
        {activeTab === 'BOOKINGS' && <BookingsTab params={dateParams} />}
        {activeTab === 'REVENUE' && <RevenueTab params={dateParams} />}
        {activeTab === 'MOVIES' && <MoviesTab params={dateParams} />}
        {activeTab === 'THEATRES' && <TheatresTab params={dateParams} />}
      </div>
    </div>
  );
}
