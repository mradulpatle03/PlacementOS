import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { addDays } from 'date-fns';
import {
  Plus, Loader2, Calendar, ClipboardList, LayoutGrid,
} from 'lucide-react';

import { interviewAPI } from '@/api/interview.api';
import InterviewCalendar      from '@/components/interview/InterviewCalendar';
import InterviewEventPopover  from '@/components/interview/InterviewEventPopover';
import InterviewCard          from '@/components/interview/InterviewCard';
import SlotCard               from '@/components/interview/SlotCard';
import PageHeader             from '@/components/ui/PageHeader';
import EmptyState             from '@/components/ui/EmptyState';
import { Button }             from '@/components/ui/button';
import { Input }              from '@/components/ui/input';
import { Card, CardContent }  from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

const ROUNDS = [
  { value: 'interview_1', label: 'Interview Round 1' },
  { value: 'interview_2', label: 'Interview Round 2' },
  { value: 'hr',          label: 'HR Round'          },
];

const toLocalISO = (date) => {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

// ── Create Slot Dialog ────────────────────────────────────────
function CreateSlotDialog({ driveId, open, onClose, onCreated }) {
  const [form, setForm] = useState({
    round:           'interview_1',
    scheduledAt:     toLocalISO(addDays(new Date(), 1)),
    durationMinutes: 45,
    mode:            'online',
    venue:           '',
    meetingLink:     '',
    capacity:        1,
  });

  const mutation = useMutation({
    mutationFn: () => interviewAPI.createSlot({ ...form, drive: driveId }),
    onSuccess:  () => { toast.success('Slot created'); onCreated(); onClose(); },
    onError: (err) => {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg || 'Failed to create slot');
    },
  });

  const set = (field, val) => setForm((p) => ({ ...p, [field]: val }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Create Interview Slot</DialogTitle></DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Round *</label>
            <Select value={form.round} onValueChange={(v) => set('round', v)}>
              <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROUNDS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Date & Time *</label>
            <Input
              type="datetime-local"
              value={form.scheduledAt}
              onChange={(e) => set('scheduledAt', e.target.value)}
              className="text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Duration (min)</label>
              <Input
                type="number" min={5}
                value={form.durationMinutes}
                onChange={(e) => set('durationMinutes', Number(e.target.value))}
                className="text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Capacity</label>
              <Input
                type="number" min={1}
                value={form.capacity}
                onChange={(e) => set('capacity', Number(e.target.value))}
                className="text-sm"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Mode</label>
            <div className="flex gap-2">
              {['online', 'offline', 'hybrid'].map((m) => (
                <button
                  key={m}
                  onClick={() => set('mode', m)}
                  className={cn(
                    'flex-1 py-1.5 rounded-lg text-xs font-medium border capitalize transition-colors',
                    form.mode === m
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-muted-foreground hover:border-primary/40'
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {(form.mode === 'offline' || form.mode === 'hybrid') && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Venue</label>
              <Input
                value={form.venue}
                onChange={(e) => set('venue', e.target.value)}
                placeholder="e.g. Room 201, Admin Block"
                className="text-sm"
              />
            </div>
          )}
          {(form.mode === 'online' || form.mode === 'hybrid') && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Meeting Link</label>
              <Input
                value={form.meetingLink}
                onChange={(e) => set('meetingLink', e.target.value)}
                placeholder="https://meet.google.com/..."
                className="text-sm"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : 'Create Slot'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Record Result Dialog ──────────────────────────────────────
function RecordResultDialog({ interview, open, onClose, onSaved }) {
  const [form, setForm] = useState({ result: 'pass', feedback: '', ratingOutOf10: '' });

  const mutation = useMutation({
    mutationFn: () =>
      interviewAPI.recordResult(interview._id, {
        ...form,
        ratingOutOf10: form.ratingOutOf10 !== '' ? Number(form.ratingOutOf10) : null,
      }),
    onSuccess: () => { toast.success('Result recorded'); onSaved(); onClose(); },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed'),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Record Interview Result</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Result *</label>
            <div className="flex gap-2">
              {[
                { value: 'pass',    label: '✓ Pass',    cls: 'bg-emerald-500 border-emerald-500 text-white' },
                { value: 'fail',    label: '✗ Fail',    cls: 'bg-red-500 border-red-500 text-white' },
                { value: 'no_show', label: '— No Show', cls: 'bg-amber-400 border-amber-400 text-white' },
              ].map((r) => (
                <button
                  key={r.value}
                  onClick={() => setForm((p) => ({ ...p, result: r.value }))}
                  className={cn(
                    'flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                    form.result === r.value
                      ? r.cls
                      : 'border-border text-muted-foreground hover:border-primary/40'
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Rating (out of 10)</label>
            <Input
              type="number" min={0} max={10} step={0.5}
              value={form.ratingOutOf10}
              onChange={(e) => setForm((p) => ({ ...p, ratingOutOf10: e.target.value }))}
              placeholder="e.g. 7.5"
              className="text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Feedback</label>
            <textarea
              value={form.feedback}
              onChange={(e) => setForm((p) => ({ ...p, feedback: e.target.value }))}
              placeholder="Optional feedback…"
              rows={3}
              className="w-full text-sm rounded-lg border bg-background px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Result'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Reschedule Dialog ─────────────────────────────────────────
function RescheduleDialog({ interview, open, onClose, onSaved }) {
  const [scheduledAt, setScheduledAt] = useState(
    interview ? toLocalISO(interview.scheduledAt) : ''
  );

  const mutation = useMutation({
    mutationFn: () =>
      interviewAPI.reschedule(interview._id, {
        scheduledAt: new Date(scheduledAt).toISOString(),
      }),
    onSuccess: () => { toast.success('Interview rescheduled'); onSaved(); onClose(); },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to reschedule'),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Reschedule Interview</DialogTitle></DialogHeader>
        <div className="py-2 space-y-1">
          <label className="text-xs font-medium text-muted-foreground">New Date & Time *</label>
          <Input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="text-sm"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !scheduledAt}
          >
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Reschedule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function InterviewManager() {
  const { driveId }    = useParams();
  const queryClient    = useQueryClient();

  const [round, setRound]                         = useState('all');
  const [showCreateSlot, setShowCreateSlot]       = useState(false);
  const [calendarEvent, setCalendarEvent]         = useState(null);   // for popover
  const [resultInterview, setResultInterview]     = useState(null);
  const [rescheduleInterview, setRescheduleInterview] = useState(null);

  const roundFilter = round === 'all' ? undefined : round;

  // ── Data ──────────────────────────────────────────────────
  const { data: slotsData, isLoading: slotsLoading } = useQuery({
    queryKey: ['interview-slots', driveId, round],
    queryFn:  () =>
      interviewAPI.getSlots(driveId, roundFilter).then((r) => r.data.data.slots),
  });

  const { data: interviewsData, isLoading: interviewsLoading } = useQuery({
    queryKey: ['interviews', driveId, round],
    queryFn:  () =>
      interviewAPI.getByDrive(driveId, roundFilter ? { round: roundFilter } : {})
        .then((r) => r.data.data.interviews),
  });

  const isLoading  = slotsLoading || interviewsLoading;
  const slots      = slotsData      || [];
  const interviews = interviewsData || [];

  // ── Mutations ─────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id) => interviewAPI.deleteSlot(id),
    onSuccess:  () => {
      queryClient.invalidateQueries({ queryKey: ['interview-slots', driveId] });
      toast.success('Slot removed');
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Cannot remove slot'),
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => interviewAPI.cancel(id, ''),
    onSuccess:  () => {
      queryClient.invalidateQueries({ queryKey: ['interviews', driveId] });
      toast.success('Interview cancelled');
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to cancel'),
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['interview-slots', driveId] });
    queryClient.invalidateQueries({ queryKey: ['interviews', driveId] });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="Interview Manager"
        subtitle="Manage slots, scheduled interviews, and results"
        actions={
          <Button size="sm" className="gap-1.5" onClick={() => setShowCreateSlot(true)}>
            <Plus className="w-4 h-4" /> Create Slot
          </Button>
        }
      />

      {/* round filter pills */}
      <div className="flex gap-2 flex-wrap">
        {[{ value: 'all', label: 'All Rounds' }, ...ROUNDS].map((r) => (
          <button
            key={r.value}
            onClick={() => setRound(r.value)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
              round === r.value
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:border-primary/40'
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* ── Tabs: Calendar / List / Slots ──────────────────── */}
      <Tabs defaultValue="calendar">
        <TabsList>
          <TabsTrigger value="calendar" className="gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="interviews" className="gap-1.5">
            <ClipboardList className="w-3.5 h-3.5" />
            List ({interviews.length})
          </TabsTrigger>
          <TabsTrigger value="slots" className="gap-1.5">
            <LayoutGrid className="w-3.5 h-3.5" />
            Slots ({slots.length})
          </TabsTrigger>
        </TabsList>

        {/* ── Calendar tab ─────────────────────────────────── */}
        <TabsContent value="calendar" className="mt-4">
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <InterviewCalendar
              interviews={interviews}
              slots={slots}
              onEventClick={(ev) => setCalendarEvent(ev)}
            />
          )}
        </TabsContent>

        {/* ── List tab ─────────────────────────────────────── */}
        <TabsContent value="interviews" className="mt-4">
          {interviewsLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : interviews.length === 0 ? (
            <Card><CardContent className="pt-0">
              <EmptyState
                icon={ClipboardList}
                title="No interviews scheduled"
                description="Create slots so students can book their interview time."
              />
            </CardContent></Card>
          ) : (
            <div className="space-y-3">
              {interviews.map((iv) => (
                <InterviewCard
                  key={iv._id}
                  interview={iv}
                  mode="recruiter"
                  onReschedule={(i) => setRescheduleInterview(i)}
                  onCancel={(i) => cancelMutation.mutate(i._id)}
                  onRecordResult={(i) => setResultInterview(i)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Slots tab ─────────────────────────────────────── */}
        <TabsContent value="slots" className="mt-4">
          {slotsLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : slots.length === 0 ? (
            <Card><CardContent className="pt-0">
              <EmptyState
                icon={Calendar}
                title="No slots created yet"
                description="Create time slots for students to pick from."
                action={
                  <Button size="sm" className="gap-1.5" onClick={() => setShowCreateSlot(true)}>
                    <Plus className="w-4 h-4" /> Create Slot
                  </Button>
                }
              />
            </CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {slots.map((slot) => (
                <SlotCard
                  key={slot._id}
                  slot={slot}
                  mode="recruiter"
                  onDelete={(id) => deleteMutation.mutate(id)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Dialogs ──────────────────────────────────────── */}
      <CreateSlotDialog
        driveId={driveId}
        open={showCreateSlot}
        onClose={() => setShowCreateSlot(false)}
        onCreated={invalidateAll}
      />

      {calendarEvent && (
        <InterviewEventPopover
          event={calendarEvent}
          onClose={() => setCalendarEvent(null)}
          onReschedule={(i) => setRescheduleInterview(i)}
          onCancel={(i) => cancelMutation.mutate(i._id)}
          onResult={(i) => setResultInterview(i)}
        />
      )}

      {resultInterview && (
        <RecordResultDialog
          interview={resultInterview}
          open={!!resultInterview}
          onClose={() => setResultInterview(null)}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ['interviews', driveId] })}
        />
      )}

      {rescheduleInterview && (
        <RescheduleDialog
          interview={rescheduleInterview}
          open={!!rescheduleInterview}
          onClose={() => setRescheduleInterview(null)}
          onSaved={invalidateAll}
        />
      )}
    </div>
  );
}