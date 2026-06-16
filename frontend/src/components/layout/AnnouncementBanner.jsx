import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { Megaphone, X, ChevronDown, ChevronUp } from "lucide-react";
import { adminAPI } from "@/api/admin.api";
import { cn } from "@/lib/utils";

const DISMISSED_KEY = "placementos_dismissed_announcements";

const getDismissed = () => {
  try {
    return JSON.parse(sessionStorage.getItem(DISMISSED_KEY) || "[]");
  } catch {
    return [];
  }
};

const setDismissed = (ids) => {
  try {
    sessionStorage.setItem(DISMISSED_KEY, JSON.stringify(ids));
  } catch {}
};

function SingleAnnouncement({ announcement, onDismiss }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = announcement.message.length > 120;

  return (
    <div className="flex items-start gap-3 px-4 py-2.5 border-b border-primary/20 last:border-b-0">
      <Megaphone className="w-4 h-4 text-primary shrink-0 mt-0.5" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-foreground">
            {announcement.title}
          </p>
        </div>
        <p
          className={cn(
            "text-xs text-muted-foreground mt-0.5",
            !expanded && isLong && "line-clamp-1",
          )}
        >
          {announcement.message}
        </p>
        {isLong && (
          <button
            onClick={() => setExpanded((p) => !p)}
            className="flex items-center gap-1 text-[11px] text-primary hover:underline mt-1"
          >
            {expanded ? (
              <>
                Show less <ChevronUp className="w-3 h-3" />
              </>
            ) : (
              <>
                Show more <ChevronDown className="w-3 h-3" />
              </>
            )}
          </button>
        )}
      </div>

      <button
        onClick={() => onDismiss(announcement._id)}
        className="p-1 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-foreground transition-colors shrink-0"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function AnnouncementBanner() {
  const { isAuthenticated } = useSelector((s) => s.auth);
  const [dismissedIds, setDismissedIds] = useState(getDismissed());

  const { data } = useQuery({
    queryKey: ["active-announcements"],
    queryFn: () =>
      adminAPI.getActive().then((r) => r.data.data.announcements || []),
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000, // re-check every 5 min for new announcements
  });

  const announcements = (data || []).filter(
    (a) => !dismissedIds.includes(a._id),
  );

  const handleDismiss = (id) => {
    const updated = [...dismissedIds, id];
    setDismissedIds(updated);
    setDismissed(updated);
  };

  if (!isAuthenticated || announcements.length === 0) return null;

  return (
    <div className="bg-primary/5 border-b">
      <div className="max-w-7xl mx-auto">
        {announcements.map((a) => (
          <SingleAnnouncement
            key={a._id}
            announcement={a}
            onDismiss={handleDismiss}
          />
        ))}
      </div>
    </div>
  );
}
