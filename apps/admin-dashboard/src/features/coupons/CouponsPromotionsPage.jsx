import React from 'react';
import { Tag, AlertCircle, Sparkles, CheckCircle2, Layers, Calendar, Percent } from 'lucide-react';
import Button from '../../components/ui/Button';

export default function CouponsPromotionsPage() {
  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Coupons & Promotional Campaigns
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Discount codes, referral vouchers, and partner festival promotions.
        </p>
      </div>

      {/* Backend Integration Audit Notice */}
      <div className="rounded-xl border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 p-5 shadow-sm">
        <div className="flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-amber-950">
              Module Extension Point: Backend Promotion Endpoints Pending Mount
            </h3>
            <p className="text-xs text-amber-900 leading-relaxed">
              As formally documented in <code className="bg-amber-100 text-amber-950 px-1 py-0.5 rounded text-[11px]">docs/frontend-admin/01-admin-integration-audit.md</code>,
              the standalone administrative coupon mutation routes (<code className="bg-amber-100 text-amber-950 px-1 py-0.5 rounded text-[11px]">/api/v1/admin/coupons</code>)
              are not currently exposed by the backend routing table.
            </p>
            <p className="text-[11px] text-amber-800">
              In accordance with our strict platform engineering guidelines, this frontend will not fabricate dummy voucher mutations.
              The production UI layout below reflects the complete schema contract ready for backend mount.
            </p>
          </div>
        </div>
      </div>

      {/* Planned Feature Blueprint Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
          <div className="flex items-center space-x-2 text-primary-600 font-bold text-xs uppercase tracking-wider">
            <Percent className="h-4 w-4" />
            <span>Percentage Discounts</span>
          </div>
          <h3 className="text-sm font-bold text-slate-900">Configurable Cap & Minimums</h3>
          <p className="text-xs text-slate-500">
            Set percentage off (e.g. 20% off) with strict minimum order value and maximum discount caps.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
          <div className="flex items-center space-x-2 text-emerald-600 font-bold text-xs uppercase tracking-wider">
            <Calendar className="h-4 w-4" />
            <span>Validity Scheduling</span>
          </div>
          <h3 className="text-sm font-bold text-slate-900">Campaign Lifecycles</h3>
          <p className="text-xs text-slate-500">
            Automated start and expiry dates with max global redemption counters to prevent budget overruns.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
          <div className="flex items-center space-x-2 text-indigo-600 font-bold text-xs uppercase tracking-wider">
            <Layers className="h-4 w-4" />
            <span>Exhibitor Scoping</span>
          </div>
          <h3 className="text-sm font-bold text-slate-900">Targeted Eligibility</h3>
          <p className="text-xs text-slate-500">
            Scope vouchers to specific movies, partner theatre chains, or first-time customer cohorts.
          </p>
        </div>
      </div>

      {/* Schema Contract Preview Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Campaign Schema Contract</h3>
            <p className="text-xs text-slate-500">Standardized coupon model awaiting backend controller registration</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
            Read-Only Specification
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Coupon Code</th>
                <th className="px-6 py-3">Discount Type</th>
                <th className="px-6 py-3">Discount Value</th>
                <th className="px-6 py-3">Min Order</th>
                <th className="px-6 py-3">Max Discount</th>
                <th className="px-6 py-3">Target Scope</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              <tr className="hover:bg-slate-50">
                <td className="px-6 py-3.5 font-bold text-slate-900">BMSWELCOME50</td>
                <td className="px-6 py-3.5 text-slate-700">FLAT</td>
                <td className="px-6 py-3.5 text-slate-700">₹50.00</td>
                <td className="px-6 py-3.5 text-slate-700">₹250.00</td>
                <td className="px-6 py-3.5 text-slate-700">₹50.00</td>
                <td className="px-6 py-3.5 text-slate-700">First-time users</td>
                <td className="px-6 py-3.5"><span className="text-slate-400">PLANNED</span></td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="px-6 py-3.5 font-bold text-slate-900">BLOCKBUSTER20</td>
                <td className="px-6 py-3.5 text-slate-700">PERCENTAGE</td>
                <td className="px-6 py-3.5 text-slate-700">20%</td>
                <td className="px-6 py-3.5 text-slate-700">₹500.00</td>
                <td className="px-6 py-3.5 text-slate-700">₹150.00</td>
                <td className="px-6 py-3.5 text-slate-700">All movies</td>
                <td className="px-6 py-3.5"><span className="text-slate-400">PLANNED</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
