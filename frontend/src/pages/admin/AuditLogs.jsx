import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import {
  FileText,
  Search,
  ChevronDown,
  X,
  Calendar,
  User,
  Activity,
  Database,
  ChevronLeft,
  ChevronRight,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Trash2,
  Plus,
  ShieldCheck,
  LogIn,
  LogOut,
  Upload,
  Download,
} from "lucide-react";

import { adminAPI } from "@/api/admin.api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Modal from "@/components/ui/Modal";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";

// ── enum config ───────────────────────────────────────────────

const ACTIONS = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "LOGIN",
  "LOGOUT",
  "LOGIN_FAILED",
  "UPLOAD",
  "EXPORT",
  "STATUS_CHANGE",
  "ROLE_CHANGE",
  "VERIFY",
];

const ENTITIES = [
  "User",
  "Student",
  "Recruiter",
  "Company",
  "Drive",
  "Application",
  "Pipeline",
  "Assessment",
  "Interview",
  "Offer",
  "Report",
  "Policy",
  "Resume",
  "Notification",
  "Auth",
];

const ACTION_CONFIG = {
  CREATE: {
    icon: Plus,
    color: "text-emerald-600",
    bg: "bg-emerald-100 dark:bg-emerald-900/40",
  },
  UPDATE: {
    icon: ArrowUpRight,
    color: "text-blue-600",
    bg: "bg-blue-100 dark:bg-blue-900/40",
  },
  DELETE: {
    icon: Trash2,
    color: "text-red-600",
    bg: "bg-red-100 dark:bg-red-900/40",
  },
  LOGIN: {
    icon: LogIn,
    color: "text-indigo-600",
    bg: "bg-indigo-100 dark:bg-indigo-900/40",
  },
  LOGOUT: {
    icon: LogOut,
    color: "text-gray-600",
    bg: "bg-gray-100 dark:bg-gray-800",
  },
  LOGIN_FAILED: {
    icon: X,
    color: "text-red-600",
    bg: "bg-red-100 dark:bg-red-900/40",
  },
  UPLOAD: {
    icon: Upload,
    color: "text-purple-600",
    bg: "bg-purple-100 dark:bg-purple-900/40",
  },
  EXPORT: {
    icon: Download,
    color: "text-amber-600",
    bg: "bg-amber-100 dark:bg-amber-900/40",
  },
  STATUS_CHANGE: {
    icon: ArrowDownRight,
    color: "text-orange-600",
    bg: "bg-orange-100 dark:bg-orange-900/40",
  },
  ROLE_CHANGE: {
    icon: ShieldCheck,
    color: "text-pink-600",
    bg: "bg-pink-100 dark:bg-pink-900/40",
  },
  VERIFY: {
    icon: ShieldCheck,
    color: "text-emerald-600",
    bg: "bg-emerald-100 dark:bg-emerald-900/40",
  },
};

const LIMIT = 20;

// ── filter dropdown ───────────────────────────────────────────
function FilterSelect({ label, value, onChange, options, icon: Icon }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-lg border bg-background pl-8 pr-7 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary/30 min-w-32.5"
      >
        <option value="">{label}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      {Icon && (
        <Icon className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
      )}
      <ChevronDown className="absolute right-2 top-2.5 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
    </div>
  );
}

// ── single log row ────────────────────────────────────────────
function LogRow({ log, onClick }) {
  const cfg = ACTION_CONFIG[log.action] || ACTION_CONFIG.UPDATE;
  const Icon = cfg.icon;

  return (
    <button
      onClick={() => onClick(log)}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border bg-card hover:bg-muted/30 transition-colors text-left"
    >
      <div
        className={cn(
          "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
          cfg.bg,
        )}
      >
        <Icon className={cn("w-4 h-4", cfg.color)} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">
            {log.userEmail || "System"}
          </span>
          <Badge variant="outline" className="text-[10px] capitalize">
            {log.userRole || "unknown"}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">
          <span className="font-medium">{log.action}</span>
          {" on "}
          <span className="font-medium">{log.entity}</span>
          {log.entityTitle && <span> — {log.entityTitle}</span>}
        </p>
      </div>

      <div className="text-right shrink-0">
        <p className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
        </p>
        {log.method && (
          <p className="text-[10px] text-muted-foreground/70 mt-0.5">
            {log.method} {log.path}
          </p>
        )}
      </div>
    </button>
  );
}

