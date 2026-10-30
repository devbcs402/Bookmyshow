import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

export function LoadingSpinner({ size = 'md', className, text = 'Loading data...' }) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className={cn('flex flex-col items-center justify-center p-8 gap-3', className)}>
      <Loader2 className={cn('animate-spin text-brand', sizes[size])} />
      {text && <p className="text-xs text-slate-400 font-medium">{text}</p>}
    </div>
  );
}

export default LoadingSpinner;

