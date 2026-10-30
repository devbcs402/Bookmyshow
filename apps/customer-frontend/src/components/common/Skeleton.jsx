import React from 'react';
import { cn } from '../../utils/cn';

export function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn(
        'animate-pulse bg-slate-800/80 rounded-md',
        className
      )}
      {...props}
    />
  );
}

export function MovieCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 w-full">
      <Skeleton className="w-full aspect-[2/3] rounded-xl" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

export function BannerSkeleton() {
  return (
    <div className="w-full h-80 sm:h-96 rounded-2xl relative overflow-hidden bg-slate-800/60 animate-pulse p-8 flex flex-col justify-end gap-3">
      <Skeleton className="h-8 w-2/5" />
      <Skeleton className="h-4 w-1/3" />
      <div className="flex gap-3 mt-2">
        <Skeleton className="h-10 w-32 rounded-lg" />
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>
    </div>
  );
}

export default Skeleton;

