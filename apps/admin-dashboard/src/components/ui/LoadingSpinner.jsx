import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

export function LoadingSpinner({ size = 'md', className, text = 'Loading platform data...' }) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-7 h-7',
    lg: 'w-10 h-10'
  };

  return (
    <div className={cn('flex flex-col items-center justify-center p-8 gap-2.5', className)}>
      <Loader2 className={cn('animate-spin text-admin-primary', sizes[size])} />
      {text && <p className="text-xs text-slate-500 font-medium">{text}</p>}
    </div>
  );
}

export default LoadingSpinner;

