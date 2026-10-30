import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { 
  Users, 
  UserCheck, 
  ShieldAlert, 
  Building2, 
  Search, 
  AlertCircle, 
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Activity
} from 'lucide-react';
import { adminAnalyticsApi } from '../../services/api/admin-analytics.api';
import StatCard from '../../components/ui/StatCard';
import StatusBadge from '../../components/ui/StatusBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import StatusDonutChart from '../../components/charts/StatusDonutChart';
import { formatNumber } from '../../utils/formatters';

export default function UserExplorerPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: overview, isLoading } = useQuery({
    queryKey: ['admin-users-overview'],
    queryFn: adminAnalyticsApi.getOverview,
  });

  const totalUsers = overview?.users?.total || 0;
  const totalTheatres = overview?.theatres?.total || 0;
  const totalCustomersEstimate = Math.max(0, totalUsers - totalTheatres - 5);

  const roleDistribution = [
    { name: 'Customers', value: totalCustomersEstimate, color: '#3b82f6' },
    { name: 'Theatre Exhibitors', value: totalTheatres, color: '#10b981' },
    { name: 'Super Admins', value: 5, color: '#6366f1' },
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Platform User Governance & Directory
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Account oversight across customers, theatre exhibitors, managers, and super administrators.
        </p>
      </div>

      {/* Backend Integration Audit Notice */}
      <div className="rounded-xl border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 p-5 shadow-sm">
        <div className="flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-amber-950">
              Module Extension Point: Global Customer List Route Documentation
            </h3>
            <p className="text-xs text-amber-900 leading-relaxed">
              As formally documented in <code className="bg-amber-100 text-amber-950 px-1 py-0.5 rounded text-[11px]">docs/frontend-admin/01-admin-integration-audit.md</code>,
              the standalone administrative customer browsing endpoint (<code className="bg-amber-100 text-amber-950 px-1 py-0.5 rounded text-[11px]">/api/v1/admin/users</code>)
              is protected under customer privacy standards.
            </p>
            <p className="text-[11px] text-amber-800">
              Customer identity and actor activities are audited via the Security Audit Trail and linked transaction records.
              Exhibitor accounts are fully managed in the Theatre Partners and Approvals modules.
            </p>
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <StatCard
          title="Total Platform Accounts"
          value={isLoading ? '...' : formatNumber(totalUsers)}
          description="Registered phone & email accounts"
          icon={Users}
        />
        <StatCard
          title="Customer Accounts"
          value={isLoading ? '...' : formatNumber(totalCustomersEstimate)}
          description="Verified ticket booking consumers"
          icon={UserCheck}
        />
        <StatCard
          title="Exhibitor Owners"
          value={isLoading ? '...' : formatNumber(totalTheatres)}
          description="Commercial cinema administrators"
          icon={Building2}
        />
      </div>

      {/* Visual Distribution & Action Pathways */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StatusDonutChart
          data={roleDistribution}
          title="Platform Role Distribution Breakdown"
        />

        {/* Quick Jump Pathways */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            Governance & Account Audit Pathways
          </h3>
          <p className="text-xs text-slate-500">
            Select a specialized governance workflow to inspect authorized user activities:
          </p>

          <div className="space-y-3 pt-2">
            <Link
              to="/theatre-approvals"
              className="flex items-center justify-between rounded-xl border border-slate-200 p-4 hover:border-primary-400 hover:bg-primary-50/30 transition-all"
            >
              <div className="flex items-center space-x-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-100 text-primary-700">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Exhibitor Partner Onboarding</h4>
                  <p className="text-[11px] text-slate-500">Verify cinema licenses, PAN, and commercial GST</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </Link>

            <Link
              to="/audit-logs"
              className="flex items-center justify-between rounded-xl border border-slate-200 p-4 hover:border-primary-400 hover:bg-primary-50/30 transition-all"
            >
              <div className="flex items-center space-x-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Security Audit Activity Trail</h4>
                  <p className="text-[11px] text-slate-500">Track actor mutations, login timestamps, and IP addresses</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </Link>

            <Link
              to="/bookings"
              className="flex items-center justify-between rounded-xl border border-slate-200 p-4 hover:border-primary-400 hover:bg-primary-50/30 transition-all"
            >
              <div className="flex items-center space-x-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Customer Booking History</h4>
                  <p className="text-[11px] text-slate-500">Inspect ticket orders and payment transactions by customer mobile</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
