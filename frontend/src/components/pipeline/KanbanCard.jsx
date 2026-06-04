import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@/components/ui/badge";
import { GripVertical, User, BookOpen, Star } from "lucide-react";
import { cn } from "@/lib/utils";

const branchColors = {
  CSE: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  IT: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  ECE: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  EEE: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  ME: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  CE: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
};

export default function KanbanCard({
  application,
  isSelected,
  onSelect,
  onClick,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: application._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const student = application.student;
  const user = student?.user;
  const resume = application.resume;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative rounded-lg border bg-card p-3 shadow-sm cursor-pointer",
        "hover:shadow-md transition-all duration-150",
        isDragging && "opacity-40 shadow-lg ring-2 ring-primary",
        isSelected && "ring-2 ring-primary bg-primary/5",
      )}
      onClick={() => onClick?.(application)}
    >
      {/* drag handle + checkbox row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              onSelect?.(application._id);
            }}
            onClick={(e) => e.stopPropagation()}
            className="h-3.5 w-3.5 rounded border-muted-foreground accent-primary cursor-pointer"
          />
          <span
            {...attributes}
            {...listeners}
            className="text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-4 w-4" />
          </span>
        </div>

        {resume?.score != null && (
          <div className="flex items-center gap-0.5 text-xs text-amber-600 dark:text-amber-400">
            <Star className="h-3 w-3 fill-current" />
            <span className="font-medium">{resume.score}</span>
          </div>
        )}
      </div>

      {/* student name */}
      <div className="flex items-center gap-1.5 mb-1">
        <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <p className="text-sm font-semibold truncate leading-tight">
          {user?.name || "—"}
        </p>
      </div>

      {/* email */}
      <p className="text-xs text-muted-foreground truncate mb-2">
        {user?.email || "—"}
      </p>

      {/* branch + CGPA + roll */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {student?.branch && (
          <span
            className={cn(
              "rounded px-1.5 py-0.5 text-[10px] font-semibold",
              branchColors[student.branch] || "bg-muted text-muted-foreground",
            )}
          >
            {student.branch}
          </span>
        )}
        {student?.cgpa != null && (
          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
            <BookOpen className="h-2.5 w-2.5" />
            {student.cgpa}
          </span>
        )}
        {student?.rollNumber && (
          <span className="text-[10px] text-muted-foreground truncate">
            {student.rollNumber}
          </span>
        )}
      </div>

      {student?.placementStatus === "placed" && (
        <Badge
          variant="outline"
          className="mt-2 text-[10px] border-amber-400 text-amber-600 dark:text-amber-400"
        >
          Already Placed
        </Badge>
      )}
    </div>
  );
}
