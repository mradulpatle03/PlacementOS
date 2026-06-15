import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  TrendingUp,
  Users,
  CheckCircle2,
} from "lucide-react";
import { useCompanyAnalytics } from "@/hooks/useAnalytics";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const STATUS_COLOR = {
  open: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  completed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  closed:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  draft: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  published:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
};

function SectionSkeleton({ rows = 4 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-10 rounded-lg" />
      ))}
    </div>
  );
}

export default function CompanyAnalytics() {
  const { companyId } = useParams();
  const navigate = useNavigate();

  const { data, isLoading } = useCompanyAnalytics(companyId);

  const drives = data?.drives || [];
  const totalDrives = data?.totalDrives || 0;
  const totalApplications = data?.totalApplications || 0;
  const totalOffered = data?.totalOffered || 0;
  const totalAccepted = data?.totalAccepted || 0;
  const offerAcceptanceRate = data?.offerAcceptanceRate || 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Company Trends"
        subtitle="Recruitment performance across all drives"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/analytics")}
            className="gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
        }
      />

      {/* stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          title="Total Drives"
          value={isLoading ? "…" : totalDrives}
          icon={Building2}
        />
        <StatCard
          title="Total Applications"
          value={isLoading ? "…" : totalApplications.toLocaleString()}
          icon={Users}
        />
        <StatCard
          title="Offers Extended"
          value={isLoading ? "…" : totalOffered}
          icon={TrendingUp}
        />
        <StatCard
          title="Offer Acceptance"
          value={isLoading ? "…" : `${offerAcceptanceRate}%`}
          icon={CheckCircle2}
          trend={
            offerAcceptanceRate > 0
              ? {
                  label: `${totalAccepted} accepted`,
                  positive: offerAcceptanceRate >= 50,
                }
              : undefined
          }
        />
      </div>

      {/* drive breakdown table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Drive History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <SectionSkeleton rows={5} />
          ) : drives.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No drives found for this company
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    {[
                      "Drive",
                      "Status",
                      "Applications",
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
                  {drives.map((d) => {
                    const conv =
                      d.applications > 0
                        ? Math.round((d.accepted / d.applications) * 100 * 10) /
                          10
                        : 0;
                    return (
                      <tr
                        key={d._id}
                        className="hover:bg-muted/20 transition-colors"
                      >
                        <td className="py-3 px-3">
                          <p className="font-medium truncate max-w-45">
                            {d.title}
                          </p>
                          {d.createdAt && (
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(d.createdAt), "MMM yyyy")}
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Badge
                            className={cn(
                              "border-0 text-[11px]",
                              STATUS_COLOR[d.status] || STATUS_COLOR.draft,
                            )}
                          >
                            {d.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums">
                          {d.applications}
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums">
                          {d.offered}
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums">
                          {d.accepted}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span
                            className={cn(
                              "font-semibold tabular-nums",
                              conv >= 20
                                ? "text-emerald-600"
                                : conv >= 10
                                  ? "text-amber-600"
                                  : "text-muted-foreground",
                            )}
                          >
                            {conv}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* visual bar — applications per drive */}
      {!isLoading && drives.length > 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">
              Applications per Drive
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {drives.map((d) => {
                const maxApps = Math.max(
                  ...drives.map((x) => x.applications),
                  1,
                );
                const pct = Math.max(
                  d.applications > 0 ? 6 : 0,
                  Math.round((d.applications / maxApps) * 100),
                );
                return (
                  <div key={d._id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium truncate max-w-[60%]">
                        {d.title}
                      </span>
                      <span className="font-semibold tabular-nums">
                        {d.applications}
                      </span>
                    </div>
                    <div className="h-5 bg-muted rounded-md overflow-hidden">
                      <div
                        className="h-full rounded-md bg-primary/70 transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