// ── detail modal ───────────────────────────────────────────────
function LogDetailModal({ log, onClose }) {
  if (!log) return null;
  const cfg = ACTION_CONFIG[log.action] || ACTION_CONFIG.UPDATE;
  const Icon = cfg.icon;

  return (
    <Modal open={!!log} onClose={onClose} title="Audit Log Detail">
      <div className="space-y-4 mt-2">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "h-10 w-10 rounded-xl flex items-center justify-center",
              cfg.bg,
            )}
          >
            <Icon className={cn("w-5 h-5", cfg.color)} />
          </div>
          <div>
            <p className="font-semibold">
              {log.action} — {log.entity}
            </p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(log.createdAt), "dd MMM yyyy, hh:mm:ss a")}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">User</p>
            <p className="font-medium">{log.userEmail || "System"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Role</p>
            <p className="font-medium capitalize">{log.userRole || "—"}</p>
          </div>
          {log.entityTitle && (
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground">Entity</p>
              <p className="font-medium">{log.entityTitle}</p>
            </div>
          )}
          {log.entityId && (
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground">Entity ID</p>
              <p className="font-mono text-xs">{log.entityId}</p>
            </div>
          )}
          {log.method && (
            <div>
              <p className="text-xs text-muted-foreground">HTTP</p>
              <p className="font-mono text-xs">
                {log.method} {log.path}
              </p>
            </div>
          )}
          {log.ip && (
            <div>
              <p className="text-xs text-muted-foreground">IP Address</p>
              <p className="font-mono text-xs">{log.ip}</p>
            </div>
          )}
        </div>

        {log.changes?.before || log.changes?.after ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Changes</p>
            <div className="grid grid-cols-2 gap-2">
              {log.changes.before && (
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-2.5">
                  <p className="text-[10px] text-red-600 dark:text-red-400 font-medium mb-1">
                    BEFORE
                  </p>
                  <pre className="text-[11px] overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(log.changes.before, null, 2)}
                  </pre>
                </div>
              )}
              {log.changes.after && (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-2.5">
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mb-1">
                    AFTER
                  </p>
                  <pre className="text-[11px] overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(log.changes.after, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {log.userAgent && (
          <div>
            <p className="text-xs text-muted-foreground">User Agent</p>
            <p className="text-[11px] text-muted-foreground/80 break-all">
              {log.userAgent}
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ── skeleton ──────────────────────────────────────────────────
function LogSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-card">
      <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-56" />
      </div>
      <Skeleton className="h-3 w-16" />
    </div>
  );
}

// ── stats summary bar ────────────────────────────────────────
function StatsBar({ stats, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    );
  }

  const topActions = Object.entries(stats?.byAction || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {topActions.map(([action, count]) => {
        const cfg = ACTION_CONFIG[action] || ACTION_CONFIG.UPDATE;
        const Icon = cfg.icon;
        return (
          <div
            key={action}
            className="bg-muted/40 rounded-xl px-4 py-3 flex items-center gap-3"
          >
            <div
              className={cn(
                "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                cfg.bg,
              )}
            >
              <Icon className={cn("w-4 h-4", cfg.color)} />
            </div>
            <div>
              <p className="text-lg font-bold leading-none">{count}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {action}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────
export default function AuditLogs() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [entity, setEntity] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selectedLog, setSelectedLog] = useState(null);

  const hasFilters = search || action || entity || from || to;

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", page, search, action, entity, from, to],
    queryFn: () =>
      adminAPI
        .getAuditLogs({
          page,
          limit: LIMIT,
          search: search || undefined,
          action: action || undefined,
          entity: entity || undefined,
          from: from || undefined,
          to: to || undefined,
        })
        .then((r) => r.data.data),
    keepPreviousData: true,
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["audit-stats"],
    queryFn: () => adminAPI.getAuditStats().then((r) => r.data.data),
  });

  const logs = data?.logs || [];
  const pagination = data?.pagination || {};

  const clearFilters = () => {
    setSearch("");
    setAction("");
    setEntity("");
    setFrom("");
    setTo("");
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        subtitle="Track every action across the platform"
      />

      {/* stats bar */}
      <StatsBar stats={stats} loading={statsLoading} />

      {/* filters */}
      <Card>
        <CardContent className="pt-5 pb-5 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* search */}
            <div className="relative flex-1 min-w-50">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search email, path, entity…"
                className="w-full h-9 rounded-lg border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <FilterSelect
              label="All Actions"
              value={action}
              onChange={(v) => {
                setAction(v);
                setPage(1);
              }}
              options={ACTIONS}
              icon={Activity}
            />

            <FilterSelect
              label="All Entities"
              value={entity}
              onChange={(v) => {
                setEntity(v);
                setPage(1);
              }}
              options={ENTITIES}
              icon={Database}
            />

            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="gap-1.5 text-muted-foreground"
              >
                <X className="w-3.5 h-3.5" /> Clear
              </Button>
            )}
          </div>

          {/* date range */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              <label className="text-xs text-muted-foreground">From</label>
              <input
                type="date"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setPage(1);
                }}
                className="h-8 rounded-lg border bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-muted-foreground">To</label>
              <input
                type="date"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  setPage(1);
                }}
                className="h-8 rounded-lg border bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            {pagination.total !== undefined && (
              <span className="text-xs text-muted-foreground ml-auto">
                {pagination.total.toLocaleString()} log
                {pagination.total !== 1 ? "s" : ""} found
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* log list */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <LogSkeleton key={i} />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No audit logs found"
          description={
            hasFilters
              ? "Try adjusting your filters."
              : "Actions will be logged here as they happen."
          }
        />
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <LogRow key={log._id} log={log} onClick={setSelectedLog} />
          ))}
        </div>
      )}

      {/* pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || isLoading}
            className="gap-1.5"
          >
            <ChevronLeft className="w-4 h-4" /> Prev
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {pagination.pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
            disabled={page === pagination.pages || isLoading}
            className="gap-1.5"
          >
            Next <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* detail modal */}
      <LogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
    </div>
  );
}
