import React from 'react';
import { cn } from '../../utils/cn';

const STATUS_CONFIGS = {
  // Operational Statuses
  ACTIVE: { label: 'Active', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  INACTIVE: { label: 'Inactive', bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20' },
  MAINTENANCE: { label: 'Maintenance', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  PENDING_APPROVAL: { label: 'Pending Approval', bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  APPROVED: { label: 'Approved', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  REJECTED: { label: 'Rejected', bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' },

  // Show Statuses
  DRAFT: { label: 'Draft', bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20' },
  PUBLISHED: { label: 'Published', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  RUNNING: { label: 'Running', bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
  COMPLETED: { label: 'Completed', bg: 'bg-slate-700/20', text: 'text-slate-300', border: 'border-slate-600/20' },
  CANCELLED: { label: 'Cancelled', bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' },

  // Booking Statuses
  CONFIRMED: { label: 'Confirmed', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  PENDING_PAYMENT: { label: 'Pending Payment', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  EXPIRED: { label: 'Expired', bg: 'bg-slate-600/10', text: 'text-slate-400', border: 'border-slate-600/20' }
};

export function StatusBadge({ status, className }) {
  const normalized = (status || '').toUpperCase();
  const config = STATUS_CONFIGS[normalized] || {
    label: status || 'Unknown',
    bg: 'bg-slate-500/10',
    text: 'text-slate-400',
    border: 'border-slate-500/20'
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
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 shrink-0 bg-current opacity-80" />
      {config.label}
    </span>
  );
}

export default StatusBadge;

