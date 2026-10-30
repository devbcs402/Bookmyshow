import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Percent, 
  DollarSign, 
  TrendingUp, 
  Info, 
  Building2, 
  ShieldCheck, 
  Calendar,
  Layers
} from 'lucide-react';
import { adminAnalyticsApi } from '../../services/api/admin-analytics.api';
import StatCard from '../../components/ui/StatCard';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { formatCurrency, formatNumber } from '../../utils/formatters';

export default function CommissionSettingsPage() {
  const [daysWindow, setDaysWindow] = useState(30);

  const { data: revenueData, isLoading } = useQuery({
    queryKey: ['admin-commission-revenue', daysWindow],
    queryFn: () => adminAnalyticsApi.getRevenue({ days: daysWindow }),
  });

  const totalGMV = revenueData?.totalRevenue || revenueData?.totalGross || 0;
  const standardCommissionRate = 0.10; // 10% standard platform take rate
  const platformEarnings = totalGMV * standardCommissionRate;
  const netTheatrePayable = totalGMV - platformEarnings;

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Platform Commission & Take Rates
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Platform revenue share governance and exhibitor contractual terms.
          </p>
        </div>

        {/* Time Window Selector */}
        <div className="flex items-center space-x-2 rounded-xl bg-white border border-slate-200 p-1 text-xs">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDaysWindow(d)}
              className={`rounded-lg px-3 py-1.5 font-semibold transition-all ${
                daysWindow === d
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Last {d} Days
            </button>
          ))}
        </div>
      </div>

      {/* Primary KPI Row */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <StatCard
          title={`Total Platform GMV (${daysWindow}d)`}
          value={isLoading ? 'Calculating...' : formatCurrency(totalGMV)}
          description="Aggregate gross ticket volume"
          icon={DollarSign}
        />
        <StatCard
          title="Platform Commission (10%)"
          value={isLoading ? 'Calculating...' : formatCurrency(platformEarnings)}
          description="Retained platform service fee"
          icon={Percent}
        />
        <StatCard
          title="Exhibitor Share (90%)"
          value={isLoading ? 'Calculating...' : formatCurrency(netTheatrePayable)}
          description="Net payable to theatre partners"
          icon={Building2}
        />
      </div>

      {/* Commission Model Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 text-primary-700">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Standard Platform Take Rate</h3>
              <p className="text-xs text-slate-500">Contractual revenue-share schedule applied across all partner cinemas</p>
            </div>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
            Active Model
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-xs">
          <div className="rounded-lg bg-slate-50 p-4 border border-slate-100">
            <span className="text-slate-500 block mb-1">Standard Rate</span>
            <span className="text-2xl font-extrabold text-slate-900">10.0%</span>
            <p className="text-slate-500 mt-1">Calculated on gross ticket base amount</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4 border border-slate-100">
            <span className="text-slate-500 block mb-1">Settlement Cycle</span>
            <span className="text-base font-bold text-slate-900">T+7 Days</span>
            <p className="text-slate-500 mt-1">Direct NEFT/RTGS to verified exhibitor account</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4 border border-slate-100">
            <span className="text-slate-500 block mb-1">Tax Treatment</span>
            <span className="text-base font-bold text-slate-900">GST 18%</span>
            <p className="text-slate-500 mt-1">Applicable on platform service charge only</p>
          </div>
        </div>
      </div>

      {/* Accounting Breakdown Notice */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-slate-900">Commission Formulation Standard</h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          The BookMyShow platform computes commissions strictly from verified captured payment records in MongoDB.
          Formula: <code className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-mono text-[11px]">Platform_Revenue = Captured_Gross_GMV × 0.10</code>.
          Any customer refunds automatically reverse proportional platform fees before final theatre payout.
        </p>

        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 flex items-start space-x-3">
          <Info className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Rate Modification Governance:</span>
            <p className="mt-0.5">
              To preserve accounting consistency and historical audit trails, commission rate modifications must be applied
              via backend policy deployment. Historical settled transactions remain immutable.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
