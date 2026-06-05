import { useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  RefreshCw,
  Users,
  Download,
  FileSpreadsheet,
  FileText,
} from "lucide-react";

import { pipelineAPI } from "@/api/pipeline.api";
import { usePipelineFilters } from "@/hooks/usePipelineFilters";
import { usePipelineSocket } from "@/hooks/usePipelineSocket";
import KanbanColumn from "@/components/pipeline/KanbanColumn";
import KanbanCard from "@/components/pipeline/KanbanCard";
import CardDetailModal from "@/components/pipeline/CardDetailModal";
import BulkMoveModal from "@/components/pipeline/BulkMoveModal";
import PipelineFilterPanel from "@/components/pipeline/PipelineFilterPanel";
import PipelineSearchBar from "@/components/pipeline/PipelineSearchBar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

const STAGES = [
  { key: "applied", label: "Applied" },
  { key: "shortlisted", label: "Shortlisted" },
  { key: "oa", label: "Online Assessment" },
  { key: "interview_1", label: "Interview 1" },
  { key: "interview_2", label: "Interview 2" },
  { key: "hr", label: "HR Round" },
  { key: "offered", label: "Offered" },
  { key: "accepted", label: "Accepted" },
  { key: "rejected", label: "Rejected" },
];

export default function PipelineBoard() {
  const { driveId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [rawPipeline, setRawPipeline] = useState(null);
  const [activeApp, setActiveApp] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [detailApp, setDetailApp] = useState(null);
  const [showBulkMove, setShowBulkMove] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // filters
  const {
    filters,
    setFilter,
    clearFilters,
    hasActiveFilters,
    filteredPipeline,
    visibleCount,
  } = usePipelineFilters(rawPipeline);

  const totalCount = useMemo(() => {
    if (!rawPipeline) return 0;
    return Object.values(rawPipeline).reduce((s, a) => s + a.length, 0);
  }, [rawPipeline]);

  const activeFilterCount = [
    filters.branch,
    filters.minCGPA,
    filters.maxCGPA,
    filters.minScore,
    filters.placementStatus,
  ].filter(Boolean).length;

  // fetch
  const { isLoading, isError, refetch } = useQuery({
    queryKey: ["pipeline", driveId],
    queryFn: () => pipelineAPI.getByDrive(driveId).then((r) => r.data.data),
    enabled: !!driveId,
    onSuccess: (data) => setRawPipeline(data.pipeline),
  });

  usePipelineSocket(driveId);

  // single move
  const { mutate: moveStage } = useMutation({
    mutationFn: ({ applicationId, targetStage }) =>
      pipelineAPI.moveStage(applicationId, targetStage),
    onSuccess: (_, vars) => {
      toast.success(
        `Moved to ${STAGES.find((s) => s.key === vars.targetStage)?.label}`,
      );
      queryClient.invalidateQueries({ queryKey: ["pipeline", driveId] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Failed to move candidate");
      refetch();
    },
  });

  // dnd
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const findStageOfApp = useCallback(
    (appId) => {
      if (!rawPipeline) return null;
      for (const stage of Object.keys(rawPipeline)) {
        if (rawPipeline[stage]?.some((a) => a._id === appId)) return stage;
      }
      return null;
    },
    [rawPipeline],
  );

  const handleDragStart = ({ active }) => {
    const stage = findStageOfApp(active.id);
    if (!stage) return;
    setActiveApp(rawPipeline[stage]?.find((a) => a._id === active.id) || null);
  };

  const handleDragOver = ({ active, over }) => {
    if (!over || !rawPipeline) return;
    const src = findStageOfApp(active.id);
    const tgt =
      rawPipeline[over.id] !== undefined ? over.id : findStageOfApp(over.id);
    if (!src || !tgt || src === tgt) return;
    setRawPipeline((prev) => {
      const next = { ...prev };
      const app = next[src]?.find((a) => a._id === active.id);
      if (!app) return prev;
      next[src] = next[src].filter((a) => a._id !== active.id);
      if (!next[tgt].some((a) => a._id === active.id)) {
        next[tgt] = [app, ...next[tgt]];
      }
      return next;
    });
  };

  const handleDragEnd = ({ active, over }) => {
    setActiveApp(null);
    if (!over || !rawPipeline) return;
    const src = findStageOfApp(active.id);
    const tgt =
      rawPipeline[over.id] !== undefined ? over.id : findStageOfApp(over.id);
    if (!src || !tgt || src === tgt) return;
    moveStage({ applicationId: active.id, targetStage: tgt });
  };

  // bulk select
  const handleSelect = useCallback((appId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(appId) ? next.delete(appId) : next.add(appId);
      return next;
    });
  }, []);

  const clearSelection = () => setSelectedIds(new Set());

  // export
  // format: 'xlsx' | 'csv'
  const handleExport = useCallback(
    (stage, format = "xlsx") => {
      const url = pipelineAPI.exportStageUrl(driveId, stage || null, format);
      window.open(url, "_blank");
    },
    [driveId],
  );

  // states
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading pipeline…</p>
      </div>
    );
  }

  if (isError || !rawPipeline) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="text-sm text-muted-foreground">
          Failed to load pipeline data.
        </p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" /> Retry
        </Button>
      </div>
    );
  }

  const displayPipeline = filteredPipeline || rawPipeline;

  return (
    <div className="flex flex-col h-full">
      {/* header */}
      <div className="border-b bg-background shrink-0">
        {/* top row */}
        <div className="flex items-center justify-between gap-4 px-6 py-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/tpo/drives/${driveId}/interviews`)}
              className="gap-1.5"
            >
              <Calendar className="w-4 h-4" />
              Interviews
            </Button>
            <div>
              <h1 className="text-xl font-bold">Recruitment Pipeline</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {hasActiveFilters
                  ? `${visibleCount} of ${totalCount} candidates`
                  : `${totalCount} total candidates`}
                {selectedIds.size > 0 && (
                  <span className="ml-2 text-primary font-medium">
                    · {selectedIds.size} selected
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* bulk move */}
            {selectedIds.size > 0 && (
              <>
                <Button size="sm" onClick={() => setShowBulkMove(true)}>
                  <Users className="h-4 w-4 mr-1.5" />
                  Move {selectedIds.size} Selected
                </Button>
                <Button variant="outline" size="sm" onClick={clearSelection}>
                  Clear
                </Button>
              </>
            )}

            {/* export all dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-1.5" />
                  Export All
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel className="text-xs">
                  All stages ({totalCount})
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleExport(null, "xlsx")}
                  className="text-xs gap-2 cursor-pointer"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-green-600" />
                  Download as Excel
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleExport(null, "csv")}
                  className="text-xs gap-2 cursor-pointer"
                >
                  <FileText className="h-3.5 w-3.5 text-blue-600" />
                  Download as CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-1.5" />
              Refresh
            </Button>
          </div>
        </div>

        {/* search + filter bar */}
        <div className="flex items-center gap-3 px-6 pb-3 flex-wrap">
          <PipelineSearchBar
            search={filters.search}
            onSearchChange={(v) => setFilter("search", v)}
            onClearSearch={() => setFilter("search", "")}
            onOpenFilters={() => setShowFilters(true)}
            hasActiveFilters={hasActiveFilters}
            activeFilterCount={activeFilterCount}
          />

          {/* active filter pills */}
          {hasActiveFilters && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {filters.branch && (
                <FilterPill
                  label={`Branch: ${filters.branch}`}
                  onRemove={() => setFilter("branch", "")}
                />
              )}
              {(filters.minCGPA || filters.maxCGPA) && (
                <FilterPill
                  label={`CGPA: ${filters.minCGPA || "0"}–${filters.maxCGPA || "10"}`}
                  onRemove={() => {
                    setFilter("minCGPA", "");
                    setFilter("maxCGPA", "");
                  }}
                />
              )}
              {filters.minScore && (
                <FilterPill
                  label={`Score ≥ ${filters.minScore}`}
                  onRemove={() => setFilter("minScore", "")}
                />
              )}
              {filters.placementStatus && (
                <FilterPill
                  label={`Status: ${filters.placementStatus}`}
                  onRemove={() => setFilter("placementStatus", "")}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* kanban */}
      <div className="flex-1 overflow-x-auto overflow-y-auto">
        <div className="flex gap-4 p-6 min-w-max">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            {STAGES.map(({ key, label }) => (
              <KanbanColumn
                key={key}
                stage={key}
                label={label}
                applications={displayPipeline[key] || []}
                selectedIds={selectedIds}
                onSelect={handleSelect}
                onCardClick={(app) => setDetailApp(app)}
                onExport={handleExport}
              />
            ))}

            <DragOverlay>
              {activeApp ? (
                <div className="rotate-2 opacity-90">
                  <KanbanCard
                    application={activeApp}
                    isSelected={false}
                    onSelect={() => {}}
                    onClick={() => {}}
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      </div>

      {/* modals */}
      <CardDetailModal
        open={!!detailApp}
        onClose={() => setDetailApp(null)}
        application={detailApp}
        driveId={driveId}
        onExport={handleExport}
      />

      <BulkMoveModal
        open={showBulkMove}
        onClose={() => setShowBulkMove(false)}
        selectedIds={selectedIds}
        driveId={driveId}
        onSuccess={clearSelection}
      />

      <PipelineFilterPanel
        open={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        setFilter={setFilter}
        clearFilters={clearFilters}
        hasActiveFilters={hasActiveFilters}
        visibleCount={visibleCount}
        totalCount={totalCount}
      />
    </div>
  );
}

// filter pill
function FilterPill({ label, onRemove }) {
  const { X } = require("lucide-react"); // inline to avoid extra import
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-medium">
      {label}
      <button onClick={onRemove} className="hover:text-primary/70 ml-0.5">
        <svg
          className="h-3 w-3"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </span>
  );
}
