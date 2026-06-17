import { Skeleton } from '@/components/ui/skeleton';

/**
 * Mimics a vertical form while initial data (e.g. edit-mode prefill) loads.
 * <FormSkeleton fields={5} />
 */
export default function FormSkeleton({ fields = 5, className }) {
  return (
    <div className={className ?? 'space-y-4'}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
      ))}
      <Skeleton className="h-9 w-32 rounded-md mt-2" />
    </div>
  );
}