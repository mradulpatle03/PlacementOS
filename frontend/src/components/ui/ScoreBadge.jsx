import { cn } from '@/lib/utils';

const gradeStyles = {
  A: 'bg-green-100 text-green-700 border-green-200',
  B: 'bg-blue-100 text-blue-700 border-blue-200',
  C: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  D: 'bg-red-100 text-red-700 border-red-200',
};

export default function ScoreBadge({ score, grade, className }) {
  if (score === undefined || score === null) return null;
  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded border',
      gradeStyles[grade] || gradeStyles.D,
      className
    )}>
      {score}/100 · {grade}
    </span>
  );
}