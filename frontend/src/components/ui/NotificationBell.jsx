import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { Bell, Check, Loader2, BellOff } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { notificationAPI } from '@/api/notification.api';

// ── notification type → accent colour ────────────────────────
const TYPE_COLOR = {
  drive_opened:       'bg-blue-500',
  application_status: 'bg-indigo-500',
  oa_reminder:        'bg-amber-500',
  interview_reminder: 'bg-purple-500',
  offer_released:     'bg-emerald-500',
  result_declared:    'bg-emerald-600',
  general:            'bg-gray-400',
};

function NotificationDot({ type }) {
  return (
    <span
      className={cn(
        'shrink-0 w-2 h-2 rounded-full mt-1',
        TYPE_COLOR[type] || 'bg-gray-400'
      )}
    />
  );
}

export default function NotificationBell() {
  const [open, setOpen]   = useState(false);
  const navigate          = useNavigate();
  const queryClient       = useQueryClient();

  // unread count — polled every 60s as a fallback to sockets
  const { data: countData } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn:  () => notificationAPI.getUnreadCount().then((r) => r.data.data.count),
    refetchInterval: 60_000,
  });

  // preview — latest 5 notifications (read + unread)
  const { data: previewData, isLoading: previewLoading } = useQuery({
    queryKey: ['notifications', 'preview'],
    queryFn:  () =>
      notificationAPI.getAll({ page: 1, limit: 5 }).then((r) => r.data.data),
    enabled:  open,                 // only fetch when dropdown is open
  });

  const unreadCount   = countData || 0;
  const notifications = previewData?.notifications || [];

  // mark all read
  const markAllMutation = useMutation({
    mutationFn: () => notificationAPI.markAllRead(),
    onSuccess:  () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      toast.success('All notifications marked as read');
    },
  });

  // mark single read
  const markOneMutation = useMutation({
    mutationFn: (id) => notificationAPI.markRead(id),
    onSuccess:  () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  const handleItemClick = (n) => {
    if (!n.isRead) markOneMutation.mutate(n._id);
    setOpen(false);
    if (n.metadata?.link) navigate(n.metadata.link);
  };

  return (
    <div className="relative">
      {/* ── Bell trigger ───────────────────────────────────── */}
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setOpen((p) => !p)}
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>

      {/* ── Dropdown ───────────────────────────────────────── */}
      {open && (
        <>
          {/* backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />

          <div className="absolute right-0 top-10 z-50 w-80 rounded-xl border bg-popover shadow-xl overflow-hidden">

            {/* header */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <p className="text-sm font-semibold">
                Notifications
                {unreadCount > 0 && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {unreadCount} unread
                  </span>
                )}
              </p>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllMutation.mutate()}
                  disabled={markAllMutation.isPending}
                  className="flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50"
                >
                  {markAllMutation.isPending
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <Check className="w-3 h-3" />}
                  Mark all read
                </button>
              )}
            </div>

            {/* list */}
            <div className="max-h-72 overflow-y-auto divide-y divide-border">
              {previewLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <BellOff className="w-6 h-6 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">No notifications yet</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n._id}
                    onClick={() => handleItemClick(n)}
                    className={cn(
                      'w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-muted/50 transition-colors',
                      !n.isRead && 'bg-primary/5'
                    )}
                  >
                    <NotificationDot type={n.type} />
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        'text-xs leading-snug line-clamp-1',
                        !n.isRead ? 'font-semibold text-foreground' : 'font-medium text-foreground'
                      )}>
                        {n.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-snug">
                        {n.message}
                      </p>
                      <p className="text-[10px] text-muted-foreground/70 mt-1">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    {!n.isRead && (
                      <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                    )}
                  </button>
                ))
              )}
            </div>

            {/* footer */}
            <div className="border-t px-4 py-2.5">
              <button
                onClick={() => { setOpen(false); navigate('/notifications'); }}
                className="w-full text-xs text-primary hover:underline text-center"
              >
                View all notifications
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}