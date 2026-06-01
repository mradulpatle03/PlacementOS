import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { driveAPI } from "@/api/drive.api";
import { getDriveStatusColor } from "@/lib/driveUtils";
import { showSuccess, showError } from "@/lib/toast";
import { cn } from "@/lib/utils";

const STATUS_LABELS = {
  draft: "Draft",
  published: "Published",
  open: "Open",
  closed: "Closed",
  completed: "Completed",
};

const TRANSITION_LABELS = {
  published: "Publish Drive",
  open: "Open Applications",
  closed: "Close Applications",
  completed: "Mark Completed",
  draft: "Revert to Draft",
};

const TRANSITION_DESCRIPTIONS = {
  published: "Drive will be visible to students but applications not yet open.",
  open: "Students can start applying to this drive.",
  closed: "No more applications will be accepted.",
  completed: "Mark this drive as completed. This action finalizes the drive.",
  draft: "Revert this drive back to draft for editing.",
};

export default function DriveStatusControl({
  driveId,
  status,
  allowedTransitions = [],
}) {
  const queryClient = useQueryClient();
  const [confirm, setConfirm] = useState({ open: false, status: null });

  const mutation = useMutation({
    mutationFn: (newStatus) => driveAPI.updateStatus(driveId, newStatus),
    onSuccess: (_, newStatus) => {
      queryClient.invalidateQueries({ queryKey: ["drive", driveId] });
      showSuccess(`Drive status updated to '${STATUS_LABELS[newStatus]}'`);
      setConfirm({ open: false, status: null });
    },
    onError: (err) => {
      const msg = err.response?.data?.message;
      showError(
        Array.isArray(msg) ? msg.join(", ") : msg || "Status update failed",
      );
    },
  });

  if (!allowedTransitions.length) {
    return (
      <div
        className={cn(
          "inline-flex items-center text-xs font-medium px-3 py-1.5 rounded-full capitalize",
          getDriveStatusColor(status),
        )}
      >
        {STATUS_LABELS[status] || status}
        {status === "completed" && " (Final)"}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span
        className={cn(
          "inline-flex items-center text-xs font-medium px-3 py-1.5 rounded-full capitalize",
          getDriveStatusColor(status),
        )}
      >
        {STATUS_LABELS[status] || status}
      </span>

      {allowedTransitions.map(({ status: nextStatus }) => (
        <Button
          key={nextStatus}
          size="sm"
          variant={nextStatus === "completed" ? "destructive" : "outline"}
          onClick={() => setConfirm({ open: true, status: nextStatus })}
          className="gap-1"
        >
          {TRANSITION_LABELS[nextStatus] || nextStatus}
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      ))}

      <ConfirmDialog
        open={confirm.open}
        onClose={() => setConfirm({ open: false, status: null })}
        onConfirm={() => mutation.mutate(confirm.status)}
        loading={mutation.isPending}
        title={`${TRANSITION_LABELS[confirm.status] || "Update Status"}?`}
        description={TRANSITION_DESCRIPTIONS[confirm.status] || ""}
        confirmLabel={TRANSITION_LABELS[confirm.status] || "Confirm"}
        variant={confirm.status === "completed" ? "destructive" : "default"}
      />
    </div>
  );
}
