import { cn } from '@/lib/utils';

const STAGE_COLORS = {
  applied:     '#6366f1',
  shortlisted: '#8b5cf6',
  oa:          '#a78bfa',
  interview_1: '#f59e0b',
  offered:     '#10b981',
  accepted:    '#059669',
};

function BarFunnel({ stages }) {
  const maxCount = stages[0]?.count || 1;
  return (
    <div className="space-y-3">
      {stages.map((stage, i) => {
        const pct   = maxCount > 0
          ? Math.max(10, Math.round((stage.count / maxCount) * 100))
          : 0;
        const color = STAGE_COLORS[stage.key] || '#6366f1';
        return (
          <div key={stage.key} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground w-44 truncate">{stage.label}</span>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-foreground tabular-nums w-10 text-right">
                  {stage.count.toLocaleString()}
                </span>
                {i > 0 && (
                  <span className={cn(
                    'text-[11px] w-28 text-right',
                    stage.conversionFromPrev >= 70 ? 'text-emerald-600' :
                    stage.conversionFromPrev >= 40 ? 'text-amber-600'   :
                    'text-red-500'
                  )}>
                    {stage.conversionFromPrev}% from prev
                  </span>
                )}
              </div>
            </div>
            <div className="h-7 bg-muted rounded-lg overflow-hidden">
              <div
                className="h-full rounded-lg flex items-center px-3 transition-all duration-700"
                style={{ width: `${pct}%`, background: color }}
              >
                {stage.count > 0 && (
                  <span className="text-white text-[11px] font-medium whitespace-nowrap">
                    {stage.conversionFromTop}% of total
                  </span>
                )}
              </div>
            </div>
            {i > 0 && stage.dropoff > 0 && (
              <p className="text-[11px] text-muted-foreground pl-1">
                ↓ {stage.dropoff.toLocaleString()} dropped off
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ConversionSummary({ stages }) {
  const first   = stages[0]?.count || 0;
  const last    = stages[stages.length - 1]?.count || 0;
  const overall = first > 0 ? Math.round((last / first) * 100 * 10) / 10 : 0;

  let bigDrop = 0, bigDropStage = null;
  stages.slice(1).forEach((s) => {
    if (s.dropoff > bigDrop) { bigDrop = s.dropoff; bigDropStage = s.label; }
  });

  return (
    <div className="grid grid-cols-2 gap-3 mt-5">
      <div className="bg-muted/40 rounded-xl px-4 py-3">
        <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">
          Overall Conversion
        </p>
        <p className="text-2xl font-bold mt-1">
          {overall}
          <span className="text-sm font-normal text-muted-foreground">%</span>
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">Applied → Accepted</p>
      </div>
      {bigDropStage && (
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl px-4 py-3 border border-red-200 dark:border-red-800">
          <p className="text-[11px] text-red-600 dark:text-red-400 uppercase tracking-wide font-medium">
            Biggest Drop-off
          </p>
          <p className="text-sm font-bold text-red-700 dark:text-red-300 mt-1 truncate">
            {bigDropStage}
          </p>
          <p className="text-xs text-red-600/70 dark:text-red-400/70 mt-0.5">
            {bigDrop.toLocaleString()} lost
          </p>
        </div>
      )}
    </div>
  );
}

export default function FunnelChart({ stages = [], showSummary = true, className }) {
  if (!stages || stages.length === 0) {
    return (
      <div className={cn('flex items-center justify-center py-10', className)}>
        <p className="text-sm text-muted-foreground">No funnel data available</p>
      </div>
    );
  }
  return (
    <div className={className}>
      <BarFunnel stages={stages} />
      {showSummary && <ConversionSummary stages={stages} />}
    </div>
  );
}