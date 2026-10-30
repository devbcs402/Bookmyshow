import React from 'react';
import { 
  Settings, 
  ShieldCheck, 
  CreditCard, 
  Clock, 
  Lock, 
  Info, 
  AlertCircle,
  Bell,
  Globe
} from 'lucide-react';
import Button from '../../components/ui/Button';

export default function PlatformSettingsPage() {
  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Platform Governance & Security Settings
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Core system configurations, booking refund windows, authentication thresholds, and gateway integrations.
        </p>
      </div>

      {/* Security Governance Notice */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center space-x-3 text-xs text-slate-600">
          <Lock className="h-4 w-4 text-primary-600 flex-shrink-0" />
          <span>
            <strong className="text-slate-900">Environment-Managed Secrets:</strong> Sensitive credentials (Razorpay Key Secrets, JWT Private Keys, SendGrid API tokens) are strictly stored in server environments and cannot be leaked or edited via web consoles.
          </span>
        </div>
      </div>

      {/* Cancellation & Refund Policies */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2 font-bold text-slate-900 text-sm">
            <Clock className="h-4 w-4 text-primary-600" />
            <span>Customer Booking Cancellation Policy Windows</span>
          </div>
          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
            ACTIVE ENFORCEMENT
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
            <span className="font-bold text-slate-900 block mb-1">Window A: &gt; 24h Before Show</span>
            <p className="text-slate-600">100% Ticket Fare Refund</p>
            <span className="text-[10px] text-slate-400 mt-2 block">Convenience fees non-refundable</span>
          </div>

          <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
            <span className="font-bold text-slate-900 block mb-1">Window B: 2h – 24h Before Show</span>
            <p className="text-slate-600">50% Ticket Fare Refund</p>
            <span className="text-[10px] text-slate-400 mt-2 block">Convenience fees non-refundable</span>
          </div>

          <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
            <span className="font-bold text-slate-900 block mb-1">Window C: &lt; 2h Before Show</span>
            <p className="text-slate-600">Non-Refundable (0%)</p>
            <span className="text-[10px] text-slate-400 mt-2 block">Tickets locked for screening</span>
          </div>
        </div>
      </div>

      {/* Payment Gateway Configuration */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2 font-bold text-slate-900 text-sm">
            <CreditCard className="h-4 w-4 text-emerald-600" />
            <span>Primary Payment Gateway (Razorpay)</span>
          </div>
          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
            WEBHOOK VERIFIED
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="rounded-lg bg-slate-50 p-3">
            <span className="text-slate-400 block mb-1">Provider</span>
            <span className="font-bold text-slate-900">Razorpay India</span>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <span className="text-slate-400 block mb-1">HMAC Verification</span>
            <span className="font-bold text-emerald-700">SHA-256 Enabled</span>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <span className="text-slate-400 block mb-1">Payment Capture</span>
            <span className="font-bold text-slate-900">Automatic (Captured)</span>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <span className="text-slate-400 block mb-1">Currency</span>
            <span className="font-bold text-slate-900">INR (₹)</span>
          </div>
        </div>
      </div>

      {/* Security & Token Governance */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2 font-bold text-slate-900 text-sm">
            <ShieldCheck className="h-4 w-4 text-indigo-600" />
            <span>Security & Authentication Governance</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="rounded-lg bg-slate-50 p-3">
            <span className="text-slate-400 block mb-1">Access Token Expiry</span>
            <span className="font-bold text-slate-900">15 minutes</span>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <span className="text-slate-400 block mb-1">Refresh Token Expiry</span>
            <span className="font-bold text-slate-900">7 days (HttpOnly Cookie)</span>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <span className="text-slate-400 block mb-1">Seat Lock Expiration</span>
            <span className="font-bold text-slate-900">10 minutes (Redis TTL)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
