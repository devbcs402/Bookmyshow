import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DollarSign, Download, TrendingUp, Calendar, AlertCircle } from 'lucide-react';
import { analyticsApi } from '../../services/api/analytics.api';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { exportToCsv } from '../../utils/csvExport';
import Button from '../../components/ui/Button';
import StatCard from '../../components/ui/StatCard';
import RevenueChart from '../../components/charts/RevenueChart';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export function RevenueReportsPage() {
  const [days, setDays] = useState(30);

  // Fetch Revenue Settlement Analytics
  const { data: revenueData, isLoading } = useQuery({
    queryKey: ['partnerRevenueAnalytics', days],
    queryFn: () => analyticsApi.getRevenueAnalytics({ days }),
    staleTime: 60000
  });

  const { data: bookingStats } = useQuery({
    queryKey: ['partnerBookingsAnalytics', days],
    queryFn: () => analyticsApi.getBookingsAnalytics({ days }),
    staleTime: 60000
  });

  const dailyTrend = bookingStats?.dailyTrend || [];

  const handleExportCsv = () => {
    if (!dailyTrend || dailyTrend.length === 0) {
      alert('No settlement records available to export.');
      return;
    }

    const exportRows = dailyTrend.map((row) => ({
      Date: row.date,
      ConfirmedBookings: row.confirmed,
      TicketsSold: row.ticketsSold,
      GrossSales: row.sales,
      PlatformCommission: (row.sales * 0.1).toFixed(2),
      NetPayable: (row.sales * 0.9).toFixed(2)
    }));

    exportToCsv(exportRows, `Settlement_Report_${days}D_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const grossSales = revenueData?.grossSales ?? 0;
  const platformFees = revenueData?.platformFees ?? revenueData?.platformFeesDeducted ?? grossSales * 0.1;
  const refunds = revenueData?.refunds ?? revenueData?.refundsDeducted ?? 0;
  const netSettlement = revenueData?.netSettlement ?? revenueData?.netPayableToPartner ?? (grossSales - platformFees - refunds);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-cinema-border">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Revenue & Financial Settlements</h1>
          <p className="text-xs text-slate-400 mt-1">
            Reconciliation statements, commission deductions, customer refund audits, and disbursements
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-cinema-card border border-cinema-border rounded-lg p-1 text-xs">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  days === d ? 'bg-partner-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {d}D
              </button>
            ))}
          </div>

          <Button
            size="md"
            variant="outline"
            icon={Download}
            onClick={handleExportCsv}
          >
            Export Settlement CSV
          </Button>
        </div>
      </div>

      {/* Financial Settlement KPI Cards */}
      {isLoading ? (
        <LoadingSpinner text="Computing settlement calculations..." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Gross Ticket Sales"
            value={formatCurrency(grossSales)}
            subtitle="Box office admissions revenue"
            icon={DollarSign}
            colorScheme="blue"
          />

          <StatCard
            title="Platform Fees"
            value={formatCurrency(platformFees)}
            subtitle="Standard service charge (10%)"
            icon={TrendingUp}
            colorScheme="amber"
          />

          <StatCard
            title="Refund Deductions"
            value={formatCurrency(refunds)}
            subtitle="Customer cancellations"
            icon={AlertCircle}
            colorScheme="red"
          />

          <StatCard
            title="Net Partner Payable"
            value={formatCurrency(netSettlement)}
            subtitle="Direct bank disbursement"
            icon={DollarSign}
            colorScheme="emerald"
          />
        </div>
      )}

      {/* Revenue Timeline Visualizer */}
      <div className="bg-cinema-card border border-cinema-border rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-cinema-border">
          <div>
            <h3 className="text-base font-bold text-white">Daily Revenue Velocity</h3>
            <p className="text-xs text-slate-400">Total gross receipts across the past {days} days</p>
          </div>
        </div>

        <RevenueChart data={dailyTrend} height={280} />
      </div>

      {/* Daily Breakdown Table */}
      <div className="bg-cinema-card border border-cinema-border rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-cinema-border">
          <h3 className="text-base font-bold text-white">Settlement Ledger</h3>
          <p className="text-xs text-slate-400">Daily reconciliation records</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-200">
            <thead className="bg-cinema-dark text-[11px] uppercase tracking-wider text-slate-400 border-b border-cinema-border font-semibold">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Confirmed Bookings</th>
                <th className="px-4 py-3">Tickets Sold</th>
                <th className="px-4 py-3">Gross Sales</th>
                <th className="px-4 py-3">Est. Commission (10%)</th>
                <th className="px-4 py-3 text-right">Net Payable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cinema-border">
              {dailyTrend.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No ledger entries for this period.
                  </td>
                </tr>
              ) : (
                dailyTrend.map((row, idx) => (
                  <tr key={idx} className="hover:bg-cinema-elevated/30">
                    <td className="px-4 py-3 font-semibold text-white">{row.date}</td>
                    <td className="px-4 py-3">{row.confirmed}</td>
                    <td className="px-4 py-3">{row.ticketsSold}</td>
                    <td className="px-4 py-3 text-white font-medium">{formatCurrency(row.sales)}</td>
                    <td className="px-4 py-3 text-slate-400">{formatCurrency(row.sales * 0.1)}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-400">
                      {formatCurrency(row.sales * 0.9)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default RevenueReportsPage;

