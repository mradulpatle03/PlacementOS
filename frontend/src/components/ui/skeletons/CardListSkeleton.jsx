import { Skeleton } from '@/components/ui/skeleton';

/**
 * Mimics a vertical list of card rows — drive cards, application rows, etc.
 * <CardListSkeleton count={4} />
 */
export default function CardListSkeleton({ count = 4, className }) {
  return (
    <div className={className ?? 'space-y-3'}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full shrink-0" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20 rounded-md" />
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}