import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { pipelineAPI } from "@/api/pipeline.api";
import Modal from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

// Quick-pick reasons — saves TPO typing common reasons
const QUICK_REASONS = [
  "Did not meet minimum CGPA requirement",
  "Did not clear the Online Assessment cutoff",
  "Did not perform well in Technical Interview",
  "Did not meet communication standards in HR round",
  "Position filled — no further openings",
];

export default function RejectModal({
  open,
  onClose,
  applicationId,
  studentName,
  driveId,
}) {
  const [reason, setReason] = useState("");
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: () => pipelineAPI.reject(applicationId, reason),
    onSuccess: () => {
      toast.success(`${studentName || "Candidate"} rejected`);
      queryClient.invalidateQueries({ queryKey: ["pipeline", driveId] });
      handleClose();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Failed to reject candidate");
    },
  });

  const handleClose = () => {
    if (isPending) return;
    setReason("");
    onClose();
  };

  const canSubmit = reason.trim().length >= 5 && !isPending;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Reject Candidate"
      description={
        studentName
          ? `Reject ${studentName} from this drive. This cannot be undone.`
          : "This action cannot be undone."
      }
      className="sm:max-w-md"
    >
      {/* warning */}
      <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-destructive text-xs">
        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
        <span>
          Once rejected, this application is locked. A reason is required and
          will be recorded in the stage history.
        </span>
      </div>

      {/* quick-pick reasons */}
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">
          Quick-pick reason
        </p>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_REASONS.map((r) => (
            <button
              key={r}
              onClick={() => setReason(r)}
              disabled={isPending}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
                reason === r
                  ? "bg-destructive/10 border-destructive/40 text-destructive"
                  : "border-border hover:bg-muted",
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* custom reason textarea */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">
          Rejection Reason <span className="text-destructive">*</span>
        </label>
        <Textarea
          placeholder="Type a custom reason or pick one above…"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          disabled={isPending}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground">
          {reason.trim().length} characters
          {reason.trim().length < 5 && reason.trim().length > 0 && (
            <span className="text-destructive ml-1">(min 5)</span>
          )}
        </p>
      </div>

      {/* actions */}
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" onClick={handleClose} disabled={isPending}>
          Cancel
        </Button>
        <Button
          variant="destructive"
          onClick={() => mutate()}
          disabled={!canSubmit}
        >
          {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Reject Candidate
        </Button>
      </div>
    </Modal>
  );
}

// inline cn since it's a small file
function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}
