import { Skeleton } from "@/components/ui/skeleton";

/**
 * Mimics a data table — header row + N body rows.
 * <TableSkeleton columns={5} rows={6} />
 */
export default function TableSkeleton({ columns = 4, rows = 6, className }) {
  return (
    <div className={className ?? "rounded-xl border overflow-hidden"}>
      <div
        className="grid gap-4 px-4 py-3 border-b bg-muted/40"
        style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
      >
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-2/3" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="grid gap-4 px-4 py-3 border-b last:border-b-0"
          style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
        >
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton key={c} className="h-4 w-full" />
          ))}
        </div>
      ))}
    </div>
  );
}
