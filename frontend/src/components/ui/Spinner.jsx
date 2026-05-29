import { cn } from '@/lib/utils';

export default function Spinner({ className }) {
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}