import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  TrendingUp,
  Award,
  BarChart2,
  RefreshCw,
  Loader2,
  ChevronDown,
  IndianRupee,
  Building2,
} from "lucide-react";
import {
  useTPOAnalytics,
  useOverallFunnel,
  useDriveConversionSummary,
  useInvalidateAnalyticsCache,
} from "@/hooks/useAnalytics";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import FunnelChart from "@/components/analytics/FunnelChart";
import BarChart from "@/components/analytics/BarChart";
import PlacementDonut from "@/components/analytics/PlacementDonut";
import { cn } from "@/lib/utils";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [
  "all",
  ...Array.from({ length: 4 }, (_, i) => String(CURRENT_YEAR - i)),
];

const BRANCHES = ["CSE", "IT", "ECE", "EEE", "ME", "CE"];

function YearPicker({ value, onChange }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
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
  );
}

function SectionSkeleton({ rows = 4 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-8 rounded-lg" />
      ))}
    </div>
  );
}

function PackageStats({ packages }) {
  if (!packages) return null;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[
        { label: "Highest", value: packages.max, color: "text-emerald-600" },
        { label: "Average", value: packages.average, color: "text-blue-600" },
        { label: "Median", value: packages.median, color: "text-indigo-600" },
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
  );
}

export default function Analytics() {
  const [year, setYear] = useState("all");
  const navigate = useNavigate();

  const { data: tpoData, isLoading: tL } = useTPOAnalytics(year);
  const { data: funnelData, isLoading: fL } = useOverallFunnel(year);
  const { data: convData, isLoading: cL } = useDriveConversionSummary(10);
  const invalidateMutation = useInvalidateAnalyticsCache();

  const overview = tpoData?.overview || {};
  const packages = tpoData?.packages || {};
  const branchStats = tpoData?.branchStats || [];
  const topCompanies = tpoData?.topCompanies || [];
  const driveStats = tpoData?.driveStats || {};
  const funnel = funnelData?.stages || [];
  const drives = convData || [];

  const branchChartData = branchStats.map((b) => ({
    label: b.branch,
    value: b.placed,
    sublabel: `${b.placementPercent}%`,
    color:
      b.placementPercent >= 75
        ? "#10b981"
        : b.placementPercent >= 50
          ? "#f59e0b"
          : "#6366f1",
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Placement Analytics"
        subtitle="College-wide placement statistics and insights"
        actions={
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <YearPicker value={year} onChange={setYear} />
            <Button
              variant="outline"
              size="sm"
              onClick={() => invalidateMutation.mutate()}
              disabled={invalidateMutation.isPending}
              className="gap-1.5"
            >
              {invalidateMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <div className="relative">
              <select
                defaultValue=""
                onChange={(e) =>
                  e.target.value &&
                  navigate(`/analytics/branch/${e.target.value}`)
                }
                className="h-9 rounded-lg border bg-background px-3 pr-8 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="" disabled>
                  Branch…
                </option>
                {BRANCHES.map((b) => (
                  <option key={b} value={b}>
                    {b}
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
          value={tL ? "…" : (overview.totalStudents || 0).toLocaleString()}
          icon={Users}
        />
        <StatCard
          title="Placed"
          value={tL ? "…" : (overview.placedStudents || 0).toLocaleString()}
          icon={Award}
          trend={
            overview.placementPercent
              ? { label: `${overview.placementPercent}% rate`, positive: true }
              : undefined
          }
        />
        <StatCard
          title="Dream Placed"
          value={
            tL ? "…" : (overview.dreamPlacedStudents || 0).toLocaleString()
          }
          icon={TrendingUp}
        />
        <StatCard
          title="Offer Acceptance"
          value={tL ? "…" : `${tpoData?.offerAcceptanceRate || 0}%`}
          icon={BarChart2}
        />
      </div>

      {/* donut + packages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">
              Placement Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tL ? (
              <div className="flex justify-center py-8">
                <Skeleton className="w-32 h-32 rounded-full" />
              </div>
            ) : (
              <PlacementDonut
                placed={overview.placedStudents || 0}
                dreamPlaced={overview.dreamPlacedStudents || 0}
                total={overview.totalStudents || 0}
                size={140}
                className="py-2"
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <IndianRupee className="w-4 h-4 text-primary" />
              Package Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tL ? (
              <SectionSkeleton rows={2} />
            ) : (
              <PackageStats packages={packages} />
            )}
            {!tL && packages.count > 0 && (
              <p className="text-xs text-muted-foreground mt-3 text-center">
                Based on {packages.count} accepted offer
                {packages.count !== 1 ? "s" : ""}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* funnel */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            Recruitment Funnel
          </CardTitle>
          {funnelData?.insight && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {funnelData.insight}
            </p>
          )}
        </CardHeader>
        <CardContent>
          {fL ? (
            <SectionSkeleton rows={6} />
          ) : (
            <FunnelChart stages={funnel} showSummary />
          )}
        </CardContent>
      </Card>

      {/* branch + companies */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">
                Branch-wise Placement
              </CardTitle>
              <span
                className="text-xs text-primary cursor-pointer hover:underline"
                onClick={() => navigate("/analytics/branch/CSE")}
              >
                Drill down →
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {tL ? (
              <SectionSkeleton rows={5} />
            ) : (
              <BarChart data={branchChartData} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">
              Top Recruiting Companies
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tL ? (
              <SectionSkeleton rows={5} />
            ) : (
              <div className="space-y-2">
                {topCompanies.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No data yet
                  </p>
                ) : (
                  topCompanies.map((c, i) => (
                    <div
                      key={c._id}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => navigate(`/analytics/company/${c._id}`)}
                    >
                      <span className="text-xs font-bold text-muted-foreground w-5 text-center">
                        {i + 1}
                      </span>
                      <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Building2 className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.name}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground">
                          {c.offers} offers
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[11px] text-emerald-600 border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20"
                        >
                          {c.accepted} accepted
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* drive conversion table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">
              Drive Conversion Rates
            </CardTitle>
            <span className="text-xs text-muted-foreground">
              Top 10 drives by applicants
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {cL ? (
            <SectionSkeleton rows={5} />
          ) : drives.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No drive data yet
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    {[
                      "Drive",
                      "Applied",
                      "Offered",
                      "Accepted",
                      "Conversion",
                    ].map((h) => (
                      <th
                        key={h}
                        className={`py-2 px-3 text-xs text-muted-foreground font-medium ${h === "Drive" ? "text-left" : "text-right"}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {drives.map((d) => (
                    <tr
                      key={d._id}
                      className="hover:bg-muted/20 transition-colors"
                    >
                      <td className="py-2.5 px-3">
                        <p className="font-medium truncate max-w-40">
                          {d.driveTitle}
                        </p>
                        {d.companyName && (
                          <p className="text-xs text-muted-foreground">
                            {d.companyName}
                          </p>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums">
                        {d.total}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums">
                        {d.offered}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums">
                        {d.accepted}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span
                          className={cn(
                            "font-semibold tabular-nums",
                            d.conversionRate >= 20
                              ? "text-emerald-600"
                              : d.conversionRate >= 10
                                ? "text-amber-600"
                                : "text-red-500",
                          )}
                        >
                          {d.conversionRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* drive status summary */}
      {!tL && driveStats.total > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">
              Drive Status Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {[
                { label: "Total", key: "total", color: "text-foreground" },
                { label: "Open", key: "open", color: "text-emerald-600" },
                {
                  label: "Completed",
                  key: "completed",
                  color: "text-blue-600",
                },
                { label: "Closed", key: "closed", color: "text-amber-600" },
                {
                  label: "Draft",
                  key: "draft",
                  color: "text-muted-foreground",
                },
              ].map((s) => (
                <div
                  key={s.key}
                  className="bg-muted/40 rounded-xl px-3 py-3 text-center"
                >
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">
                    {s.label}
                  </p>
                  <p className={cn("text-xl font-bold mt-1", s.color)}>
                    {driveStats[s.key] || 0}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
