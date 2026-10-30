import React from 'react';
import { cn } from '../../utils/cn';

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  className
}) {
  const variants = {
    default: 'bg-slate-800 text-slate-300 border-slate-700',
    brand: 'bg-brand/10 text-brand border-brand/30',
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    danger: 'bg-red-500/10 text-red-400 border-red-500/30',
    outline: 'bg-transparent text-slate-300 border-slate-600',
    platinum: 'bg-sky-500/15 text-sky-300 border-sky-500/40 font-semibold',
    gold: 'bg-amber-500/15 text-amber-300 border-amber-500/40 font-semibold',
    silver: 'bg-slate-500/15 text-slate-300 border-slate-500/40'
  };

  const sizes = {
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5'
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full border',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </span>
  );
}

export default Badge;

