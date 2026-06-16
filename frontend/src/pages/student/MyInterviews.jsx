import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format, isPast, isToday, isTomorrow, formatDistanceToNow } from 'date-fns';
import {
  Calendar, Clock, Monitor, MapPin, ExternalLink,
  Loader2, ChevronRight, Building2, CheckCircle2,
  XCircle, AlertCircle, Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { interviewAPI } from '@/api/interview.api';
import { getMyApplications } from '@/api/application.api';
import { CardListSkeleton } from '@/components/ui/skeletons';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const ROUND_LABEL = {
  interview_1: 'Interview Round 1',
  interview_2: 'Interview Round 2',
  hr:          'HR Round',
};

const STATUS_CONFIG = {
  scheduled:   { label: 'Scheduled',   cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'     },
  rescheduled: { label: 'Rescheduled', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'  },
  completed:   { label: 'Completed',   cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  cancelled:   { label: 'Cancelled',   cls: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400'          },
};

const RESULT_CONFIG = {
  pass:    { label: 'Passed',  cls: 'text-emerald-600 dark:text-emerald-400', icon: CheckCircle2 },
  fail:    { label: 'Failed',  cls: 'text-red-500',                           icon: XCircle      },
  no_show: { label: 'No Show', cls: 'text-amber-500',                         icon: AlertCircle  },
  pending: null,
};

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function getTimeLabel(date) {
  const d = new Date(date);
  if (isToday(d))     return `Today at ${format(d, 'hh:mm a')}`;
  if (isTomorrow(d))  return `Tomorrow at ${format(d, 'hh:mm a')}`;
  if (isPast(d))      return format(d, 'dd MMM yyyy · hh:mm a');
  return `${formatDistanceToNow(d, { addSuffix: true })} · ${format(d, 'dd MMM yyyy, hh:mm a')}`;
}

function getUrgencyStyle(date, status) {
  if (status === 'cancelled' || status === 'completed') return '';
  const d     = new Date(date);
  const diff  = d.getTime() - Date.now();
  if (diff < 0)                         return 'border-l-4 border-l-muted';
  if (diff < 60 * 60 * 1000)           return 'border-l-4 border-l-red-500';    // < 1h
  if (diff < 24 * 60 * 60 * 1000)      return 'border-l-4 border-l-amber-400';  // < 24h
  return 'border-l-4 border-l-blue-400';
}

// ─────────────────────────────────────────────────────────────
// InterviewCard — single scheduled interview
// ─────────────────────────────────────────────────────────────

function InterviewRow({ interview }) {
  const status  = STATUS_CONFIG[interview.status] || STATUS_CONFIG.scheduled;
  const result  = RESULT_CONFIG[interview.result];
  const ResultIcon = result?.icon;

  const isUpcoming = !isPast(new Date(interview.scheduledAt))
    && interview.status !== 'cancelled';

  return (
    <div className={cn(
      'rounded-xl border bg-card px-5 py-4 shadow-sm transition-shadow hover:shadow-md',
      getUrgencyStyle(interview.scheduledAt, interview.status)
    )}>
      <div className="flex items-start justify-between gap-4 flex-wrap">

        {/* left — main info */}
        <div className="space-y-2 min-w-0 flex-1">

          {/* round + status + result */}
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm">
              {ROUND_LABEL[interview.round] || interview.round}
            </p>
            <span className={cn(
              'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
              status.cls
            )}>
              {status.label}
            </span>
            {result && (
              <span className={cn('flex items-center gap-1 text-xs font-medium', result.cls)}>
                <ResultIcon className="w-3.5 h-3.5" />
                {result.label}
                {interview.ratingOutOf10 != null && ` · ${interview.ratingOutOf10}/10`}
              </span>
            )}
          </div>

          {/* company + drive */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Building2 className="w-3 h-3 shrink-0" />
            <span>
              {interview.drive?.company?.name || '—'}
              {interview.drive?.title && (
                <span className="ml-1">· {interview.drive.title}</span>
              )}
            </span>
          </div>

          {/* time */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            <span className={cn(
              'flex items-center gap-1',
              isUpcoming && 'font-medium text-foreground'
            )}>
              <Calendar className="w-3 h-3" />
              {getTimeLabel(interview.scheduledAt)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
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

          {/* panel */}
          {interview.panel?.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Panel: {interview.panel.map((p) => p.name || p.email || 'Interviewer').join(', ')}
            </p>
          )}

          {/* feedback */}
          {interview.feedback && (
            <p className="text-xs text-muted-foreground italic border-l-2 border-muted pl-2">
              "{interview.feedback}"
            </p>
          )}
        </div>

        {/* right — join button */}
        {interview.meetingLink && isUpcoming && (
          <a
            href={interview.meetingLink}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0"
          >
            <Button size="sm" className="gap-1.5">
              <ExternalLink className="w-3.5 h-3.5" />
              Join Meeting
            </Button>
          </a>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SlotRow — single available slot to book
// ─────────────────────────────────────────────────────────────

function SlotRow({ slot, onBook, isBooking }) {
  const seatsLeft = slot.seatsLeft ?? (slot.capacity - (slot.bookedBy?.length || 0));
  const isFull    = seatsLeft <= 0;

  return (
    <div className={cn(
      'rounded-xl border bg-card px-5 py-4 flex items-center justify-between gap-4',
      isFull && 'opacity-60'
    )}>
      <div className="space-y-1.5 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold">
            {ROUND_LABEL[slot.round] || slot.round}
          </p>
          <span className={cn(
            'text-xs font-medium px-2 py-0.5 rounded-full',
            isFull
              ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400'
              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
          )}>
            {isFull ? 'Full' : `${seatsLeft} seat${seatsLeft !== 1 ? 's' : ''} left`}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1 font-medium text-foreground">
            <Calendar className="w-3 h-3" />
            {format(new Date(slot.scheduledAt), 'EEE, dd MMM yyyy · hh:mm a')}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {slot.durationMinutes} min
          </span>
          <span className="flex items-center gap-1 capitalize">
            <Monitor className="w-3 h-3" />
            {slot.mode}
          </span>
          {slot.venue && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {slot.venue}
            </span>
          )}
        </div>
      </div>

      <Button
        size="sm"
        disabled={isFull || isBooking}
        onClick={() => !isFull && onBook(slot._id)}
        className="shrink-0"
      >
        {isBooking ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Book Slot'}
      </Button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Book Slot Dialog
// ─────────────────────────────────────────────────────────────

function BookSlotDialog({ open, onClose, onBooked }) {
  const [appId,    setAppId]   = useState('');
  const [driveId,  setDriveId] = useState('');
  const [round,    setRound]   = useState('interview_1');
  const [bookingId, setBookingId] = useState(null);

  // student's active applications to choose from
  const { data: appsData, isLoading: appsLoading } = useQuery({
    queryKey: ['my-applications-interview-eligible'],
    queryFn:  () =>
      getMyApplications({ limit: 50 }).then((r) => r.data.data?.applications || []),
    enabled:  open,
  });

  // available slots for chosen drive + round
  const { data: slotsData, isLoading: slotsLoading } = useQuery({
    queryKey: ['available-slots', driveId, round],
    queryFn:  () =>
      interviewAPI.getAvailableSlots(driveId, round).then((r) => r.data.data.slots),
    enabled:  !!driveId,
  });

  const bookMutation = useMutation({
    mutationFn: (slotId) => interviewAPI.bookSlot(slotId, appId),
    onSuccess:  () => {
      toast.success('Interview slot booked successfully!');
      onBooked();
      onClose();
    },
    onError: (err) =>
      toast.error(err?.response?.data?.message || 'Booking failed. Try again.'),
    onSettled: () => setBookingId(null),
  });

  const handleBook = (slotId) => {
    if (!appId) { toast.error('Please select a drive first'); return; }
    setBookingId(slotId);
    bookMutation.mutate(slotId);
  };

  const apps  = appsData || [];
  // filter to only applications that are in an interview stage
  const interviewApps = apps.filter((a) =>
    ['interview_1', 'interview_2', 'hr', 'shortlisted'].includes(a.status)
  );
  const slots = slotsData || [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Book Interview Slot</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">

          {/* step 1 — pick application */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              1 · Select Drive
            </label>
            {appsLoading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading applications…
              </div>
            ) : interviewApps.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2 rounded-lg border border-dashed px-3">
                No applications in interview stage found. You'll be able to book
                once a recruiter shortlists you for an interview.
              </p>
            ) : (
              <Select
                value={appId}
                onValueChange={(v) => {
                  setAppId(v);
                  const app = interviewApps.find((a) => a._id === v);
                  setDriveId(app?.drive?._id || app?.drive || '');
                }}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Choose a drive…" />
                </SelectTrigger>
                <SelectContent>
                  {interviewApps.map((a) => (
                    <SelectItem key={a._id} value={a._id} className="text-sm">
                      {a.drive?.title || 'Drive'}
                      {a.drive?.company?.name && ` — ${a.drive.company.name}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* step 2 — pick round */}
          {appId && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                2 · Select Round
              </label>
              <div className="flex gap-2">
                {[
                  { value: 'interview_1', label: 'Round 1' },
                  { value: 'interview_2', label: 'Round 2' },
                  { value: 'hr',          label: 'HR'      },
                ].map((r) => (
                  <button
                    key={r.value}
                    onClick={() => setRound(r.value)}
                    className={cn(
                      'flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                      round === r.value
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border text-muted-foreground hover:border-primary/40'
                    )}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* step 3 — available slots */}
          {driveId && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                3 · Available Slots
              </label>

              {slotsLoading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading slots…
                </div>
              ) : slots.length === 0 ? (
                <div className="rounded-lg border border-dashed px-4 py-6 text-center">
                  <Calendar className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">
                    No available slots for this round yet.
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Check back later or contact your TPO.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {slots.map((slot) => (
                    <SlotRow
                      key={slot._id}
                      slot={slot}
                      isBooking={bookingId === slot._id}
                      onBook={handleBook}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────
// Main page — MyInterviews
// ─────────────────────────────────────────────────────────────

export default function MyInterviews() {
  const queryClient   = useQueryClient();
  const [filter, setFilter]     = useState('all');
  const [showBook, setShowBook] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['my-interviews'],
    queryFn:  () => interviewAPI.getMyInterviews().then((r) => r.data.data.interviews),
  });

  const interviews = data || [];

  // apply filter
  const filtered = interviews.filter((iv) => {
    if (filter === 'all')      return true;
    if (filter === 'upcoming') return !isPast(new Date(iv.scheduledAt)) && iv.status !== 'cancelled';
    if (filter === 'past')     return isPast(new Date(iv.scheduledAt)) || iv.status === 'completed';
    if (filter === 'cancelled')return iv.status === 'cancelled';
    return iv.round === filter;
  });

  // sort: upcoming first by date asc, then past by date desc
  const sorted = [...filtered].sort((a, b) => {
    const aDate = new Date(a.scheduledAt);
    const bDate = new Date(b.scheduledAt);
    const aPast = isPast(aDate);
    const bPast = isPast(bDate);
    if (!aPast && bPast) return -1;
    if (aPast && !bPast) return 1;
    return aPast
      ? bDate.getTime() - aDate.getTime()    // past: newest first
      : aDate.getTime() - bDate.getTime();   // upcoming: soonest first
  });

  // counts for tabs
  const upcomingCount = interviews.filter(
    (iv) => !isPast(new Date(iv.scheduledAt)) && iv.status !== 'cancelled'
  ).length;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">My Interviews</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track your scheduled, upcoming, and past interviews
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setShowBook(true)}>
          <Plus className="w-4 h-4" />
          Book a Slot
        </Button>
      </div>

      {/* ── Summary cards ──────────────────────────────────── */}
      {!isLoading && interviews.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              label: 'Total',
              value: interviews.length,
              cls:   'bg-blue-50 dark:bg-blue-950/30',
            },
            {
              label: 'Upcoming',
              value: upcomingCount,
              cls:   'bg-amber-50 dark:bg-amber-950/30',
            },
            {
              label: 'Cleared',
              value: interviews.filter((i) => i.result === 'pass').length,
              cls:   'bg-emerald-50 dark:bg-emerald-950/30',
            },
            {
              label: 'Completed',
              value: interviews.filter((i) => i.status === 'completed').length,
              cls:   'bg-muted',
            },
          ].map(({ label, value, cls }) => (
            <div key={label} className={cn('rounded-xl p-4 border', cls)}>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Filter bar ─────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { value: 'all',          label: 'All'       },
          { value: 'upcoming',     label: 'Upcoming'  },
          { value: 'past',         label: 'Past'      },
          { value: 'interview_1',  label: 'Round 1'   },
          { value: 'interview_2',  label: 'Round 2'   },
          { value: 'hr',           label: 'HR Round'  },
          { value: 'cancelled',    label: 'Cancelled' },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
              filter === f.value
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:border-primary/40'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Content ────────────────────────────────────────── */}
      {isLoading ? (
        <CardListSkeleton count={5} />
      ) : isError ? (
        <p className="py-16 text-center text-sm text-destructive">
          Failed to load interviews.
        </p>
      ) : sorted.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center">
          <Calendar className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {filter === 'all'
              ? 'No interviews yet. Book a slot or wait for a recruiter to schedule one.'
              : `No ${filter} interviews found.`}
          </p>
          {filter === 'all' && (
            <Button
              variant="link"
              className="mt-1"
              onClick={() => setShowBook(true)}
            >
              Book a slot
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((iv) => (
            <InterviewRow key={iv._id} interview={iv} />
          ))}
        </div>
      )}

      {/* ── Book slot dialog ────────────────────────────────── */}
      <BookSlotDialog
        open={showBook}
        onClose={() => setShowBook(false)}
        onBooked={() => queryClient.invalidateQueries({ queryKey: ['my-interviews'] })}
      />
    </div>
  );
}