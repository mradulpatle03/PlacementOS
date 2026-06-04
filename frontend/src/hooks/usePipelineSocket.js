import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io } from "socket.io-client";
import { toast } from "sonner";

// single shared socket instance
let socket = null;

const getSocket = () => {
  if (!socket) {
    socket = io(import.meta.env.VITE_SOCKET_URL || "", {
      withCredentials: true,
      autoConnect: false,
    });
  }
  return socket;
};

/**
 * Connects to Socket.IO, joins the drive room, and listens for pipeline
 * events. Invalidates React Query cache on any event so the board refetches.
 *
 * @param {string} driveId
 */
export function usePipelineSocket(driveId) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!driveId) return;

    const s = getSocket();

    if (!s.connected) s.connect();

    // join the drive-specific room
    s.emit("join:drive", driveId);

    // event handlers
    const onStageMoved = (data) => {
      // invalidate so Kanban refetches fresh data
      queryClient.invalidateQueries({ queryKey: ["pipeline", driveId] });
      // only show toast if the move was by someone else (avoid double-toast)
      // we can't know the current user here easily, so just invalidate silently
    };

    const onBulkMoved = (data) => {
      queryClient.invalidateQueries({ queryKey: ["pipeline", driveId] });
      toast.info(
        `${data.moved?.length || 0} candidates moved to ${data.targetStageLabel} by ${data.movedBy?.name || "a recruiter"}`,
      );
    };

    const onRejected = (data) => {
      queryClient.invalidateQueries({ queryKey: ["pipeline", driveId] });
      toast.warning(
        `${data.studentName || "A candidate"} was rejected by ${data.rejectedBy?.name || "a recruiter"}`,
      );
    };

    s.on("pipeline:stage_moved", onStageMoved);
    s.on("pipeline:bulk_moved", onBulkMoved);
    s.on("pipeline:rejected", onRejected);

    return () => {
      s.emit("leave:drive", driveId);
      s.off("pipeline:stage_moved", onStageMoved);
      s.off("pipeline:bulk_moved", onBulkMoved);
      s.off("pipeline:rejected", onRejected);
    };
  }, [driveId, queryClient]);
}
