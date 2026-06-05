import { format } from 'date-fns';
import { X, Calendar, Clock, Monitor, MapPin, User2, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const ROUND_LABEL = {
  interview_1: 'Interview Round 1',
  interview_2: 'Interview Round 2',
  hr:          'HR Round',
};

const RESULT_STYLE = {
  pass:    'text-emerald-600 dark:text-emerald-400',
  fail:    'text-red-500',
  no_show: 'text-amber-500',
  pending: 'text-muted-foreground',
};

const STATUS_STYLE = {
  scheduled:   'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  rescheduled: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  completed:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  cancelled:   'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400',
};

/**
 * Floating detail panel shown when a calendar event is clicked.
 *
 * @param {{ type, raw }}  event         - from InterviewCalendar onEventClick
 * @param {Function}       onClose
 * @param {Function}       onReschedule  - (interview) => void
 * @param {Function}       onCancel      - (interview) => void
 * @param {Function}       onResult      - (interview) => void
 */
export default function InterviewEventPopover({
  event,
  onClose,
  onReschedule,
  onCancel,
  onResult,
}) {
  if (!event) return null;

  const { type, raw } = event;

  // ── Slot popover ────────────────────────────────────────────
  if (type === 'slot') {
    const seatsLeft = raw.seatsLeft ?? (raw.capacity - (raw.bookedBy?.length || 0));
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30"
        onClick={onClose}>
        <div
          className="bg-card border rounded-2xl shadow-xl p-5 w-full max-w-sm space-y-3"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between">
            <p className="font-semibold text-sm">Open Interview Slot</p>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2 text-xs text-muted-foreground">
            <p className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {format(new Date(raw.scheduledAt), 'EEE, dd MMM yyyy · hh:mm a')}
            </p>
            <p className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {raw.durationMinutes} min · {ROUND_LABEL[raw.round] || raw.round}
            </p>
            <p className="flex items-center gap-1.5 capitalize">
              <Monitor className="w-3.5 h-3.5" />
              {raw.mode}
            </p>
            {raw.venue && (
              <p className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                {raw.venue}
              </p>
            )}
            <p className="font-medium text-foreground">
              {seatsLeft}/{raw.capacity} seats available
            </p>
          </div>

          <Button variant="outline" size="sm" className="w-full" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    );
  }

  // ── Interview popover ───────────────────────────────────────
  const iv       = raw;
  const isPast   = new Date(iv.scheduledAt) < new Date();
  const canAct   = iv.status !== 'cancelled' && iv.status !== 'completed';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30"
      onClick={onClose}
    >
      <div
        className="bg-card border rounded-2xl shadow-xl p-5 w-full max-w-sm space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <p className="font-semibold text-sm">
              {ROUND_LABEL[iv.round] || iv.round}
            </p>
            <span className={cn(
              'text-[11px] font-medium px-2 py-0.5 rounded-full capitalize',
              STATUS_STYLE[iv.status] || 'bg-muted text-muted-foreground'
            )}>
              {iv.status}
            </span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* details */}
        <div className="space-y-2 text-xs text-muted-foreground">
          {/* student */}
          <p className="flex items-center gap-1.5 text-foreground font-medium">
            <User2 className="w-3.5 h-3.5 text-muted-foreground" />
            {iv.student?.user?.name || '—'}
            {iv.student?.rollNumber && (
              <span className="font-normal text-muted-foreground">· {iv.student.rollNumber}</span>
            )}
          </p>

          <p className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            {format(new Date(iv.scheduledAt), 'EEE, dd MMM yyyy')}
          </p>

          <p className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {format(new Date(iv.scheduledAt), 'hh:mm a')}
            {' · '}{iv.durationMinutes} min
          </p>

          <p className="flex items-center gap-1.5 capitalize">
            <Monitor className="w-3.5 h-3.5" />
            {iv.mode}
          </p>

          {iv.venue && (
            <p className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              {iv.venue}
            </p>
          )}

          {iv.meetingLink && (
            <a
              href={iv.meetingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-primary underline underline-offset-2"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Join Meeting
            </a>
          )}

          {/* result */}
          {iv.result && iv.result !== 'pending' && (
            <p className={cn('font-semibold capitalize', RESULT_STYLE[iv.result])}>
              Result: {iv.result === 'no_show' ? 'No Show' : iv.result}
              {iv.ratingOutOf10 != null && ` · ${iv.ratingOutOf10}/10`}
            </p>
          )}

          {iv.feedback && (
            <p className="italic border-l-2 border-muted pl-2 text-muted-foreground">
              "{iv.feedback}"
            </p>
          )}
        </div>

        {/* actions */}
        {canAct && (
          <div className="flex gap-2 pt-1 border-t flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7 flex-1"
              onClick={() => { onReschedule?.(iv); onClose(); }}
            >
              Reschedule
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 text-destructive hover:text-destructive"
              onClick={() => { onCancel?.(iv); onClose(); }}
            >
              Cancel
            </Button>
            {isPast && iv.result === 'pending' && (
              <Button
                size="sm"
                className="text-xs h-7 w-full"
                onClick={() => { onResult?.(iv); onClose(); }}
              >
                Record Result
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}