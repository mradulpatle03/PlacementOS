import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Download,
  FileSpreadsheet,
  Trophy,
  Users,
  Clock,
  TrendingUp,
  Loader2,
} from "lucide-react";

import { assessmentAPI } from "@/api/assessment.api";
import { downloadFile, MIME } from "@/utils/downloadFile";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import EmptyState from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// score badge colour
const scoreBg = (pct) => {
  if (pct >= 80)
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
  if (pct >= 50)
    return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300";
  if (pct >= 30)
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
  return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
};

const statusBadge = (status) => {
  if (status === "graded")
    return (
      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-0 text-[11px]">
        Graded
      </Badge>
    );
  if (status === "submitted")
    return (
      <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-0 text-[11px]">
        Submitted
      </Badge>
    );
  if (status === "in_progress")
    return (
      <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-0 text-[11px]">
        In Progress
      </Badge>
    );
  return (
    <Badge variant="outline" className="text-[11px]">
      {status}
    </Badge>
  );
};

export default function AssessmentSubmissions() {
  const { assessmentId } = useParams();
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);

  // stats + leaderboard
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["assessment-stats", assessmentId],
    queryFn: () =>
      assessmentAPI
        .getStats(assessmentId, { topN: 100 })
        .then((r) => r.data.data),
  });

  // all submissions
  const { data: subData, isLoading: subLoading } = useQuery({
    queryKey: ["assessment-submissions", assessmentId],
    queryFn: () =>
      assessmentAPI.getSubmissions(assessmentId).then((r) => r.data.data),
  });

  const isLoading = statsLoading || subLoading;
  const assessment = statsData?.assessment;
  const stats = statsData?.stats;
  const dist = statsData?.distribution;
  const submissions = subData?.submissions || [];

  // export
  const handleExport = async (format) => {
    setExporting(true);
    try {
      const res = await assessmentAPI.exportResults(assessmentId, format);
      const safeTitle = (assessment?.title || "OA").replace(
        /[^a-zA-Z0-9_-]/g,
        "_",
      );
      downloadFile(
        res.data,
        `OA_${safeTitle}.${format}`,
        format === "xlsx" ? MIME.xlsx : MIME.csv,
      );
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch {
      toast.error("Export failed. Try again.");
    } finally {
      setExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        title={assessment?.title || "Assessment Results"}
        subtitle={`${assessment?.totalQuestions} questions · ${assessment?.totalMarks} marks · ${assessment?.durationMinutes} min`}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(-1)}
              className="gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  disabled={exporting || submissions.length === 0}
                >
                  {exporting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => handleExport("xlsx")}
                  className="gap-2"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Excel
                  (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleExport("csv")}
                  className="gap-2"
                >
                  <FileSpreadsheet className="w-4 h-4 text-blue-500" /> CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      {/* Stat cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Appeared" value={stats.totalAppeared} icon={Users} />
          <StatCard
            title="Submitted"
            value={stats.totalSubmitted}
            icon={TrendingUp}
          />
          <StatCard
            title="Avg Score"
            value={`${stats.avgScore}%`}
            icon={Trophy}
          />
          <StatCard
            title="Pass Rate"
            value={`${stats.passRate}%`}
            icon={Clock}
            trend={
              stats.passRate >= 50
                ? { label: `≥${stats.passMark}% to pass`, positive: true }
                : { label: `≥${stats.passMark}% to pass`, positive: false }
            }
          />
        </div>
      )}

      {/* Score distribution */}
      {dist && (
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm font-semibold mb-4">Score Distribution</p>
            <div className="flex items-end gap-2 h-24">
              {Object.entries(dist).map(([range, count]) => {
                const maxVal = Math.max(...Object.values(dist), 1);
                const height = Math.max((count / maxVal) * 100, 4);
                return (
                  <div
                    key={range}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <span className="text-xs font-medium text-foreground">
                      {count}
                    </span>
                    <div
                      className="w-full rounded-t-md bg-primary/70 transition-all"
                      style={{ height: `${height}%` }}
                    />
                    <span className="text-[10px] text-muted-foreground">
                      {range}%
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submissions table */}
      <Card>
        <CardContent className="pt-5">
          <p className="text-sm font-semibold mb-4">
            All Submissions
            <span className="ml-2 font-normal text-muted-foreground text-xs">
              ({submissions.length})
            </span>
          </p>

          {submissions.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No submissions yet"
              description="Students haven't submitted this assessment yet."
            />
          ) : (
            <div className="space-y-2">
              {/* header row */}
              <div className="grid grid-cols-12 gap-2 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide border-b">
                <div className="col-span-1">#</div>
                <div className="col-span-3">Student</div>
                <div className="col-span-2">Branch / CGPA</div>
                <div className="col-span-2 text-right">Score</div>
                <div className="col-span-1 text-right">Time</div>
                <div className="col-span-1 text-center">Violations</div>
                <div className="col-span-1 text-center">Auto</div>
                <div className="col-span-1 text-center">Status</div>
              </div>

              {submissions.map((sub, idx) => {
                const student = sub.student;
                const user = student?.user;
                const timeMins = sub.timeTakenSeconds
                  ? Math.round(sub.timeTakenSeconds / 60)
                  : null;

                return (
                  <div
                    key={sub._id}
                    className="grid grid-cols-12 gap-2 px-3 py-2.5 rounded-lg hover:bg-muted/40 transition-colors items-center text-sm"
                  >
                    {/* rank */}
                    <div className="col-span-1 text-xs font-bold text-muted-foreground">
                      {idx + 1}
                    </div>

                    {/* name + email */}
                    <div className="col-span-3 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {user?.name || "—"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {student?.rollNumber || user?.email || "—"}
                      </p>
                    </div>

                    {/* branch + cgpa */}
                    <div className="col-span-2 text-xs text-muted-foreground">
                      <p>{student?.branch || "—"}</p>
                      <p>CGPA {student?.cgpa ?? "—"}</p>
                    </div>

                    {/* score */}
                    <div className="col-span-2 text-right">
                      {sub.status === "graded" ? (
                        <div className="flex flex-col items-end gap-0.5">
                          <span
                            className={cn(
                              "text-xs font-semibold px-2 py-0.5 rounded-full",
                              scoreBg(sub.percentageScore),
                            )}
                          >
                            {sub.percentageScore}%
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {sub.totalMarksAwarded}/{sub.totalMarksPossible}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Pending
                        </span>
                      )}
                    </div>

                    {/* time */}
                    <div className="col-span-1 text-right text-xs text-muted-foreground">
                      {timeMins !== null ? `${timeMins}m` : "—"}
                    </div>

                    {/* violations */}
                    <div className="col-span-1 text-center">
                      {sub.violationCount > 0 ? (
                        <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                          {sub.violationCount}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">0</span>
                      )}
                    </div>

                    {/* auto-submitted */}
                    <div className="col-span-1 text-center">
                      {sub.autoSubmitted ? (
                        <span className="text-xs text-red-500">Yes</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>

                    {/* status */}
                    <div className="col-span-1 text-center">
                      {statusBadge(sub.status)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
