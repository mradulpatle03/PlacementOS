import { Skeleton } from '@/components/ui/skeleton';

/**
 * Mimics a row of dashboard stat cards.
 * <StatCardsSkeleton count={4} />
 */
export default function StatCardsSkeleton({ count = 4, className }) {
  return (
    <div className={className ?? 'grid grid-cols-2 sm:grid-cols-4 gap-4'}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border p-4 space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-16" />
        </div>
      ))}
    </div>
  );
}