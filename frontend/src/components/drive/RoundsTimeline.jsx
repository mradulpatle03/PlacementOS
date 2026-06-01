import { CheckCircle2, Clock, Video, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

const ROUND_TYPE_LABELS = {
  aptitude: "Aptitude Test",
  coding: "Coding Test",
  technical: "Technical Interview",
  hr: "HR Interview",
  group_discussion: "Group Discussion",
  presentation: "Presentation",
  other: "Other",
};

const ROUND_TYPE_COLORS = {
  aptitude: "bg-blue-100 text-blue-700",
  coding: "bg-purple-100 text-purple-700",
  technical: "bg-orange-100 text-orange-700",
  hr: "bg-green-100 text-green-700",
  group_discussion: "bg-yellow-100 text-yellow-700",
  presentation: "bg-pink-100 text-pink-700",
  other: "bg-gray-100 text-gray-600",
};

export default function RoundsTimeline({ rounds = [] }) {
  if (!rounds.length) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        Round details will be announced soon
      </p>
    );
  }

  return (
    <div className="space-y-0">
      {rounds.map((round, i) => (
        <div key={i} className="flex gap-4">
          {/* connector */}
          <div className="flex flex-col items-center">
            <div className="h-8 w-8 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center text-xs font-bold text-primary shrink-0">
              {i + 1}
            </div>
            {i < rounds.length - 1 && (
              <div className="w-0.5 flex-1 bg-border my-1" />
            )}
          </div>

          {/* content */}
          <div className={cn("pb-6", i === rounds.length - 1 && "pb-0")}>
            <div className="flex items-start gap-2 flex-wrap">
              <p className="font-medium text-sm">{round.name}</p>
              <span
                className={cn(
                  "text-xs px-2 py-0.5 rounded-full font-medium",
                  ROUND_TYPE_COLORS[round.type] || ROUND_TYPE_COLORS.other,
                )}
              >
                {ROUND_TYPE_LABELS[round.type] || round.type}
              </span>
              {round.isOnline && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-medium flex items-center gap-1">
                  <Video className="h-3 w-3" /> Online
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
              {round.durationMinutes && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {round.durationMinutes} min
                </span>
              )}
              {round.venue && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {round.venue}
                </span>
              )}
              {round.scheduledAt && (
                <span>{new Date(round.scheduledAt).toLocaleString()}</span>
              )}
            </div>

            {round.description && (
              <p className="text-xs text-muted-foreground mt-1">
                {round.description}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
