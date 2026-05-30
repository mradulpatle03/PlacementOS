import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function ProfileSkeleton() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Card>
        <CardContent className="pt-6 space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-2 w-full" />
          <div className="grid grid-cols-2 gap-2">
            {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-4 w-32" />)}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-5 w-28" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}