import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const BRANCHES = ["CSE", "IT", "ECE", "EEE", "ME", "CE", "Other"];
const PLACEMENT_STATUSES = [
  { key: "unplaced", label: "Unplaced" },
  { key: "placed", label: "Placed" },
  { key: "dream_placed", label: "Dream Placed" },
];

export default function PipelineFilterPanel({
  open,
  onClose,
  filters,
  setFilter,
  clearFilters,
  hasActiveFilters,
  visibleCount,
  totalCount,
}) {
  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-80 flex flex-col gap-0 p-0">
        {/* header */}
        <SheetHeader className="px-5 py-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              <SheetTitle className="text-base">Filter Pipeline</SheetTitle>
            </div>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-7 text-xs text-muted-foreground"
              >
                <X className="h-3 w-3 mr-1" />
                Clear all
              </Button>
            )}
          </div>
          <SheetDescription className="text-xs">
            Showing{" "}
            <span className="font-medium text-foreground">{visibleCount}</span>{" "}
            of <span className="font-medium text-foreground">{totalCount}</span>{" "}
            candidates
          </SheetDescription>
        </SheetHeader>

        {/* scrollable filter body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Branch */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">
              Branch
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {BRANCHES.map((b) => (
                <button
                  key={b}
                  onClick={() =>
                    setFilter("branch", filters.branch === b ? "" : b)
                  }
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
                    filters.branch === b
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border hover:bg-muted",
                  )}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* CGPA Range */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">
              CGPA Range
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Min</Label>
                <Input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  placeholder="0.0"
                  value={filters.minCGPA}
                  onChange={(e) => setFilter("minCGPA", e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Max</Label>
                <Input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  placeholder="10.0"
                  value={filters.maxCGPA}
                  onChange={(e) => setFilter("maxCGPA", e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </div>
            {/* visual indicator */}
            {(filters.minCGPA !== "" || filters.maxCGPA !== "") && (
              <p className="text-xs text-primary">
                {filters.minCGPA || "0"} – {filters.maxCGPA || "10"} CGPA
              </p>
            )}
          </div>

          <Separator />

          {/* Resume Score */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">
              Min Resume Score
            </Label>
            <Input
              type="number"
              min="0"
              max="100"
              placeholder="e.g. 60"
              value={filters.minScore}
              onChange={(e) => setFilter("minScore", e.target.value)}
              className="h-8 text-sm"
            />
            {filters.minScore !== "" && (
              <p className="text-xs text-primary">Score ≥ {filters.minScore}</p>
            )}
          </div>

          <Separator />

          {/* Placement Status */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">
              Placement Status
            </Label>
            <div className="flex flex-col gap-1">
              {PLACEMENT_STATUSES.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() =>
                    setFilter(
                      "placementStatus",
                      filters.placementStatus === key ? "" : key,
                    )
                  }
                  className={cn(
                    "text-left text-sm px-3 py-1.5 rounded-md transition-colors",
                    filters.placementStatus === key
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* footer — apply / close */}
        <div className="border-t px-5 py-3 flex gap-2">
          {hasActiveFilters && (
            <Button variant="outline" className="flex-1" onClick={clearFilters}>
              Reset
            </Button>
          )}
          <Button className="flex-1" onClick={onClose}>
            Done
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
