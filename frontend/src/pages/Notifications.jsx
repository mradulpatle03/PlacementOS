import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow, format } from "date-fns";
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";
import { notificationAPI } from "@/api/notification.api";

const LIMIT = 15;

// ── type → colour + label ─────────────────────────────────────
const TYPE_META = {
  drive_opened: { color: "bg-blue-500", label: "Drive" },
  application_status: { color: "bg-indigo-500", label: "Application" },
  oa_reminder: { color: "bg-amber-500", label: "OA" },
  interview_reminder: { color: "bg-purple-500", label: "Interview" },
  offer_released: { color: "bg-emerald-500", label: "Offer" },
  result_declared: { color: "bg-emerald-600", label: "Result" },
  general: { color: "bg-gray-400", label: "General" },
};

// ── single notification row ───────────────────────────────────
function NotificationRow({
  notification: n,
  onMarkRead,
  onDelete,
  onNavigate,
}) {
  const meta = TYPE_META[n.type] || TYPE_META.general;
  const isUnread = !n.isRead;
  const hasLink = !!n.metadata?.link;

  return (
    <div
      className={cn(
        "group flex items-start gap-4 px-5 py-4 rounded-xl border transition-colors",
        isUnread
          ? "bg-primary/5 border-primary/20 hover:bg-primary/10"
          : "bg-card border-border hover:bg-muted/40",
      )}
    >
      {/* colour dot */}
      <div
        className={cn("shrink-0 w-2.5 h-2.5 rounded-full mt-1.5", meta.color)}
      />

      {/* content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <p
            className={cn(
              "text-sm leading-snug",
              isUnread
                ? "font-semibold text-foreground"
                : "font-medium text-foreground",
            )}
          >
            {n.title}
          </p>
          <Badge
            variant="outline"
            className="text-[10px] px-1.5 py-0 h-4 font-normal shrink-0"
          >
            {meta.label}
          </Badge>
          {isUnread && (
            <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
          )}
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
          {n.message}
        </p>

        <p className="text-[11px] text-muted-foreground/60 mt-1.5">
          {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
          <span className="mx-1.5">·</span>
          {format(new Date(n.createdAt), "dd MMM yyyy, hh:mm a")}
        </p>
      </div>

      {/* actions — show on hover */}
      <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {hasLink && (
          <button
            onClick={() => onNavigate(n.metadata.link)}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Go to page"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        )}
        {isUnread && (
          <button
            onClick={() => onMarkRead(n._id)}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Mark as read"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={() => onDelete(n._id)}
          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── skeleton loader ───────────────────────────────────────────
function NotificationSkeleton() {
  return (
    <div className="flex items-start gap-4 px-5 py-4 rounded-xl border bg-card">
      <Skeleton className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-32" />
      </div>
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────
export default function Notifications() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["notifications", page, unreadOnly],
    queryFn: () =>
      notificationAPI
        .getAll({ page, limit: LIMIT, unreadOnly: unreadOnly.toString() })
        .then((r) => r.data.data),
    keepPreviousData: true,
  });

  const notifications = data?.notifications || [];
  const totalPages = data?.pages || 1;
  const unreadCount = data?.unreadCount || 0;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
  };

  // mark all read
  const markAllMutation = useMutation({
    mutationFn: () => notificationAPI.markAllRead(),
    onSuccess: (res) => {
      invalidate();
      toast.success(res.data.message || "All marked as read");
    },
    onError: () => toast.error("Failed to mark all as read"),
  });

  // mark one read
  const markOneMutation = useMutation({
    mutationFn: (id) => notificationAPI.markRead(id),
    onSuccess: () => invalidate(),
    onError: () => toast.error("Failed to mark as read"),
  });

  // delete one
  const deleteMutation = useMutation({
    mutationFn: (id) => notificationAPI.deleteOne(id),
    onSuccess: () => {
      invalidate();
      toast.success("Notification deleted");
    },
    onError: () => toast.error("Failed to delete notification"),
  });

  const handleNavigate = (link) => navigate(link);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
        actions={
          <div className="flex items-center gap-2">
            <Link
              to="/notifications/preferences"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-border text-muted-foreground hover:border-primary/40 transition-colors"
            >
              <Settings className="w-3 h-3" />
              Preferences
            </Link>
            <button
              onClick={() => {
                setUnreadOnly((p) => !p);
                setPage(1);
              }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                unreadOnly
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-primary/40",
              )}
            >
              <Bell className="w-3 h-3" />
              {unreadOnly ? "Showing unread" : "All"}
            </button>

            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => markAllMutation.mutate()}
                disabled={markAllMutation.isPending}
              >
                {markAllMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCheck className="w-3.5 h-3.5" />
                )}
                Mark all read
              </Button>
            )}
          </div>
        }
      />

      {/* ── content ──────────────────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <NotificationSkeleton key={i} />
          ))}
        </div>
      ) : isError ? (
        <p className="text-center text-sm text-destructive py-16">
          Failed to load notifications.
        </p>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={BellOff}
          title={
            unreadOnly ? "No unread notifications" : "No notifications yet"
          }
          description={
            unreadOnly
              ? "All caught up! Switch off the filter to see your history."
              : "Notifications about drives, applications, and interviews will appear here."
          }
          action={
            unreadOnly ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setUnreadOnly(false)}
              >
                Show all
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <NotificationRow
              key={n._id}
              notification={n}
              onMarkRead={(id) => markOneMutation.mutate(id)}
              onDelete={(id) => deleteMutation.mutate(id)}
              onNavigate={handleNavigate}
            />
          ))}
        </div>
      )}

      {/* ── pagination ───────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || isLoading}
            className="gap-1.5"
          >
            <ChevronLeft className="w-4 h-4" />
            Prev
          </Button>

          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || isLoading}
            className="gap-1.5"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
