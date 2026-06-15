import { useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow, format, isPast, isFuture } from "date-fns";
import {
  Briefcase,
  FileText,
  Clock,
  Calendar,
  TrendingUp,
  Award,
  ChevronRight,
  AlertCircle,
  BriefcaseBusiness,
  Bell,
  CheckCircle2,
  Loader2,
  Users,
  BarChart2,
  Building2,
  Shield,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import ProfileMeter from "@/components/ui/ProfileMeter";
import { cn } from "@/lib/utils";
import { driveAPI } from "@/api/drive.api";
import { getMyApplications } from "@/api/application.api";
import { useStudentAnalytics } from "@/hooks/useAnalytics";
import { useEffect } from "react";

// ─────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

const STATUS_CONFIG = {
  applied: {
    label: "Applied",
    class: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  },
  shortlisted: {
    label: "Shortlisted",
    class:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  },
  oa: {
    label: "OA",
    class:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  },
  interview_1: {
    label: "Interview 1",
    class:
      "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  },
  interview_2: {
    label: "Interview 2",
    class:
      "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  },
  hr: {
    label: "HR Round",
    class: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
  },
  offered: {
    label: "Offered 🎉",
    class:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  accepted: {
    label: "Accepted ✅",
    class:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  rejected: {
    label: "Rejected",
    class: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  },
  withdrawn: {
    label: "Withdrawn",
    class: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  },
};

// ─────────────────────────────────────────────────────────────
// Student dashboard
// ─────────────────────────────────────────────────────────────

// Quick stat pill
function MiniStat({ label, value, color = "text-foreground" }) {
  return (
    <div className="bg-muted/40 rounded-xl px-4 py-3 text-center">
      <p className={cn("text-2xl font-bold", color)}>{value}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

// Success rate donut — tiny SVG
function MiniDonut({ pct = 0, size = 56 }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * (pct / 100);
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={6}
          className="text-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#10b981"
          strokeWidth={6}
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold">{pct}%</span>
      </div>
    </div>
  );
}

function StudentDashboard({ user }) {
  const navigate = useNavigate();

  // upcoming open drives
  const { data: drivesData, isLoading: drivesLoading } = useQuery({
    queryKey: ["drives-open-dashboard"],
    queryFn: () =>
      driveAPI
        .getAll({ status: "open", limit: 4 })
        .then((r) => r.data.drives || []),
    staleTime: 2 * 60 * 1000,
  });

  // recent applications
  const { data: appsData, isLoading: appsLoading } = useQuery({
    queryKey: ["my-applications-dashboard"],
    queryFn: () =>
      getMyApplications({ limit: 5, sort: "-appliedAt" }).then(
        (r) => r.data.data.applications || [],
      ),
    staleTime: 60 * 1000,
  });

  // student analytics (success rate etc.)
  const { data: analytics, isLoading: analyticsLoading } =
    useStudentAnalytics();

  const drives = drivesData || [];
  const applications = appsData || [];
  const total = analytics?.total || 0;
  const active = analytics?.active || 0;
  const successRate = analytics?.successRate || 0;
  const byStatus = analytics?.byStatus || {};

  // drives with upcoming deadlines (within 7 days)
  const urgentDrives = drives.filter((d) => {
    if (!d.applicationDeadline) return false;
    const deadline = new Date(d.applicationDeadline);
    const daysLeft = (deadline - Date.now()) / (1000 * 60 * 60 * 24);
    return daysLeft > 0 && daysLeft <= 7;
  });

  return (
    <div className="space-y-6">
      {/* ── profile completeness ──────────────────────────── */}
      <Card>
        <CardContent className="pt-5 pb-5">
          <ProfileMeter />
        </CardContent>
      </Card>

      {/* ── stats row ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MiniStat
          label="Total Applications"
          value={analyticsLoading ? "…" : total}
        />
        <MiniStat
          label="Active"
          value={analyticsLoading ? "…" : active}
          color="text-blue-600"
        />
        <MiniStat
          label="Offered"
          value={analyticsLoading ? "…" : byStatus.offered || 0}
          color="text-emerald-600"
        />
        <div className="bg-muted/40 rounded-xl px-4 py-3 flex flex-col items-center justify-center gap-1">
          <MiniDonut pct={analyticsLoading ? 0 : successRate} />
          <p className="text-[11px] text-muted-foreground">Success rate</p>
        </div>
      </div>

      {/* ── deadline alerts ───────────────────────────────── */}
      {urgentDrives.length > 0 && (
        <div className="space-y-2">
          {urgentDrives.map((d) => {
            const deadline = new Date(d.applicationDeadline);
            const hoursLeft = Math.round(
              (deadline - Date.now()) / (1000 * 60 * 60),
            );
            const isVeryUrgent = hoursLeft < 24;
            return (
              <div
                key={d._id}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl border text-sm",
                  isVeryUrgent
                    ? "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
                    : "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800",
                )}
              >
                <AlertCircle
                  className={cn(
                    "w-4 h-4 shrink-0",
                    isVeryUrgent ? "text-red-500" : "text-amber-500",
                  )}
                />
                <div className="flex-1 min-w-0">
                  <span className="font-medium truncate">{d.title}</span>
                  <span className="text-muted-foreground ml-2">
                    deadline{" "}
                    {formatDistanceToNow(deadline, { addSuffix: true })}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 h-7 px-2 text-xs"
                  onClick={() => navigate(`/drives/${d._id}`)}
                >
                  Apply
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── upcoming drives + recent applications ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* upcoming open drives */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-primary" />
                Open Drives
              </CardTitle>
              <Link
                to="/drives"
                className="text-xs text-primary hover:underline"
              >
                View all →
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {drivesLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 rounded-lg" />
                ))}
              </div>
            ) : drives.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No open drives right now
              </p>
            ) : (
              <div className="space-y-2">
                {drives.map((d) => (
                  <Link key={d._id} to={`/drives/${d._id}`}>
                    <div className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-muted/40 transition-colors">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {d.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {d.roles?.[0]?.ctc && (
                            <span className="text-[11px] text-emerald-600 font-medium">
                              ₹{d.roles[0].ctc} LPA
                            </span>
                          )}
                          {d.applicationDeadline && (
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDistanceToNow(
                                new Date(d.applicationDeadline),
                                { addSuffix: true },
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* recent applications */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Recent Applications
              </CardTitle>
              <Link
                to="/applications"
                className="text-xs text-primary hover:underline"
              >
                View all →
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {appsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 rounded-lg" />
                ))}
              </div>
            ) : applications.length === 0 ? (
              <div className="text-center py-6 space-y-2">
                <p className="text-sm text-muted-foreground">
                  No applications yet
                </p>
                <Button size="sm" variant="outline" asChild>
                  <Link to="/drives">Browse Drives</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {applications.map((app) => {
                  const cfg =
                    STATUS_CONFIG[app.status] || STATUS_CONFIG.applied;
                  return (
                    <div
                      key={app._id}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {app.drive?.title || "Drive"}
                        </p>
                        {app.appliedAt && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Applied{" "}
                            {formatDistanceToNow(new Date(app.appliedAt), {
                              addSuffix: true,
                            })}
                          </p>
                        )}
                      </div>
                      <Badge
                        className={cn(
                          "border-0 text-[11px] shrink-0",
                          cfg.class,
                        )}
                      >
                        {cfg.label}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── quick links ───────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            title: "Browse Drives",
            to: "/drives",
            icon: Briefcase,
            bg: "bg-blue-50 dark:bg-blue-950",
            color: "text-blue-500",
          },
          {
            title: "My Applications",
            to: "/applications",
            icon: FileText,
            bg: "bg-orange-50 dark:bg-orange-950",
            color: "text-orange-500",
          },
          {
            title: "My Interviews",
            to: "/interviews",
            icon: Calendar,
            bg: "bg-purple-50 dark:bg-purple-950",
            color: "text-purple-500",
          },
          {
            title: "Offer Letters",
            to: "/offers",
            icon: BriefcaseBusiness,
            bg: "bg-emerald-50 dark:bg-emerald-950",
            color: "text-emerald-500",
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.to} to={item.to}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="pt-5 pb-5">
                  <div
                    className={cn(
                      "h-10 w-10 rounded-lg flex items-center justify-center mb-3",
                      item.bg,
                    )}
                  >
                    <Icon className={cn("h-5 w-5", item.color)} />
                  </div>
                  <p className="font-semibold text-sm">{item.title}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Recruiter dashboard (unchanged structure, kept clean)
// ─────────────────────────────────────────────────────────────

function RecruiterDashboard() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/recruiter/dashboard', { replace: true });
  }, [navigate]);
  return null;
}

// ─────────────────────────────────────────────────────────────
// TPO dashboard (unchanged structure, kept clean)
// ─────────────────────────────────────────────────────────────

function TPODashboard() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {[
        {
          title: "Companies",
          to: "/companies",
          icon: Building2,
          color: "text-blue-500",
          bg: "bg-blue-50 dark:bg-blue-950",
        },
        {
          title: "Drives",
          to: "/drives",
          icon: Briefcase,
          color: "text-orange-500",
          bg: "bg-orange-50 dark:bg-orange-950",
        },
        {
          title: "Analytics",
          to: "/analytics",
          icon: BarChart2,
          color: "text-green-500",
          bg: "bg-green-50 dark:bg-green-950",
        },
        {
          title: "Students",
          to: "/students",
          icon: Users,
          color: "text-purple-500",
          bg: "bg-purple-50 dark:bg-purple-950",
        },
        {
          title: "Policy",
          to: "/tpo/policy",
          icon: Shield,
          color: "text-indigo-500",
          bg: "bg-indigo-50 dark:bg-indigo-950",
        },
        {
          title: "Notifications",
          to: "/notifications",
          icon: Bell,
          color: "text-pink-500",
          bg: "bg-pink-50 dark:bg-pink-950",
        },
      ].map((item) => {
        const Icon = item.icon;
        return (
          <Link key={item.to} to={item.to}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-6">
                <div
                  className={cn(
                    "h-10 w-10 rounded-lg flex items-center justify-center mb-3",
                    item.bg,
                  )}
                >
                  <Icon className={cn("h-5 w-5", item.color)} />
                </div>
                <p className="font-semibold text-sm">{item.title}</p>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Root export
// ─────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user } = useSelector((s) => s.auth);

  return (
    <div className="space-y-6">
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

      {user?.role === "student" && <StudentDashboard user={user} />}
      {user?.role === "recruiter" && <RecruiterDashboard user={user} />}
      {["tpo", "coordinator", "admin"].includes(user?.role) && <TPODashboard />}
    </div>
  );
}
