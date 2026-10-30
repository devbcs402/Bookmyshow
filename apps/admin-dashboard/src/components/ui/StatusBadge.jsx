import React from 'react';
import { cn } from '../../utils/cn';

const STATUS_CONFIGS = {
  // Theatre & Movie Approval Statuses
  APPROVED: { label: 'Approved', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  PENDING_APPROVAL: { label: 'Pending Approval', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  REJECTED: { label: 'Rejected', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  SUSPENDED: { label: 'Suspended', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  ACTIVE: { label: 'Active', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  INACTIVE: { label: 'Inactive', bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' },
  MAINTENANCE: { label: 'Maintenance', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },

  // Movie Lifecycle
  DRAFT: { label: 'Draft', bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' },
  RELEASED: { label: 'Released', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  ARCHIVED: { label: 'Archived', bg: 'bg-slate-100', text: 'text-slate-500', border: 'border-slate-200' },

  // Shows Lifecycle
  PUBLISHED: { label: 'Published', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  RUNNING: { label: 'Running', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  COMPLETED: { label: 'Completed', bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' },
  CANCELLED: { label: 'Cancelled', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },

  // Bookings & Payments
  CONFIRMED: { label: 'Confirmed', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  PENDING_PAYMENT: { label: 'Pending Payment', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  EXPIRED: { label: 'Expired', bg: 'bg-slate-100', text: 'text-slate-500', border: 'border-slate-200' },
  CAPTURED: { label: 'Captured', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  REFUNDED: { label: 'Refunded', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  REFUND_PENDING: { label: 'Refund Pending', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' }
};

export function StatusBadge({ status, className }) {
  const normalized = (status || '').toUpperCase();
  const config = STATUS_CONFIGS[normalized] || {
    label: status || 'Unknown',
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    border: 'border-slate-200'
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border tracking-wide uppercase',
        config.bg,
        config.text,
        config.border,
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 shrink-0 bg-current opacity-70" />
      {config.label}
    </span>
  );
}

export default StatusBadge;

