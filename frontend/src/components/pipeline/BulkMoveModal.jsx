import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { pipelineAPI } from "@/api/pipeline.api";
import Modal from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Users } from "lucide-react";
import { toast } from "sonner";

// must stay in sync with backend PIPELINE_STAGES
const MOVABLE_STAGES = [
  { key: "shortlisted", label: "Shortlisted" },
  { key: "oa", label: "Online Assessment" },
  { key: "interview_1", label: "Interview Round 1" },
  { key: "interview_2", label: "Interview Round 2" },
  { key: "hr", label: "HR Round" },
  { key: "offered", label: "Offered" },
  { key: "accepted", label: "Accepted" },
  { key: "rejected", label: "Rejected" },
];

export default function BulkMoveModal({
  open,
  onClose,
  selectedIds,
  driveId,
  onSuccess,
}) {
  const [targetStage, setTargetStage] = useState("");
  const [note, setNote] = useState("");
  const queryClient = useQueryClient();
  const count = selectedIds?.size || 0;

  const { mutate, isPending } = useMutation({
    mutationFn: () => pipelineAPI.bulkMove(selectedIds, targetStage, note),
    onSuccess: (res) => {
      const { movedCount, skippedCount } = res.data.data;
      if (movedCount > 0) {
        toast.success(
          `${movedCount} candidate${movedCount > 1 ? "s" : ""} moved`,
        );
      }
      if (skippedCount > 0) {
        toast.warning(
          `${skippedCount} candidate${skippedCount > 1 ? "s" : ""} skipped (invalid transition)`,
        );
      }
      queryClient.invalidateQueries({ queryKey: ["pipeline", driveId] });
      onSuccess?.();
      handleClose();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Bulk move failed");
    },
  });

  const handleClose = () => {
    if (isPending) return;
    setTargetStage("");
    setNote("");
    onClose();
  };

  const canSubmit = targetStage && count > 0 && !isPending;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Bulk Move Candidates"
      description={`Move ${count} selected candidate${count !== 1 ? "s" : ""} to a new stage`}
      className="sm:max-w-md"
    >
      {/* selected count banner */}
      <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2.5 text-primary text-sm font-medium">
        <Users className="h-4 w-4 shrink-0" />
        {count} candidate{count !== 1 ? "s" : ""} selected
      </div>

      {/* target stage select */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">
          Move to Stage <span className="text-destructive">*</span>
        </label>
        <Select
          value={targetStage}
          onValueChange={setTargetStage}
          disabled={isPending}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select target stage…" />
          </SelectTrigger>
          <SelectContent>
            {MOVABLE_STAGES.map(({ key, label }) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Candidates already at this stage will be skipped automatically.
        </p>
      </div>

      {/* optional note */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">
          Note{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <Textarea
          placeholder="e.g. Cleared technical round — moving to HR..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          disabled={isPending}
          className="resize-none"
        />
      </div>

      {/* footer */}
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" onClick={handleClose} disabled={isPending}>
          Cancel
        </Button>
        <Button onClick={() => mutate()} disabled={!canSubmit}>
          {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Move {count} Candidate{count !== 1 ? "s" : ""}
        </Button>
      </div>
    </Modal>
  );
}
