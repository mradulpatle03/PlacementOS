import {
  Calendar,
  Clock,
  Monitor,
  MapPin,
  User2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const ROUND_LABEL = {
  interview_1: "Interview Round 1",
  interview_2: "Interview Round 2",
  hr: "HR Round",
};

const STATUS_STYLES = {
  scheduled: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  rescheduled:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  completed:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  cancelled: "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400",
};

const RESULT_ICON = {
  pass: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
  fail: <XCircle className="w-4 h-4 text-red-500" />,
  no_show: <AlertCircle className="w-4 h-4 text-amber-500" />,
  pending: null,
};

export default function InterviewCard({
  interview,
  mode = "student", // 'student' | 'recruiter'
  onReschedule,
  onCancel,
  onRecordResult,
}) {
  const isPast = new Date(interview.scheduledAt) < new Date();
  const canAct =
    interview.status !== "cancelled" && interview.status !== "completed";

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3 hover:shadow-sm transition-shadow">
      {/* header */}
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-foreground">
              {ROUND_LABEL[interview.round] || interview.round}
            </p>
            <span
              className={cn(
                "text-[11px] font-medium px-2 py-0.5 rounded-full capitalize",
                STATUS_STYLES[interview.status] ||
                  "bg-muted text-muted-foreground",
              )}
            >
              {interview.status}
            </span>
          </div>

          {/* drive / company name (student view) */}
          {mode === "student" && interview.drive?.company?.name && (
            <p className="text-xs text-muted-foreground">
              {interview.drive.company.name} — {interview.drive.title}
            </p>
          )}

          {/* student name (recruiter view) */}
          {mode === "recruiter" && interview.student?.user?.name && (
            <p className="text-xs text-muted-foreground">
              {interview.student.user.name}
              {" · "}
              {interview.student.rollNumber}
              {" · "}
              {interview.student.branch}
            </p>
          )}
        </div>

        {/* result indicator */}
        {interview.result && interview.result !== "pending" && (
          <div className="flex items-center gap-1">
            {RESULT_ICON[interview.result]}
            <span className="text-xs capitalize text-muted-foreground">
              {interview.result === "no_show" ? "No Show" : interview.result}
            </span>
          </div>
        )}
      </div>

      {/* schedule details */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {format(new Date(interview.scheduledAt), "EEE, dd MMM yyyy")}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {format(new Date(interview.scheduledAt), "hh:mm a")}
          {" · "}
          {interview.durationMinutes} min
        </span>
        <span className="flex items-center gap-1 capitalize">
          <Monitor className="w-3 h-3" />
          {interview.mode}
        </span>
        {interview.venue && (
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {interview.venue}
          </span>
        )}
      </div>

      {/* meeting link */}
      {interview.meetingLink && (
        <a
          href={interview.meetingLink}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary underline underline-offset-2 hover:opacity-80 block"
        >
          Join Meeting →
        </a>
      )}

      {/* panel (student sees panel names) */}
      {interview.panel?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {interview.panel.map((p, i) => (
            <span
              key={i}
              className="flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground"
            >
              <User2 className="w-3 h-3" />
              {p.name || p.email || "Interviewer"}
              {p.role && p.role !== "interviewer" && ` (${p.role})`}
            </span>
          ))}
        </div>
      )}

      {/* feedback (shown after result) */}
      {interview.feedback && (
        <p className="text-xs text-muted-foreground italic border-l-2 border-muted pl-2">
          "{interview.feedback}"
        </p>
      )}
      {/* pipeline stage indicator — recruiter view only */}
      {mode === 'recruiter' && interview.result && interview.result !== 'pending' && (
        <div className={cn(
          'flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg w-fit',
          interview.result === 'pass'
            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
            : 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'
        )}>
          <ChevronRight className="w-3 h-3" />
          Pipeline auto-moved:{' '}
          <strong className="ml-0.5">
            {interview.result === 'pass'
              ? {
                  interview_1: 'Interview Round 2',
                  interview_2: 'HR Round',
                  hr:          'Offered',
                }[interview.round] || 'Next Stage'
              : 'Rejected'}
          </strong>
        </div>
      )}
      {/* recruiter actions */}
      {mode === "recruiter" && canAct && (
        <div className="flex gap-2 pt-1 border-t flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-7"
            onClick={() => onReschedule?.(interview)}
          >
            Reschedule
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7 text-destructive hover:text-destructive"
            onClick={() => onCancel?.(interview)}
          >
            Cancel
          </Button>
          {isPast && interview.result === "pending" && (
            <Button
              size="sm"
              className="text-xs h-7 ml-auto"
              onClick={() => onRecordResult?.(interview)}
            >
              Record Result
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
