import { useEffect, useState } from 'react';

interface TimerProps {
  endsAt: number;
  duration: number;
  warningSeconds?: number;
  className?: string;
  showBar?: boolean;
}

export function Timer({ endsAt, duration, warningSeconds = 10, className = '', showBar = true }: TimerProps) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const update = () => setRemaining(Math.max(0, endsAt - Date.now()));
    update();
    const id = setInterval(update, 100);
    return () => clearInterval(id);
  }, [endsAt]);

  const seconds = Math.ceil(remaining / 1000);
  const pct = Math.max(0, Math.min(100, (remaining / duration) * 100));
  const isWarning = seconds <= warningSeconds;
  const isCritical = seconds <= 5;

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <div className="flex items-center justify-between">
        <span
          className={`font-semibold text-2xl tabular-nums transition-colors ${
            isCritical ? 'text-accent-red timer-warning' : isWarning ? 'text-accent-yellow' : 'text-ink-variant'
          }`}
        >
          {seconds}s
        </span>
      </div>
      {showBar && (
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-100 ${
              isCritical ? 'bg-accent-red' : isWarning ? 'bg-accent-yellow' : 'bg-primary'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}
