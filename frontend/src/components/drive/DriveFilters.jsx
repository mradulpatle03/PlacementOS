import { X, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const BRANCHES = ["CSE", "IT", "ECE", "EEE", "ME", "CE", "Other"];
const MODES = ["oncampus", "offcampus", "hybrid"];
const STATUSES = ["draft", "published", "open", "closed", "completed"];

export default function DriveFilters({
  filters,
  setFilter,
  clearFilters,
  hasActiveFilters,
  role,
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <SlidersHorizontal className="h-4 w-4" />
          Filters
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-7 text-xs"
          >
            <X className="h-3 w-3 mr-1" /> Clear all
          </Button>
        )}
      </div>

      {/* status — only for non-students */}
      {role !== "student" && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">
            Status
          </Label>
          <div className="flex flex-col gap-1">
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() =>
                  setFilter("status", filters.status === s ? "" : s)
                }
                className={cn(
                  "text-left text-sm px-3 py-1.5 rounded-md transition-colors capitalize",
                  filters.status === s
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted",
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <Separator />

      {/* mode */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">
          Mode
        </Label>
        <div className="flex flex-col gap-1">
          {MODES.map((m) => (
            <button
              key={m}
              onClick={() => setFilter("mode", filters.mode === m ? "" : m)}
              className={cn(
                "text-left text-sm px-3 py-1.5 rounded-md transition-colors capitalize",
                filters.mode === m
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted",
              )}
            >
              {m === "oncampus"
                ? "On Campus"
                : m === "offcampus"
                  ? "Off Campus"
                  : "Hybrid"}
            </button>
          ))}
        </div>
      </div>

      <Separator />

      {/* branch */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">
          Branch
        </Label>
        <Select
          value={filters.branch}
          onValueChange={(v) => setFilter("branch", v === "all" ? "" : v)}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="All branches" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All branches</SelectItem>
            {BRANCHES.map((b) => (
              <SelectItem key={b} value={b}>
                {b}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* CTC range */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">
          CTC Range (LPA)
        </Label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Input
              type="number"
              placeholder="Min"
              value={filters.minCTC}
              onChange={(e) => setFilter("minCTC", e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Input
              type="number"
              placeholder="Max"
              value={filters.maxCTC}
              onChange={(e) => setFilter("maxCTC", e.target.value)}
              className="h-8 text-sm"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* sort */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">
          Sort By
        </Label>
        <Select
          value={`${filters.sortBy}:${filters.sortOrder}`}
          onValueChange={(v) => {
            const [field, order] = v.split(":");
            setFilter("sortBy", field);
            setFilter("sortOrder", order);
          }}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt:desc">Newest first</SelectItem>
            <SelectItem value="createdAt:asc">Oldest first</SelectItem>
            <SelectItem value="applicationDeadline:asc">
              Deadline (earliest)
            </SelectItem>
            <SelectItem value="applicationDeadline:desc">
              Deadline (latest)
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
