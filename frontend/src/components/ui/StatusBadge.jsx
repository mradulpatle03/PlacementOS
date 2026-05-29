import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const statusStyles = {
  // Drive statuses
  draft:      'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  published:  'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  open:       'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  closed:     'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  completed:  'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  // Application / pipeline statuses
  registered:   'bg-gray-100 text-gray-700',
  applied:      'bg-blue-100 text-blue-700',
  shortlisted:  'bg-yellow-100 text-yellow-700',
  oa:           'bg-indigo-100 text-indigo-700',
  'interview-1':'bg-orange-100 text-orange-700',
  'interview-2':'bg-orange-100 text-orange-700',
  hr:           'bg-pink-100 text-pink-700',
  offered:      'bg-green-100 text-green-700',
  accepted:     'bg-emerald-100 text-emerald-700',
  rejected:     'bg-red-100 text-red-700',
  withdrawn:    'bg-gray-100 text-gray-500',
  // Placement status
  unplaced:     'bg-gray-100 text-gray-700',
  placed:       'bg-green-100 text-green-700',
  dream_placed: 'bg-yellow-100 text-yellow-700',
  // Verification
  verified:     'bg-green-100 text-green-700',
  pending:      'bg-yellow-100 text-yellow-700',
};

export default function StatusBadge({ status }) {
  const label = status?.replace(/_/g, ' ').replace(/-/g, ' ');
  return (
    <Badge className={cn('capitalize font-medium border-0', statusStyles[status] || statusStyles.draft)}>
      {label || 'Unknown'}
    </Badge>
  );
}