import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow, format } from "date-fns";
import {
  FileText,
  Download,
  Trash2,
  Loader2,
  Plus,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Hourglass,
  ChevronDown,
  Filter,
  BarChart2,
  Briefcase,
  Users,
  Award,
  Settings,
} from "lucide-react";
import { toast } from "sonner";

import { reportAPI } from "@/api/report.api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/utils";

// ── status config ─────────────────────────────────────────────
const STATUS_CONFIG = {
  queued: {
    label: "Queued",
    icon: Hourglass,
    class: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  },
  processing: {
    label: "Processing",
    icon: Loader2,
    class: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  },
  completed: {
    label: "Ready",
    icon: CheckCircle2,
    class:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  failed: {
    label: "Failed",
    icon: XCircle,
    class: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  },
};

const FORMAT_LABELS = { xlsx: "Excel", pdf: "PDF" };

const TYPE_LABELS = {
  placement_summary: "Placement Summary",
  drive_report: "Drive Report",
  branch_report: "Branch Report",
  company_report: "Company Report",
  offer_report: "Offer Report",
  custom: "Custom Report",
};

// ── pre-built report templates ────────────────────────────────
const PREBUILT = [
  {
    id: "placement_summary_xlsx",
    title: "Placement Summary",
    description:
      "Overall stats — placement %, packages, branch breakdown, top companies",
    icon: BarChart2,
    type: "placement_summary",
    format: "xlsx",
    color: "text-indigo-500",
    bg: "bg-indigo-50 dark:bg-indigo-950",
  },
  {
    id: "placement_summary_pdf",
    title: "Placement Summary (PDF)",
    description: "Same as above but as a printable PDF",
    icon: BarChart2,
    type: "placement_summary",
    format: "pdf",
    color: "text-purple-500",
    bg: "bg-purple-50 dark:bg-purple-950",
  },
  {
    id: "offer_report_xlsx",
    title: "Offer Letters Report",
    description: "All offer letters with status, CTC, joining date",
    icon: Award,
    type: "offer_report",
    format: "xlsx",
    color: "text-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-950",
  },
];

// ── custom builder state defaults ─────────────────────────────
const DEFAULT_CUSTOM = {
  type: "custom",
  format: "xlsx",
  title: "",
  driveId: "",
  branch: "",
  status: "",
  year: "",
  notifyEmail: "",
};

const BRANCHES = ["CSE", "IT", "ECE", "EEE", "ME", "CE", "Other"];
const STAGES = [
  "applied",
  "shortlisted",
  "oa",
  "interview_1",
  "interview_2",
  "hr",
  "offered",
  "accepted",
];
const YEARS = Array.from({ length: 4 }, (_, i) =>
  String(new Date().getFullYear() - i),
);

// ── Available fields grouped by category ─────────────────────
const FIELD_GROUPS = {
  Student: [
    "rollNumber",
    "name",
    "email",
    "branch",
    "cgpa",
    "backlogs",
    "graduationYear",
    "placementStatus",
  ],
  Application: ["status", "appliedAt"],
  Resume: ["resumeLabel", "resumeScore"],
  Offer: ["ctc", "designation", "offerStatus", "joiningDate"],
};

const FIELD_LABELS = {
  rollNumber: "Roll Number",
  name: "Name",
  email: "Email",
  branch: "Branch",
  cgpa: "CGPA",
  backlogs: "Backlogs",
  graduationYear: "Grad Year",
  placementStatus: "Placement Status",
  status: "Stage",
  appliedAt: "Applied At",
  resumeLabel: "Resume",
  resumeScore: "Resume Score",
  ctc: "CTC (LPA)",
  designation: "Designation",
  offerStatus: "Offer Status",
  joiningDate: "Joining Date",
};

// ── Report history row ─────────────────────────────────────────
function ReportRow({ report, onDelete }) {
  const cfg = STATUS_CONFIG[report.status] || STATUS_CONFIG.queued;
  const StatusIcon = cfg.icon;
  const isReady = report.status === "completed";

  return (
    <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl border bg-card hover:bg-muted/20 transition-colors">
      <FileText className="w-4 h-4 text-muted-foreground shrink-0" />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{report.title}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-[11px] text-muted-foreground">
            {TYPE_LABELS[report.type] || report.type}
          </span>
          <span className="text-[11px] text-muted-foreground">·</span>
          <span className="text-[11px] text-muted-foreground uppercase">
            {FORMAT_LABELS[report.format] || report.format}
          </span>
          <span className="text-[11px] text-muted-foreground">·</span>
          <span className="text-[11px] text-muted-foreground">
            {formatDistanceToNow(new Date(report.createdAt), {
              addSuffix: true,
            })}
          </span>
        </div>
        {report.status === "failed" && report.errorMessage && (
          <p className="text-[11px] text-destructive mt-0.5 truncate">
            {report.errorMessage}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Badge className={cn("border-0 text-[11px] gap-1", cfg.class)}>
          <StatusIcon
            className={cn(
              "w-3 h-3",
              report.status === "processing" && "animate-spin",
            )}
          />
          {cfg.label}
        </Badge>

        {isReady && report.fileUrl && (
          <a
            href={report.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Download"
          >
            <Download className="w-4 h-4" />
          </a>
        )}

        <button
          onClick={() => onDelete(report._id)}
          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── field checkbox ─────────────────────────────────────────────
function FieldCheckbox({ fieldKey, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 text-xs cursor-pointer py-1 hover:text-foreground text-muted-foreground transition-colors">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(fieldKey, e.target.checked)}
        className="rounded border-border accent-primary"
      />
      {FIELD_LABELS[fieldKey] || fieldKey}
    </label>
  );
}

// ── custom builder panel ──────────────────────────────────────
function CustomBuilder({ onGenerate, generating }) {
  const [form, setForm] = useState(DEFAULT_CUSTOM);
  const [selectedFields, setFields] = useState(
    Object.entries(FIELD_GROUPS)
      .flatMap(([, fields]) => fields)
      .slice(0, 6),
  );
  const [previewCount, setPreviewCount] = useState(null);
  const [loadingCount, setLoadingCount] = useState(false);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const toggleField = (key, checked) => {
    setFields((prev) =>
      checked ? [...prev, key] : prev.filter((f) => f !== key),
    );
  };

  const fetchPreview = async () => {
    setLoadingCount(true);
    try {
      const res = await reportAPI.countPreview({
        driveId: form.driveId || undefined,
        branch: form.branch || undefined,
        status: form.status || undefined,
        year: form.year || undefined,
      });
      setPreviewCount(res.data.data.count);
    } catch {
      setPreviewCount(null);
    } finally {
      setLoadingCount(false);
    }
  };

  const handleGenerate = () => {
    if (!form.title.trim()) {
      toast.error("Please enter a report title");
      return;
    }
    if (selectedFields.length === 0) {
      toast.error("Select at least one field");
      return;
    }

    onGenerate({
      type: "custom",
      title: form.title.trim(),
      format: form.format,
      notifyEmail: form.notifyEmail || undefined,
      filters: {
        driveId: form.driveId || undefined,
        branch: form.branch || undefined,
        status: form.status || undefined,
        year: form.year || undefined,
        fields: selectedFields,
      },
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Settings className="w-4 h-4 text-primary" />
          Custom Report Builder
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* title + format */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">
              Report Title <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. CSE Placement 2025"
              className="w-full h-9 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">
              Format
            </label>
            <div className="relative">
              <select
                value={form.format}
                onChange={(e) => set("format", e.target.value)}
                className="w-full h-9 rounded-lg border bg-background px-3 pr-8 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="xlsx">Excel (.xlsx)</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </div>

        {/* filters */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5" /> Filters (optional)
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { key: "branch", label: "Branch", options: BRANCHES },
              { key: "status", label: "Stage", options: STAGES },
              { key: "year", label: "Year", options: YEARS },
            ].map(({ key, label, options }) => (
              <div key={key}>
                <label className="text-[11px] text-muted-foreground block mb-1">
                  {label}
                </label>
                <div className="relative">
                  <select
                    value={form[key]}
                    onChange={(e) => set(key, e.target.value)}
                    className="w-full h-8 rounded-lg border bg-background px-2 pr-7 text-xs appearance-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="">All</option>
                    {options.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-1.5 top-2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            ))}
            <div>
              <label className="text-[11px] text-muted-foreground block mb-1">
                Drive ID
              </label>
              <input
                type="text"
                value={form.driveId}
                onChange={(e) => set("driveId", e.target.value)}
                placeholder="Paste drive ID"
                className="w-full h-8 rounded-lg border bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          {/* row count preview */}
          <div className="flex items-center gap-2 mt-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={fetchPreview}
              disabled={loadingCount}
            >
              {loadingCount ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Filter className="w-3 h-3" />
              )}
              Preview row count
            </Button>
            {previewCount !== null && (
              <span className="text-xs text-muted-foreground">
                ~{previewCount.toLocaleString()} row
                {previewCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        {/* field selection */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Select Columns ({selectedFields.length} selected)
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-0 p-4 rounded-xl bg-muted/30 border">
            {Object.entries(FIELD_GROUPS).map(([group, fields]) => (
              <div key={group}>
                <p className="text-[11px] font-semibold text-foreground uppercase tracking-wide mb-1">
                  {group}
                </p>
                {fields.map((f) => (
                  <FieldCheckbox
                    key={f}
                    fieldKey={f}
                    checked={selectedFields.includes(f)}
                    onChange={toggleField}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* notify email */}
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">
            Notify Email (optional — defaults to your account email)
          </label>
          <input
            type="email"
            value={form.notifyEmail}
            onChange={(e) => set("notifyEmail", e.target.value)}
            placeholder="email@college.edu"
            className="w-full h-9 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* generate button */}
        <Button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full gap-1.5"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Queuing…
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" /> Generate Custom Report
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

// ── skeleton ──────────────────────────────────────────────────
function RowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl border bg-card">
      <Skeleton className="w-4 h-4 rounded shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-32" />
      </div>
      <Skeleton className="h-6 w-16 rounded-full" />
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────
export default function Reports() {
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState("prebuilt"); // 'prebuilt' | 'custom'
  const [statusFilter, setStatusFilter] = useState("all");

  // report history
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["reports", statusFilter],
    queryFn: () =>
      reportAPI
        .getAll({
          limit: 20,
          status: statusFilter !== "all" ? statusFilter : undefined,
        })
        .then((r) => r.data.data),
    refetchInterval: (data) => {
      // auto-refresh every 5s while any report is processing/queued
      const hasActive = data?.reports?.some((r) =>
        ["queued", "processing"].includes(r.status),
      );
      return hasActive ? 5000 : false;
    },
  });

  const reports = data?.reports || [];
  const pagination = data?.pagination || {};

  // generate mutation
  const generateMutation = useMutation({
    mutationFn: (payload) => reportAPI.generate(payload),
    onMutate: () => setGenerating(true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      toast.success("Report queued! You'll receive an email when it's ready.");
      setGenerating(false);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Failed to queue report");
      setGenerating(false);
    },
  });

  // delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => reportAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      toast.success("Report deleted");
      setDeleteId(null);
    },
    onError: () => toast.error("Failed to delete report"),
  });

  const handlePrebuiltGenerate = (template) => {
    generateMutation.mutate({
      type: template.type,
      title: template.title,
      format: template.format,
      filters: {},
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        subtitle="Generate and download placement reports"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="gap-1.5"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        }
      />

      {/* tab switcher */}
      <div className="flex items-center gap-1 p-1 bg-muted rounded-lg w-fit">
        {[
          { key: "prebuilt", label: "Pre-built Reports" },
          { key: "custom", label: "Custom Builder" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
              activeTab === tab.key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* pre-built templates */}
      {activeTab === "prebuilt" && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {PREBUILT.map((tmpl) => {
            const Icon = tmpl.icon;
            return (
              <Card key={tmpl.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-5 pb-5 space-y-3">
                  <div
                    className={cn(
                      "h-10 w-10 rounded-xl flex items-center justify-center",
                      tmpl.bg,
                    )}
                  >
                    <Icon className={cn("w-5 h-5", tmpl.color)} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{tmpl.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {tmpl.description}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full gap-1.5"
                    onClick={() => handlePrebuiltGenerate(tmpl)}
                    disabled={generating}
                  >
                    {generating ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                    Generate
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* custom builder */}
      {activeTab === "custom" && (
        <CustomBuilder
          onGenerate={(payload) => generateMutation.mutate(payload)}
          generating={generating}
        />
      )}

      {/* download history */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            Download History
            {pagination.total > 0 && (
              <span className="text-muted-foreground font-normal ml-2">
                ({pagination.total})
              </span>
            )}
          </h2>

          {/* status filter */}
          <div className="flex items-center gap-1.5">
            {["all", "queued", "processing", "completed", "failed"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
                  statusFilter === s
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:border-primary/40",
                )}
              >
                {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <RowSkeleton key={i} />
            ))}
          </div>
        ) : reports.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No reports yet"
            description={
              statusFilter !== "all"
                ? `No ${statusFilter} reports.`
                : "Generate your first report using the templates above."
            }
          />
        ) : (
          <div className="space-y-2">
            {reports.map((r) => (
              <ReportRow
                key={r._id}
                report={r}
                onDelete={(id) => setDeleteId(id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* delete confirm */}
      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteMutation.mutate(deleteId)}
        loading={deleteMutation.isPending}
        title="Delete this report?"
        description="The report file will be permanently removed from storage."
        confirmLabel="Delete"
        variant="destructive"
      />
    </div>
  );
}
