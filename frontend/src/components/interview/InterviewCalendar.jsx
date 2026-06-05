import { useRef, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin  from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin     from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { cn } from '@/lib/utils';

// ── Map round → colour ────────────────────────────────────────
const ROUND_COLORS = {
  interview_1: { bg: '#818cf8', border: '#6366f1' }, // indigo
  interview_2: { bg: '#34d399', border: '#10b981' }, // emerald
  hr:          { bg: '#fb923c', border: '#f97316' }, // orange
};

const SLOT_COLOR = { bg: '#94a3b8', border: '#64748b' };  // slate — available slot

const STATUS_OPACITY = {
  scheduled:   1,
  rescheduled: 0.85,
  completed:   0.5,
  cancelled:   0.35,
};

const ROUND_LABEL = {
  interview_1: 'Round 1',
  interview_2: 'Round 2',
  hr:          'HR',
};

/**
 * Convert Interview docs → FullCalendar event objects.
 */
const interviewsToEvents = (interviews = []) =>
  interviews.map((iv) => {
    const color   = ROUND_COLORS[iv.round] || ROUND_COLORS.interview_1;
    const opacity = STATUS_OPACITY[iv.status] ?? 1;
    const name    = iv.student?.user?.name || iv.student?.rollNumber || 'Student';

    return {
      id:              `iv-${iv._id}`,
      title:           `${ROUND_LABEL[iv.round] || iv.round} — ${name}`,
      start:           iv.scheduledAt,
      end:             new Date(
        new Date(iv.scheduledAt).getTime() + (iv.durationMinutes || 45) * 60000
      ).toISOString(),
      backgroundColor: color.bg,
      borderColor:     color.border,
      textColor:       '#ffffff',
      opacity,
      extendedProps: {
        type:     'interview',
        status:   iv.status,
        round:    iv.round,
        mode:     iv.mode,
        result:   iv.result,
        meetingLink: iv.meetingLink,
        venue:    iv.venue,
        student:  name,
        raw:      iv,
      },
    };
  });

/**
 * Convert InterviewSlot docs → FullCalendar event objects.
 */
const slotsToEvents = (slots = []) =>
  slots.map((slot) => {
    const seatsLeft = slot.seatsLeft ?? (slot.capacity - (slot.bookedBy?.length || 0));
    return {
      id:              `slot-${slot._id}`,
      title:           `Open Slot (${seatsLeft}/${slot.capacity}) — ${ROUND_LABEL[slot.round] || slot.round}`,
      start:           slot.scheduledAt,
      end:             new Date(
        new Date(slot.scheduledAt).getTime() + (slot.durationMinutes || 45) * 60000
      ).toISOString(),
      backgroundColor: SLOT_COLOR.bg,
      borderColor:     SLOT_COLOR.border,
      textColor:       '#ffffff',
      extendedProps: {
        type:     'slot',
        round:    slot.round,
        mode:     slot.mode,
        seatsLeft,
        capacity: slot.capacity,
        raw:      slot,
      },
    };
  });

/**
 * FullCalendar-based interview calendar.
 *
 * @param {object[]} interviews   - populated Interview docs
 * @param {object[]} slots        - InterviewSlot docs
 * @param {Function} onEventClick - called with { type, raw } when event clicked
 */
export default function InterviewCalendar({ interviews = [], slots = [], onEventClick }) {
  const calendarRef = useRef(null);

  const events = [
    ...interviewsToEvents(interviews),
    ...slotsToEvents(slots),
  ];

  const handleEventClick = useCallback(({ event }) => {
    onEventClick?.({
      type: event.extendedProps.type,
      raw:  event.extendedProps.raw,
    });
  }, [onEventClick]);

  // custom event content — compact pill style
  const renderEventContent = useCallback((eventInfo) => {
    const { type, status, result, mode } = eventInfo.event.extendedProps;
    const modeIcon = mode === 'online' ? '🔗' : mode === 'offline' ? '📍' : '🔀';

    return (
      <div className="px-1 py-0.5 overflow-hidden w-full">
        <p className="text-[11px] font-semibold leading-tight truncate">
          {modeIcon} {eventInfo.event.title}
        </p>
        {type === 'interview' && status === 'completed' && result !== 'pending' && (
          <p className="text-[10px] opacity-80 capitalize">{result}</p>
        )}
        {type === 'interview' && status === 'cancelled' && (
          <p className="text-[10px] opacity-70">Cancelled</p>
        )}
      </div>
    );
  }, []);

  return (
    <div className="interview-calendar rounded-xl overflow-hidden border bg-card">
      {/* legend */}
      <div className="flex items-center gap-4 px-4 py-2 border-b text-xs text-muted-foreground flex-wrap">
        <span className="font-medium">Legend:</span>
        {[
          { label: 'Round 1',   color: '#818cf8' },
          { label: 'Round 2',   color: '#34d399' },
          { label: 'HR Round',  color: '#fb923c' },
          { label: 'Open Slot', color: '#94a3b8' },
        ].map(({ label, color }) => (
          <span key={label} className="flex items-center gap-1.5">
            <span
              className="w-3 h-3 rounded-full inline-block"
              style={{ backgroundColor: color }}
            />
            {label}
          </span>
        ))}
      </div>

      {/* FullCalendar */}
      <div className="p-2">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{
            left:   'prev,next today',
            center: 'title',
            right:  'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
          }}
          buttonText={{
            today:    'Today',
            month:    'Month',
            week:     'Week',
            day:      'Day',
            list:     'List',
          }}
          events={events}
          eventContent={renderEventContent}
          eventClick={handleEventClick}
          height="auto"
          slotMinTime="07:00:00"
          slotMaxTime="21:00:00"
          slotDuration="00:30:00"
          allDaySlot={false}
          nowIndicator
          weekends
          eventTimeFormat={{
            hour:   '2-digit',
            minute: '2-digit',
            meridiem: 'short',
          }}
          // style overrides via inline styles — FullCalendar uses its own CSS vars
          eventBorderRadius="6px"
        />
      </div>
    </div>
  );
}