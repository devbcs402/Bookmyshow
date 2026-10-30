import React from 'react';
import { Film } from 'lucide-react';
import Button from './Button';

export function EmptyState({
  icon: Icon = Film,
  title = 'No movies found',
  description = 'Try adjusting your search criteria or selecting a different city.',
  actionText,
  onAction,
  className
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl bg-cinema-card/50 border border-cinema-border/60 ${className || ''}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-400 mb-4 border border-slate-700/60">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-base sm:text-lg font-semibold text-slate-100 mb-1">
        {title}
      </h3>
      <p className="text-xs sm:text-sm text-slate-400 max-w-sm mb-6">
        {description}
      </p>
      {actionText && onAction && (
        <Button variant="secondary" size="sm" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  );
}

export default EmptyState;

