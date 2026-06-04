import { useQuery } from "@tanstack/react-query";
import { pipelineAPI } from "@/api/pipeline.api";
import Modal from "@/components/ui/Modal";
import Spinner from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  Clock,
  User,
  MessageSquare,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// colour per stage key
const stageColors = {
  applied: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  shortlisted:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  oa: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  interview_1:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  interview_2:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  hr: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
  offered:
    "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  accepted:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  withdrawn: "bg-muted text-muted-foreground",
};

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function StageHistoryModal({
  open,
  onClose,
  applicationId,
  studentName,
}) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["stage-history", applicationId],
    queryFn: () =>
      pipelineAPI.getHistory(applicationId).then((r) => r.data.data),
    enabled: open && !!applicationId,
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Stage History"
      description={
        studentName ? `Pipeline journey for ${studentName}` : "Pipeline journey"
      }
      className="sm:max-w-lg"
    >
      {/* current stage pill */}
      {data && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Current stage:</span>
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-semibold",
              stageColors[data.currentStage] ||
                "bg-muted text-muted-foreground",
            )}
          >
            {data.currentStageLabel}
          </span>
          {data.stageAtExit && (
            <span className="text-xs text-muted-foreground">
              · exited from{" "}
              <span className="font-medium">{data.stageAtExit}</span>
            </span>
          )}
        </div>
      )}

      {/* loading */}
      {isLoading && <Spinner className="py-8" />}

      {/* error */}
      {isError && (
        <div className="flex items-center gap-2 py-6 text-destructive text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Failed to load stage history.
        </div>
      )}

      {/* timeline */}
      {data && data.history.length === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No stage moves recorded yet.
        </p>
      )}

      {data && data.history.length > 0 && (
        <div className="relative mt-2 space-y-0">
          {/* vertical line */}
          <div className="absolute left-4.5 top-0 bottom-0 w-px bg-border" />

          {data.history.map((entry, index) => (
            <div key={index} className="relative flex gap-3 pb-5 last:pb-0">
              {/* dot */}
              <div
                className={cn(
                  "relative z-10 mt-0.5 h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold ring-2 ring-background",
                  stageColors[entry.stage] || "bg-muted text-muted-foreground",
                )}
              >
                {index + 1}
              </div>

              {/* content */}
              <div className="flex-1 min-w-0 pt-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                      stageColors[entry.stage] ||
                        "bg-muted text-muted-foreground",
                    )}
                  >
                    {entry.stageLabel || entry.stage}
                  </span>
                </div>

                {/* moved by */}
                {entry.movedBy && (
                  <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <User className="h-3 w-3 shrink-0" />
                    <span>
                      {entry.movedBy?.name || "Unknown"}{" "}
                      <span className="text-muted-foreground/60">
                        ({entry.movedBy?.role || "—"})
                      </span>
                    </span>
                  </div>
                )}

                {/* timestamp */}
                <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3 shrink-0" />
                  <span>{formatDate(entry.movedAt)}</span>
                </div>

                {/* note */}
                {entry.note && (
                  <div className="mt-1.5 flex items-start gap-1.5 rounded-md bg-muted/50 px-2.5 py-1.5">
                    <MessageSquare className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground" />
                    <p className="text-xs text-foreground">{entry.note}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* remarks */}
      {data?.remarks && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 mt-2">
          <p className="text-xs font-medium text-destructive mb-0.5">
            Rejection Reason
          </p>
          <p className="text-xs text-foreground">{data.remarks}</p>
        </div>
      )}
    </Modal>
  );
}
