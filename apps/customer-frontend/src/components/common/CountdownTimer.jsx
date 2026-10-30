import React from 'react';
import { Clock, RefreshCw } from 'lucide-react';
import { useSeatLockStore } from '../../store/seatLock.store';
import { formatCountdown } from '../../utils/formatters';
import { cn } from '../../utils/cn';

export function CountdownTimer({ className, showRenew = true }) {
  const { remainingSeconds, isExpired, renewLock, isRenewing } = useSeatLockStore();

  if (remainingSeconds <= 0 && !isExpired) return null;

  const isUrgent = remainingSeconds <= 60;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all duration-300',
        isUrgent
          ? 'bg-red-500/15 border-red-500/40 text-red-400 animate-pulse'
          : 'bg-amber-500/10 border-amber-500/30 text-amber-400',
        className
      )}
    >
      <Clock className="w-3.5 h-3.5 flex-shrink-0" />
      <span>
        {isExpired
          ? 'Lock Expired'
          : `Time left: ${formatCountdown(remainingSeconds)}`}
      </span>
      {showRenew && !isExpired && (
        <button
          onClick={() => renewLock()}
          disabled={isRenewing}
          title="Extend lock time by 5 minutes"
          className="ml-1 p-0.5 rounded hover:bg-amber-500/20 text-amber-300 hover:text-white transition-colors focus:outline-none"
        >
          <RefreshCw
            className={cn('w-3 h-3', isRenewing && 'animate-spin')}
          />
        </button>
      )}
    </div>
  );
}

export default CountdownTimer;

