import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { toast } from 'sonner';

// single shared socket instance — same one used by usePipelineSocket
let socket = null;

const getSocket = () => {
  if (!socket) {
    socket = io(import.meta.env.VITE_SOCKET_URL || '', {
      withCredentials: true,
      autoConnect: false,
    });
  }
  return socket;
};

/**
 * Connects to Socket.IO, joins the user's personal room, and listens
 * for real-time in-app notifications.
 *
 * - Invalidates the 'notifications' React Query cache so the bell + page refresh.
 * - Shows a toast for each incoming notification.
 *
 * Mount this once at AppLayout level so it's always active while logged in.
 */
export function useNotificationSocket() {
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isAuthenticated || !user?._id) return;

    const s = getSocket();

    if (!s.connected) s.connect();

    // join personal room
    s.emit('join:user', user._id);

    const onNotification = (data) => {
      // refresh notification list + unread count
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });

      // show toast
      toast(data.title, {
        description: data.message,
        duration: 5000,
      });
    };

    s.on('notification:new', onNotification);

    return () => {
      s.emit('leave:user', user._id);
      s.off('notification:new', onNotification);
    };
  }, [isAuthenticated, user?._id, queryClient]);
}