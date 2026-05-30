import { useQuery } from '@tanstack/react-query';
import { studentAPI } from '@/api/student.api';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

export default function ProfileMeter({ compact = false }) {
  const { data, isLoading } = useQuery({
    queryKey: ['profileCompleteness'],
    queryFn: async () => {
      const res = await studentAPI.getCompleteness();
      return res.data;
    },
  });

  if (isLoading) return (
    <div className="flex items-center gap-2 text-muted-foreground text-sm">
      <Loader2 className="h-4 w-4 animate-spin" /> Checking profile...
    </div>
  );

  if (!data) return null;

  const { percent, checks } = data;
  const color = percent >= 80 ? 'bg-green-500' : percent >= 50 ? 'bg-yellow-500' : 'bg-red-500';
  const textColor = percent >= 80 ? 'text-green-600' : percent >= 50 ? 'text-yellow-600' : 'text-red-600';

  if (compact) {
    return (
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Profile</span>
          <span className={cn('font-bold', textColor)}>{percent}%</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${percent}%` }} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold">Profile Completeness</p>
          <p className="text-xs text-muted-foreground">
            {data.completed}/{data.total} items complete
          </p>
        </div>
        <span className={cn('text-3xl font-bold', textColor)}>{percent}%</span>
      </div>

      <div className="h-2.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-700', color)}
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {checks.map((c) => (
          <div key={c.field} className="flex items-center gap-1.5 text-xs">
            {c.done
              ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
              : <Circle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            }
            <span className={c.done ? 'text-foreground' : 'text-muted-foreground'}>
              {c.label}
            </span>
          </div>
        ))}
      </div>

      {percent < 100 && (
        <div className="flex gap-2 pt-1">
          <Link
            to="/profile"
            className="text-xs text-primary hover:underline"
          >
            Complete profile →
          </Link>
          {!checks.find((c) => c.field === 'resume')?.done && (
            <Link to="/resumes" className="text-xs text-primary hover:underline">
              Upload resume →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}