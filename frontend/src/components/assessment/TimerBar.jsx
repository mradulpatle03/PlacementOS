import { useAssessmentTimer } from '@/hooks/useAssessmentTimer';
import { cn } from '@/lib/utils';

export default function TimerBar({ totalSeconds, onExpire, paused }) {
  const { formattedTime, percentLeft, secondsLeft } = useAssessmentTimer(
    totalSeconds,
    onExpire,
    paused
  );

  const isWarning = secondsLeft <= 300 && secondsLeft > 60;  // last 5 min
  const isDanger  = secondsLeft <= 60;                        // last 1 min

  return (
    <div className="flex items-center gap-3 min-w-40">
      {/* progress bar */}
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-1000',
            isDanger  ? 'bg-red-500'    :
            isWarning ? 'bg-amber-400'  :
                        'bg-emerald-500'
          )}
          style={{ width: `${percentLeft}%` }}
        />
      </div>

      {/* clock display */}
      <span
        className={cn(
          'font-mono text-sm font-semibold tabular-nums w-17.5 text-right',
          isDanger  ? 'text-red-500 animate-pulse' :
          isWarning ? 'text-amber-500' :
                      'text-foreground'
        )}
      >
        {formattedTime}
      </span>
    </div>
  );
}