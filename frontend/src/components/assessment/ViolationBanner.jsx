import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Shows a warning banner at the top when violations exist.
 *
 * @param {number} count       - current violation count
 * @param {number} max         - maxTabSwitches from settings
 */
export default function ViolationBanner({ count, max }) {
  if (count === 0) return null;

  const remaining = max - count;
  const isDanger  = remaining <= 1;

  return (
    <div className={cn(
      'flex items-center gap-2 px-4 py-1.5 text-xs font-medium',
      isDanger
        ? 'bg-red-500 text-white'
        : 'bg-amber-400 text-amber-950'
    )}>
      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
      <span>
        {count} violation{count !== 1 ? 's' : ''} recorded.
        {remaining > 0
          ? ` ${remaining} more will trigger auto-submission.`
          : ' Auto-submission will occur on next violation.'}
      </span>
    </div>
  );
}