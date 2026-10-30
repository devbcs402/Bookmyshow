import React from 'react';
import { cn } from '../../utils/cn';
import { TrendingUp, TrendingDown } from 'lucide-react';

export function StatCard({
  title,
  value,
  subtitle,
  change,
  isPositive,
  icon: Icon,
  className,
  colorScheme = 'blue'
}) {
  const iconBgs = {
    blue: 'bg-partner-500/10 text-partner-500',
    red: 'bg-brand/10 text-brand',
    emerald: 'bg-emerald-500/10 text-emerald-400',
    amber: 'bg-amber-500/10 text-amber-400',
    purple: 'bg-purple-500/10 text-purple-400'
  };

  return (
    <div
      className={cn(
        'bg-cinema-card border border-cinema-border rounded-xl p-5 shadow-sm hover:border-slate-600/50 transition-all duration-200',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</p>
        {Icon && (
          <div className={cn('p-2.5 rounded-lg shrink-0', iconBgs[colorScheme] || iconBgs.blue)}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline justify-between">
        <h4 className="text-2xl font-bold text-white tracking-tight">{value}</h4>
        {change !== undefined && (
          <span
            className={cn(
              'inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full',
              isPositive
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'bg-rose-500/10 text-rose-400'
            )}
          >
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {change}
          </span>
        )}
      </div>

      {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
    </div>
  );
}

export default StatCard;

