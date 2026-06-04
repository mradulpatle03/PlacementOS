import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import KanbanCard from "./KanbanCard";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, FileText } from "lucide-react";

// stage colour accents — top border
const stageColors = {
  applied: "border-t-slate-400",
  shortlisted: "border-t-blue-500",
  oa: "border-t-violet-500",
  interview_1: "border-t-amber-500",
  interview_2: "border-t-orange-500",
  hr: "border-t-pink-500",
  offered: "border-t-green-500",
  accepted: "border-t-emerald-600",
  rejected: "border-t-red-500",
};

export default function KanbanColumn({
  stage,
  label,
  applications = [],
  selectedIds,
  onSelect,
  onCardClick,
  onExport, // (stage, format) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const cardIds = applications.map((a) => a._id);

  return (
    <div className="flex flex-col w-64 shrink-0">
      {/* column header */}
      <div
        className={cn(
          "rounded-t-lg border border-b-0 bg-muted/50 px-3 py-2.5",
          "border-t-4",
          stageColors[stage] || "border-t-slate-300",
        )}
      >
        <div className="flex items-center justify-between gap-2">
          {/* stage name + count */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-semibold truncate">{label}</span>
            <span className="shrink-0 rounded-full bg-background border px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
              {applications.length}
            </span>
          </div>

          {/* export dropdown — only shown when column has cards */}
          {applications.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 shrink-0"
                  title={`Export ${label}`}
                >
                  <Download className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel className="text-xs">
                  Export {label} ({applications.length})
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onExport?.(stage, "xlsx")}
                  className="gap-2 text-xs cursor-pointer"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-green-600" />
                  Download as Excel
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onExport?.(stage, "csv")}
                  className="gap-2 text-xs cursor-pointer"
                >
                  <FileText className="h-3.5 w-3.5 text-blue-600" />
                  Download as CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* droppable card list */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 min-h-30 rounded-b-lg border bg-muted/20 p-2 space-y-2",
          "transition-colors duration-150",
          isOver && "bg-primary/5 border-primary/30",
        )}
      >
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {applications.length === 0 ? (
            <div className="flex items-center justify-center h-20 text-xs text-muted-foreground/50 select-none">
              Drop here
            </div>
          ) : (
            applications.map((app) => (
              <KanbanCard
                key={app._id}
                application={app}
                isSelected={selectedIds?.has(app._id)}
                onSelect={onSelect}
                onClick={onCardClick}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
}
