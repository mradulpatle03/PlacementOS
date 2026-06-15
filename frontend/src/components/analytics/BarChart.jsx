import { cn } from '@/lib/utils';

/**
 * <BarChart
 *   data={[{ label, value, sublabel?, color? }]}
 *   maxValue?    — auto-computed if omitted
 *   unit?        — appended after value
 *   showValues?  — default true
 * />
 */
export default function BarChart({
  data = [],
  maxValue,
  unit = '',
  showValues = true,
  className,
}) {
  if (!data.length) {
    return (
      <div className={cn('flex items-center justify-center py-8', className)}>
        <p className="text-sm text-muted-foreground">No data available</p>
      </div>
    );
  }

  const max = maxValue ?? Math.max(...data.map((d) => d.value), 1);

  return (
    <div className={cn('space-y-3', className)}>
      {data.map((item, i) => {
        const pct   = max > 0 ? Math.max(4, Math.round((item.value / max) * 100)) : 0;
        const color = item.color || '#6366f1';
        return (
          <div key={i} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground truncate max-w-[55%]">
                {item.label}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                {item.sublabel && (
                  <span className="text-muted-foreground">{item.sublabel}</span>
                )}
                {showValues && (
                  <span className="font-semibold tabular-nums">
                    {typeof item.value === 'number'
                      ? item.value.toLocaleString()
                      : item.value}
                    {unit && (
                      <span className="text-muted-foreground ml-0.5">{unit}</span>
                    )}
                  </span>
                )}
              </div>
            </div>
            <div className="h-6 bg-muted rounded-md overflow-hidden">
              <div
                className="h-full rounded-md transition-all duration-700"
                style={{ width: `${pct}%`, background: color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}