import React from 'react';
import { cn } from '../../utils/cn';

export const Select = React.forwardRef(
  ({ className, label, error, helperText, options = [], children, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={cn(
            'w-full bg-cinema-dark border border-cinema-border rounded-lg px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all',
            error && 'border-rose-500 focus:ring-rose-500',
            className
          )}
          {...props}
        >
          {children ? (
            children
          ) : (
            options.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-cinema-card text-slate-100">
                {opt.label}
              </option>
            ))
          )}
        </select>
        {error && <p className="text-xs text-rose-400 font-medium">{error}</p>}
        {helperText && !error && <p className="text-xs text-slate-400">{helperText}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
export default Select;

