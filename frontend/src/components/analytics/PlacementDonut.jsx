import { cn } from "@/lib/utils";

export default function PlacementDonut({
  placed = 0,
  dreamPlaced = 0,
  total = 0,
  size = 120,
  className,
}) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const cx = size / 2,
    cy = size / 2;

  const placedPct = total > 0 ? placed / total : 0;
  const dreamPct = total > 0 ? dreamPlaced / total : 0;
  const regularPct = Math.max(0, placedPct - dreamPct);
  const dreamDash = circumference * dreamPct;
  const regularDash = circumference * regularPct;

  const overallPct =
    total > 0 ? Math.round((placed / total) * 100 * 10) / 10 : 0;

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={12}
            className="text-muted"
          />
          {regularDash > 0 && (
            <circle
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke="#34d399"
              strokeWidth={12}
              strokeDasharray={`${regularDash} ${circumference - regularDash}`}
              strokeDashoffset={-dreamDash}
              strokeLinecap="round"
            />
          )}
          {dreamDash > 0 && (
            <circle
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke="#059669"
              strokeWidth={12}
              strokeDasharray={`${dreamDash} ${circumference - dreamDash}`}
              strokeDashoffset={0}
              strokeLinecap="round"
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold">{overallPct}%</span>
          <span className="text-[10px] text-muted-foreground">placed</span>
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shrink-0" />
          Dream ({dreamPlaced})
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
          Placed ({placed - dreamPlaced})
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30 shrink-0" />
          Unplaced ({total - placed})
        </span>
      </div>
    </div>
  );
}
