import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ChevronDown,
  GraduationCap,
  TrendingUp,
  Users,
  FileText,
} from "lucide-react";
import { useBranchAnalytics } from "@/hooks/useAnalytics";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import FunnelChart from "@/components/analytics/FunnelChart";
import PlacementDonut from "@/components/analytics/PlacementDonut";
import { cn } from "@/lib/utils";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [
  "all",
  ...Array.from({ length: 4 }, (_, i) => String(CURRENT_YEAR - i)),
];
const BRANCHES = ["CSE", "IT", "ECE", "EEE", "ME", "CE"];

function SectionSkeleton({ rows = 4 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-8 rounded-lg" />
      ))}
    </div>
  );
}

// application funnel from status counts
const FUNNEL_ORDER = [
  { key: "applied", label: "Applied" },
  { key: "shortlisted", label: "Shortlisted" },
  { key: "oa", label: "Online Assessment" },
  { key: "interview_1", label: "Interview" },
  { key: "offered", label: "Offered" },
  { key: "accepted", label: "Accepted" },
];

const STAGE_COLORS = {
  applied: "#6366f1",
  shortlisted: "#8b5cf6",
  oa: "#a78bfa",
  interview_1: "#f59e0b",
  offered: "#10b981",
  accepted: "#059669",
};

function ApplicationFunnelFromCounts({ funnel }) {
  if (!funnel || Object.keys(funnel).length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No application data
      </p>
    );
  }

  // build ordered stages from raw status counts
  const total = Object.values(funnel).reduce((s, v) => s + v, 0);
  const maxCount = Math.max(...FUNNEL_ORDER.map((s) => funnel[s.key] || 0), 1);

  return (
    <div className="space-y-3">
      {FUNNEL_ORDER.map((stage) => {
        const count = funnel[stage.key] || 0;
        const pct =
          maxCount > 0
            ? Math.max(count > 0 ? 6 : 0, Math.round((count / maxCount) * 100))
            : 0;
        const ofTotal =
          total > 0 ? Math.round((count / total) * 100 * 10) / 10 : 0;
        return (
          <div key={stage.key} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground w-40 truncate">
                {stage.label}
              </span>
              <div className="flex items-center gap-2">
                <span className="font-semibold tabular-nums">
                  {count.toLocaleString()}
                </span>
                <span className="text-muted-foreground text-[11px] w-20 text-right">
                  {ofTotal}% of total
                </span>
              </div>
            </div>
            <div className="h-6 bg-muted rounded-md overflow-hidden">
              <div
                className="h-full rounded-md transition-all duration-700"
                style={{
                  width: `${pct}%`,
                  background: STAGE_COLORS[stage.key] || "#6366f1",
                }}
              />
            </div>
          </div>
        );
      })}

      {/* other statuses */}
      {(funnel.withdrawn || funnel.rejected) > 0 && (
        <div className="flex items-center gap-4 pt-2 text-xs text-muted-foreground border-t">
          {funnel.withdrawn > 0 && <span>Withdrawn: {funnel.withdrawn}</span>}
          {funnel.rejected > 0 && <span>Rejected: {funnel.rejected}</span>}
        </div>
      )}
    </div>
  );
}

export default function BranchAnalytics() {
  const { branch } = useParams();
  const navigate = useNavigate();
  const [year, setYear] = useState("all");

  const { data, isLoading } = useBranchAnalytics(branch, year);

  const overview = data?.overview || {};
  const packages = data?.packages || {};
  const funnel = data?.applicationFunnel || {};

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${branch} Branch Analytics`}
        subtitle="Placement breakdown for this branch"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/analytics")}
              className="gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>

            {/* branch switcher */}
            <div className="relative">
              <select
                value={branch}
                onChange={(e) =>
                  navigate(`/analytics/branch/${e.target.value}`)
                }
                className="h-9 rounded-lg border bg-background px-3 pr-8 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {BRANCHES.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>

            {/* year filter */}
            <div className="relative">
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="h-9 rounded-lg border bg-background px-3 pr-8 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y === "all" ? "All Years" : y}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        }
      />

      {/* stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          title="Total Students"
          value={isLoading ? "…" : (overview.total || 0).toLocaleString()}
          icon={Users}
        />
        <StatCard
          title="Placed"
          value={isLoading ? "…" : (overview.placed || 0).toLocaleString()}
          icon={GraduationCap}
          trend={
            overview.placementPercent
              ? { label: `${overview.placementPercent}% rate`, positive: true }
              : undefined
          }
        />
        <StatCard
          title="Dream Placed"
          value={isLoading ? "…" : (overview.dreamPlaced || 0).toLocaleString()}
          icon={TrendingUp}
        />
        <StatCard
          title="Avg CGPA"
          value={isLoading ? "…" : (overview.avgCGPA || 0).toFixed(2)}
          icon={FileText}
        />
      </div>

      {/* donut + packages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">
              Placement Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Skeleton className="w-32 h-32 rounded-full" />
              </div>
            ) : (
              <PlacementDonut
                placed={overview.placed || 0}
                dreamPlaced={overview.dreamPlaced || 0}
                total={overview.total || 0}
                size={140}
                className="py-2"
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">
              Package Range
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <SectionSkeleton rows={2} />
            ) : packages.max > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    label: "Highest",
                    value: packages.max,
                    color: "text-emerald-600",
                  },
                  {
                    label: "Average",
                    value: packages.average,
                    color: "text-blue-600",
                  },
                  {
                    label: "Median",
                    value: packages.median,
                    color: "text-indigo-600",
                  },
                  {
                    label: "Lowest",
                    value: packages.min,
                    color: "text-muted-foreground",
                  },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="bg-muted/40 rounded-xl px-4 py-3 text-center"
                  >
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">
                      {s.label}
                    </p>
                    <p className={cn("text-xl font-bold mt-1", s.color)}>
                      ₹{s.value}
                      <span className="text-xs font-normal text-muted-foreground ml-0.5">
                        LPA
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No accepted offers yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* application funnel */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            Application Funnel — {branch}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <SectionSkeleton rows={6} />
          ) : (
            <ApplicationFunnelFromCounts funnel={funnel} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
