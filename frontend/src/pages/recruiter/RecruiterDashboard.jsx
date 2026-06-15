import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { formatDistanceToNow, format, isPast } from "date-fns";
import {
  Briefcase,
  Users,
  Calendar,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Building2,
  BarChart2,
  Loader2,
  Award,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";
import { driveAPI } from "@/api/drive.api";
import { interviewAPI } from "@/api/interview.api";

// ── status config ─────────────────────────────────────────────
const DRIVE_STATUS = {
  draft: {
    label: "Draft",
    class: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  },
  published: {
    label: "Published",
    class:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  },
  open: {
    label: "Open",
    class:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  closed: {
    label: "Closed",
    class:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  },
  completed: {
    label: "Completed",
    class: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  },
};

const PIPELINE_STAGE_COLOR = {
  applied: "bg-blue-400",
  shortlisted: "bg-purple-400",
  oa: "bg-yellow-400",
  interview_1: "bg-orange-400",
  interview_2: "bg-orange-500",
  hr: "bg-pink-400",
  offered: "bg-emerald-400",
  accepted: "bg-emerald-600",
  rejected: "bg-red-400",
};

// ── mini stat card ────────────────────────────────────────────
function MiniStat({
  label,
  value,
  icon: Icon,
  color = "text-foreground",
  loading,
}) {
  return (
    <div className="bg-muted/40 rounded-xl px-4 py-3 flex items-center gap-3">
      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div>
        <p className={cn("text-xl font-bold leading-none", color)}>
          {loading ? <Skeleton className="h-6 w-8 inline-block" /> : value}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// ── drive row ─────────────────────────────────────────────────
function DriveRow({ drive }) {
  const navigate = useNavigate();
  const cfg = DRIVE_STATUS[drive.status] || DRIVE_STATUS.draft;
  const isOpen = drive.status === "open";

  return (
    <div
      className="flex items-center gap-3 px-4 py-3.5 rounded-xl border bg-card hover:bg-muted/30 transition-colors cursor-pointer"
      onClick={() => navigate(`/tpo/drives/${drive._id}`)}
    >
      {/* icon */}
      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Briefcase className="w-4 h-4 text-primary" />
      </div>

      {/* info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{drive.title}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {drive.roles?.[0]?.ctc && (
            <span className="text-[11px] text-emerald-600 font-medium">
              ₹{drive.roles[0].ctc} LPA
            </span>
          )}
          {drive.applicationDeadline && isOpen && (
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {isPast(new Date(drive.applicationDeadline))
                ? "Deadline passed"
                : `Closes ${formatDistanceToNow(new Date(drive.applicationDeadline), { addSuffix: true })}`}
            </span>
          )}
        </div>
      </div>

      {/* status */}
      <Badge className={cn("border-0 text-[11px] shrink-0", cfg.class)}>
        {cfg.label}
      </Badge>

      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
    </div>
  );
}

// ── pipeline summary mini-chart ───────────────────────────────
function PipelineSummary({ driveId, driveTitle }) {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["pipeline-summary-dash", driveId],
    queryFn: () => driveAPI.getSummary(driveId).then((r) => r.data.data),
    staleTime: 60 * 1000,
  });

  const stages = data?.stageBreakdown || data?.pipeline || {};
  const total =
    data?.totalApplications || Object.values(stages).reduce((s, v) => s + v, 0);

  const SHOW_STAGES = [
    "shortlisted",
    "oa",
    "interview_1",
    "hr",
    "offered",
    "accepted",
  ];
  const displayed = SHOW_STAGES.filter((s) => (stages[s] || 0) > 0);

  return (
    <div
      className="px-4 py-3.5 rounded-xl border bg-card hover:bg-muted/30 transition-colors cursor-pointer space-y-2"
      onClick={() => navigate(`/tpo/drives/${driveId}/pipeline`)}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium truncate flex-1 mr-2">{driveTitle}</p>
        <span className="text-xs text-muted-foreground shrink-0">
          {total} candidates
        </span>
      </div>

      {isLoading ? (
        <Skeleton className="h-4 w-full rounded-full" />
      ) : displayed.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No candidates in pipeline
        </p>
      ) : (
        <div className="space-y-1.5">
          {displayed.map((stage) => {
            const count = stages[stage] || 0;
            const pct =
              total > 0 ? Math.max(4, Math.round((count / total) * 100)) : 0;
            return (
              <div key={stage} className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground w-20 truncate capitalize">
                  {stage.replace("_", " ")}
                </span>
                <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      PIPELINE_STAGE_COLOR[stage] || "bg-primary/50",
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-[10px] font-medium w-5 text-right tabular-nums">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── upcoming interview row ────────────────────────────────────
function InterviewRow({ interview }) {
  const navigate = useNavigate();
  const scheduledAt = new Date(
    interview.scheduledAt || interview.slot?.scheduledAt,
  );
  const alreadyPast = isPast(scheduledAt);
  const hoursAway = Math.round((scheduledAt - Date.now()) / (1000 * 60 * 60));
  const isImminent = !alreadyPast && hoursAway <= 2;

  return (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-3 rounded-xl border transition-colors cursor-pointer",
        isImminent
          ? "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800"
          : "bg-card hover:bg-muted/30 border-border",
      )}
      onClick={() =>
        navigate(
          `/tpo/drives/${interview.drive?._id || interview.drive}/interviews`,
        )
      }
    >
      <div
        className={cn(
          "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
          isImminent ? "bg-amber-100 dark:bg-amber-900/40" : "bg-primary/10",
        )}
      >
        <Calendar
          className={cn(
            "w-4 h-4",
            isImminent ? "text-amber-600" : "text-primary",
          )}
        />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {interview.candidate?.user?.name ||
            interview.candidateName ||
            "Candidate"}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {interview.drive?.title || "Drive"} — Round {interview.round || 1}
        </p>
        <p
          className={cn(
            "text-[11px] mt-0.5 flex items-center gap-1",
            alreadyPast
              ? "text-muted-foreground"
              : isImminent
                ? "text-amber-600 font-medium"
                : "text-muted-foreground",
          )}
        >
          <Clock className="w-3 h-3 shrink-0" />
          {alreadyPast
            ? `Was ${formatDistanceToNow(scheduledAt, { addSuffix: true })}`
            : isImminent
              ? `Starting in ~${hoursAway}h`
              : format(scheduledAt, "dd MMM · hh:mm a")}
        </p>
      </div>

      {interview.mode && (
        <Badge variant="outline" className="text-[10px] shrink-0 self-start">
          {interview.mode}
        </Badge>
      )}
    </div>
  );
}

// ── skeleton ──────────────────────────────────────────────────
function RowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl border bg-card">
      <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-32" />
      </div>
      <Skeleton className="h-5 w-16 rounded-full" />
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────
export default function RecruiterDashboard() {
  const { user } = useSelector((s) => s.auth);
  const navigate = useNavigate();

  // recruiter's drives
  const { data: drivesData, isLoading: drivesLoading } = useQuery({
    queryKey: ["recruiter-my-drives"],
    queryFn: () => driveAPI.getAll({ limit: 10 }).then((r) => r.data),
    staleTime: 2 * 60 * 1000,
  });

  // recruiter's upcoming interviews (across all drives)
  const { data: interviewsData, isLoading: interviewsLoading } = useQuery({
    queryKey: ["recruiter-upcoming-interviews"],
    queryFn: () =>
      interviewAPI.getMyInterviews
        ? // fallback: use getByDrive without a driveId returns all for this recruiter
          interviewAPI
            .getMyInterviews()
            .then((r) => r.data.data?.interviews || [])
        : Promise.resolve([]),
    staleTime: 60 * 1000,
  });

  const drives = drivesData?.drives || [];
  const pagination = drivesData?.pagination || {};
  const interviews = (interviewsData || [])
    .filter(
      (i) =>
        !isPast(new Date(i.scheduledAt || i.slot?.scheduledAt || Date.now())),
    )
    .sort(
      (a, b) =>
        new Date(a.scheduledAt || a.slot?.scheduledAt) -
        new Date(b.scheduledAt || b.slot?.scheduledAt),
    )
    .slice(0, 5);

  // drive status breakdown
  const drivesByStatus = drives.reduce((acc, d) => {
    acc[d.status] = (acc[d.status] || 0) + 1;
    return acc;
  }, {});

  const openDrives = drives.filter((d) => d.status === "open");
  const activeDrives = drives.filter((d) =>
    ["open", "published"].includes(d.status),
  );

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="space-y-6">
      {/* header */}
      <div>
        <h1 className="text-2xl font-bold">
          {greeting()}, {user?.name?.split(" ")[0]} 👋
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          {new Date().toLocaleDateString("en-IN", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MiniStat
          label="Total Drives"
          value={drivesLoading ? "…" : pagination.total || drives.length}
          icon={Briefcase}
          loading={drivesLoading}
        />
        <MiniStat
          label="Open Drives"
          value={drivesLoading ? "…" : openDrives.length}
          icon={CheckCircle2}
          color="text-emerald-600"
          loading={drivesLoading}
        />
        <MiniStat
          label="Upcoming Interviews"
          value={interviewsLoading ? "…" : interviews.length}
          icon={Calendar}
          color="text-blue-600"
          loading={interviewsLoading}
        />
        <MiniStat
          label="Active Drives"
          value={drivesLoading ? "…" : activeDrives.length}
          icon={BarChart2}
          color="text-indigo-600"
          loading={drivesLoading}
        />
      </div>

      {/* quick actions */}
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { label: "View All Drives", to: "/drives", icon: Briefcase },
          { label: "Pipeline Board", to: "/tpo/drives", icon: Users },
          { label: "My Profile", to: "/recruiter/profile", icon: Building2 },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Button
              key={item.to}
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => navigate(item.to)}
            >
              <Icon className="w-3.5 h-3.5" />
              {item.label}
            </Button>
          );
        })}
      </div>

      {/* my drives + pipeline summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* my drives list */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-primary" />
                My Drives
              </CardTitle>
              <Link
                to="/drives"
                className="text-xs text-primary hover:underline"
              >
                All drives →
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {drivesLoading ? (
              [1, 2, 3].map((i) => <RowSkeleton key={i} />)
            ) : drives.length === 0 ? (
              <EmptyState
                icon={Briefcase}
                title="No drives yet"
                description="Drives assigned to you will appear here."
              />
            ) : (
              drives.slice(0, 5).map((d) => <DriveRow key={d._id} drive={d} />)
            )}
          </CardContent>
        </Card>

        {/* pipeline summaries for active drives */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Pipeline Summary
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {drivesLoading ? (
              [1, 2].map((i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))
            ) : activeDrives.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No active drives with pipeline data
              </p>
            ) : (
              activeDrives
                .slice(0, 4)
                .map((d) => (
                  <PipelineSummary
                    key={d._id}
                    driveId={d._id}
                    driveTitle={d.title}
                  />
                ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* upcoming interviews */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              Upcoming Interviews
            </CardTitle>
            <span className="text-xs text-muted-foreground">
              Next {interviews.length} scheduled
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          {interviewsLoading ? (
            [1, 2, 3].map((i) => <RowSkeleton key={i} />)
          ) : interviews.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No upcoming interviews"
              description="Scheduled interviews will appear here."
            />
          ) : (
            interviews.map((iv, i) => (
              <InterviewRow key={iv._id || i} interview={iv} />
            ))
          )}
        </CardContent>
      </Card>

      {/* drive status breakdown */}
      {!drivesLoading && drives.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">
              Drive Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {[
                { label: "Open", key: "open", color: "text-emerald-600" },
                {
                  label: "Published",
                  key: "published",
                  color: "text-purple-600",
                },
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
                    {drivesByStatus[s.key] || 0}
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
