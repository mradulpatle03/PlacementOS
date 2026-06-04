import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { pipelineAPI } from "@/api/pipeline.api";
import Modal from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  User,
  Mail,
  BookOpen,
  Loader2,
  History,
  XCircle,
  ArrowRight,
  Download,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import StageHistoryModal from "./StageHistoryModal";
import RejectModal from "./RejectModal";

const FORWARD_STAGES = [
  { key: "shortlisted", label: "Shortlisted" },
  { key: "oa", label: "Online Assessment" },
  { key: "interview_1", label: "Interview Round 1" },
  { key: "interview_2", label: "Interview Round 2" },
  { key: "hr", label: "HR Round" },
  { key: "offered", label: "Offered" },
  { key: "accepted", label: "Accepted" },
];

const TERMINAL_STAGES = ["accepted", "rejected", "withdrawn"];

const branchColors = {
  CSE: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  IT: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  ECE: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  EEE: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  ME: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  CE: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
};

export default function CardDetailModal({
  open,
  onClose,
  application,
  driveId,
  onExport, // (stage, format) => void — passed from PipelineBoard
}) {
  const [targetStage, setTargetStage] = useState("");
  const [note, setNote] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const queryClient = useQueryClient();

  const student = application?.student;
  const user = student?.user;
  const resume = application?.resume;
  const isTerminal = TERMINAL_STAGES.includes(application?.status);

  const { mutate: doMove, isPending } = useMutation({
    mutationFn: () => pipelineAPI.moveStage(application._id, targetStage, note),
    onSuccess: () => {
      toast.success(
        `Moved to ${FORWARD_STAGES.find((s) => s.key === targetStage)?.label}`,
      );
      queryClient.invalidateQueries({ queryKey: ["pipeline", driveId] });
      setTargetStage("");
      setNote("");
      onClose();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Move failed");
    },
  });

  if (!application) return null;

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Candidate Details"
        className="sm:max-w-md"
      >
        {/* candidate info card */}
        <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-sm font-semibold">{user?.name || "—"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground">
                {user?.email || "—"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-0.5">
            {student?.branch && (
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10px] font-semibold",
                  branchColors[student.branch] ||
                    "bg-muted text-muted-foreground",
                )}
              >
                {student.branch}
              </span>
            )}
            {student?.rollNumber && (
              <span className="text-xs text-muted-foreground">
                {student.rollNumber}
              </span>
            )}
            {student?.cgpa != null && (
              <div className="flex items-center gap-0.5 text-xs text-muted-foreground">
                <BookOpen className="h-3 w-3" />
                CGPA: {student.cgpa}
              </div>
            )}
            {student?.backlogs != null && (
              <span className="text-xs text-muted-foreground">
                Backlogs: {student.backlogs}
              </span>
            )}
            {student?.graduationYear && (
              <span className="text-xs text-muted-foreground">
                {student.graduationYear}
              </span>
            )}
          </div>

          {resume && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-0.5">
              <span>{resume.label || "Resume"}</span>
              {resume.score != null && (
                <Badge variant="secondary" className="text-[10px]">
                  Score: {resume.score}
                </Badge>
              )}
            </div>
          )}

          {student?.placementStatus === "placed" && (
            <Badge
              variant="outline"
              className="text-[10px] border-amber-400 text-amber-600 dark:text-amber-400"
            >
              Already Placed
            </Badge>
          )}
        </div>

        {/* move stage */}
        {!isTerminal && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Move to Stage</p>
            <Select
              value={targetStage}
              onValueChange={setTargetStage}
              disabled={isPending}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select stage…" />
              </SelectTrigger>
              <SelectContent>
                {FORWARD_STAGES.map(({ key, label }) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Add a note (optional)…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              disabled={isPending}
              className="resize-none text-xs"
            />
            <Button
              className="w-full"
              disabled={!targetStage || isPending}
              onClick={() => doMove()}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4 mr-2" />
              )}
              Move Candidate
            </Button>
          </div>
        )}

        {isTerminal && (
          <div className="rounded-lg bg-muted/50 px-3 py-2.5 text-xs text-muted-foreground text-center">
            This application is in a terminal state (
            <span className="font-medium">{application.status}</span>) and
            cannot be moved further.
          </div>
        )}

        {/* action row */}
        <div className="flex gap-2 flex-wrap pt-1">
          {/* history */}
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => setShowHistory(true)}
          >
            <History className="h-3.5 w-3.5 mr-1.5" />
            View History
          </Button>

          {/* export this candidate's stage — only meaningful when we know the stage */}
          {onExport && application?.status && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex-1">
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuLabel className="text-xs">
                  Export stage
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onExport(application.status, "xlsx")}
                  className="text-xs gap-2 cursor-pointer"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-green-600" />
                  Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onExport(application.status, "csv")}
                  className="text-xs gap-2 cursor-pointer"
                >
                  <FileText className="h-3.5 w-3.5 text-blue-600" />
                  CSV (.csv)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* reject */}
          {!isTerminal && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-destructive hover:text-destructive border-destructive/30 hover:border-destructive/60 hover:bg-destructive/5"
              onClick={() => setShowReject(true)}
            >
              <XCircle className="h-3.5 w-3.5 mr-1.5" />
              Reject
            </Button>
          )}
        </div>
      </Modal>

      {/* nested modals */}
      <StageHistoryModal
        open={showHistory}
        onClose={() => setShowHistory(false)}
        applicationId={application?._id}
        studentName={user?.name}
      />
      <RejectModal
        open={showReject}
        onClose={() => setShowReject(false)}
        applicationId={application?._id}
        studentName={user?.name}
        driveId={driveId}
      />
    </>
  );
}
