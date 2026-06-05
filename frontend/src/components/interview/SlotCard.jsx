import { Calendar, Clock, Monitor, MapPin, Users } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function SlotCard({
  slot,
  mode = "recruiter",
  onBook,
  onDelete,
  booking,
}) {
  const seatsLeft =
    slot.seatsLeft ?? slot.capacity - (slot.bookedBy?.length || 0);
  const isFull = seatsLeft <= 0;

  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-4 flex flex-col gap-3 transition-shadow hover:shadow-sm",
        isFull && mode === "student" && "opacity-60",
      )}
    >
      {/* date + time */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">
            {format(new Date(slot.scheduledAt), "EEE, dd MMM yyyy")}
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            {format(new Date(slot.scheduledAt), "hh:mm a")}
            {" · "}
            {slot.durationMinutes} min
          </p>
        </div>

        {/* capacity badge */}
        <span
          className={cn(
            "text-xs font-medium px-2 py-0.5 rounded-full shrink-0",
            isFull
              ? "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400"
              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
          )}
        >
          {isFull
            ? "Full"
            : `${seatsLeft} seat${seatsLeft !== 1 ? "s" : ""} left`}
        </span>
      </div>

      {/* mode + location */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1">
          <Monitor className="w-3 h-3" />
          {slot.mode}
        </span>
        {slot.venue && (
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {slot.venue}
          </span>
        )}
        {slot.meetingLink && (
          <a
            href={slot.meetingLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2 hover:opacity-80"
          >
            Join link
          </a>
        )}
      </div>

      {/* recruiter: booked count + delete */}
      {mode === "recruiter" && (
        <div className="flex items-center justify-between pt-1 border-t">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Users className="w-3 h-3" />
            {slot.bookedBy?.length || 0} / {slot.capacity} booked
          </span>
          {(slot.bookedBy?.length || 0) === 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive text-xs h-7"
              onClick={() => onDelete?.(slot._id)}
            >
              Remove
            </Button>
          )}
        </div>
      )}

      {/* student: book button */}
      {mode === "student" && (
        <Button
          size="sm"
          className="w-full mt-1"
          disabled={isFull || booking}
          onClick={() => onBook?.(slot._id)}
        >
          {booking ? "Booking…" : isFull ? "Fully Booked" : "Book This Slot"}
        </Button>
      )}
    </div>
  );
}
