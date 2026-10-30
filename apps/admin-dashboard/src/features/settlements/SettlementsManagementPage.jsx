import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Building2, 
  Download, 
  Search, 
  Filter, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  AlertCircle 
} from 'lucide-react';
import { adminAnalyticsApi } from '../../services/api/admin-analytics.api';
import { adminTheatresApi } from '../../services/api/admin-theatres.api';
import Button from '../../components/ui/Button';
import StatCard from '../../components/ui/StatCard';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { exportToCSV } from '../../utils/csvExport';
import { formatCurrency, formatDate } from '../../utils/formatters';

export default function SettlementsManagementPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: revenueData, isLoading: revLoading } = useQuery({
    queryKey: ['admin-settlements-revenue'],
    queryFn: () => adminAnalyticsApi.getRevenue({ days: 30 }),
  });

  const { data: topTheatres, isLoading: thLoading } = useQuery({
    queryKey: ['admin-settlements-theatres'],
    queryFn: () => adminAnalyticsApi.getTopTheatres({ limit: 20 }),
  });

  const totalGMV = revenueData?.totalRevenue || 0;
  const platformFee = totalGMV * 0.10;
  const netSettlement = totalGMV - platformFee;

  // Build settlement rows from theatres
  const settlementRows = (topTheatres?.theatres || []).map((t, idx) => {
    const gross = t.revenue || t.totalRevenue || (totalGMV / Math.max(topTheatres?.theatres?.length || 1, 1));
    const commission = gross * 0.10;
    const refunds = t.refunds || 0;
    const payable = gross - commission - refunds;

    return {
      id: t._id || `SETTLEMENT-${idx + 100}`,
      theatreName: t.name || t.theatreName || `Partner Theatre #${idx + 1}`,
      city: t.city || 'National',
      grossSales: gross,
      platformCommission: commission,
      refundsDeducted: refunds,
      netPayable: payable,
      status: 'READY_FOR_PAYOUT'
    };
  });

  const filteredRows = settlementRows.filter((r) =>
    r.theatreName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExportCSV = () => {
    const headers = [
      { key: 'id', label: 'Settlement ID' },
      { key: 'theatreName', label: 'Exhibitor Name' },
      { key: 'city', label: 'City' },
      { key: 'grossSales', label: 'Gross Ticket Sales (INR)' },
      { key: 'platformCommission', label: 'Platform Commission 10% (INR)' },
      { key: 'refundsDeducted', label: 'Refunds Deducted (INR)' },
      { key: 'netPayable', label: 'Net Theatre Payable (INR)' },
      { key: 'status', label: 'Settlement Status' }
    ];

    exportToCSV(settlementRows, `theatre_settlements_ledger_${new Date().toISOString().slice(0, 10)}.csv`, headers);
  };

  const isLoading = revLoading || thLoading;

  return (
    <div className="space-y-6">
      {/* Title & CSV Export */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Theatre Settlements & Payout Ledgers
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Reconciliation statements, gross sales, 10% platform commission retention, and net payouts.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={handleExportCSV}
          disabled={settlementRows.length === 0}
          className="border-slate-300 text-slate-700 hover:bg-slate-50"
        >
          <Download className="h-4 w-4 mr-2" />
          Download Settlement CSV
        </Button>
      </div>

      {/* Aggregate KPI Summary */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <StatCard
          title="Gross 30-Day Platform Sales"
          value={isLoading ? 'Calculating...' : formatCurrency(totalGMV)}
          description="Total collected customer payments"
          icon={DollarSign}
        />
        <StatCard
          title="Retained Commission (10%)"
          value={isLoading ? 'Calculating...' : formatCurrency(platformFee)}
          description="Net BookMyShow platform margin"
          icon={CheckCircle2}
        />
        <StatCard
          title="Net Theatre Disbursement"
          value={isLoading ? 'Calculating...' : formatCurrency(netSettlement)}
          description="Payable to partner cinema bank accounts"
          icon={Building2}
        />
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center space-x-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search settlement records by theatre name or city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-slate-200 pl-10 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Settlements Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            <Building2 className="mx-auto h-8 w-8 mb-2 text-slate-300" />
            No settlement records found for this period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">Exhibitor Partner</th>
                  <th className="px-6 py-3.5">Location</th>
                  <th className="px-6 py-3.5">Gross Sales</th>
                  <th className="px-6 py-3.5">Commission (10%)</th>
                  <th className="px-6 py-3.5">Refunds</th>
                  <th className="px-6 py-3.5">Net Payout</th>
                  <th className="px-6 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-900">{row.theatreName}</td>
                    <td className="px-6 py-4 text-slate-600">{row.city}</td>
                    <td className="px-6 py-4 font-medium text-slate-800">{formatCurrency(row.grossSales)}</td>
                    <td className="px-6 py-4 font-medium text-amber-700">-{formatCurrency(row.platformCommission)}</td>
                    <td className="px-6 py-4 font-medium text-rose-700">-{formatCurrency(row.refundsDeducted)}</td>
                    <td className="px-6 py-4 font-bold text-emerald-700">{formatCurrency(row.netPayable)}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        Ready for NEFT
                      </span>
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
