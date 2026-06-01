import { CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// checks eligibility client-side from student profile data
// full server-side check comes on Day 32
export default function EligibilityChecker({ drive, student }) {
  if (!student) return null;

  const checks = [];

  // CGPA check
  if (drive.eligibility?.minCGPA > 0) {
    const pass = (student.cgpa || 0) >= drive.eligibility.minCGPA;
    checks.push({
      label: `CGPA ≥ ${drive.eligibility.minCGPA}`,
      pass,
      detail: pass ? `Your CGPA: ${student.cgpa}` : `Your CGPA: ${student.cgpa || 'Not set'}`,
    });
  }

  // branch check
  if (drive.eligibility?.allowedBranches?.length) {
    const pass = drive.eligibility.allowedBranches.includes(student.branch);
    checks.push({
      label: 'Branch eligible',
      pass,
      detail: pass
        ? `${student.branch} is allowed`
        : `Your branch (${student.branch || 'Not set'}) is not eligible`,
    });
  }

  // backlogs check
  const maxBacklogs = drive.eligibility?.maxBacklogs ?? 0;
  const studentBacklogs = student.backlogs ?? 0;
  const backlogPass = studentBacklogs <= maxBacklogs;
  checks.push({
    label: `Backlogs ≤ ${maxBacklogs}`,
    pass: backlogPass,
    detail: backlogPass
      ? `Your backlogs: ${studentBacklogs}`
      : `Your backlogs: ${studentBacklogs} (exceeds limit)`,
  });

  // graduation year
  if (drive.eligibility?.graduationYear?.length) {
    const pass = drive.eligibility.graduationYear.includes(student.graduationYear);
    checks.push({
      label: 'Graduation year',
      pass,
      detail: pass
        ? `${student.graduationYear} is eligible`
        : `${student.graduationYear || 'Not set'} not in eligible years`,
    });
  }

  const allPass = checks.every((c) => c.pass);
  const someChecks = checks.length > 0;

  return (
    <div className={cn(
      'rounded-lg border p-4 space-y-3',
      allPass ? 'border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800' :
                'border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800'
    )}>
      <div className="flex items-center gap-2">
        {allPass
          ? <CheckCircle2 className="h-5 w-5 text-green-600" />
          : <XCircle className="h-5 w-5 text-red-500" />
        }
        <p className={cn(
          'font-medium text-sm',
          allPass ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
        )}>
          {allPass ? 'You are eligible for this drive' : 'You are not eligible for this drive'}
        </p>
      </div>

      {someChecks && (
        <div className="space-y-1.5">
          {checks.map((c, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              {c.pass
                ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600 mt-0.5 shrink-0" />
                : <XCircle className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />
              }
              <div>
                <span className="font-medium">{c.label}</span>
                {c.detail && <span className="text-muted-foreground ml-1">— {c.detail}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {!student.branch || !student.cgpa ? (
        <div className="flex items-start gap-2 text-xs text-yellow-700 dark:text-yellow-400">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          Complete your profile to see accurate eligibility
        </div>
      ) : null}
    </div>
  );
}