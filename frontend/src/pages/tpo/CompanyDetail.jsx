import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import {
  MapPin,
  Globe,
  TrendingUp,
  Briefcase,
  ArrowLeft,
  Pencil,
  Users,
  History,
  UserPlus,
  Trash2,
  ShieldCheck,
  ShieldX,
  Loader2,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import Spinner from "@/components/ui/Spinner";
import DataTable from "@/components/ui/DataTable";
import CompanyFormModal from "@/components/company/CompanyFormModal";
import LogoUpload from "@/components/company/LogoUpload";
import { companyAPI } from "@/api/company.api";
import { showSuccess, showError } from "@/lib/toast";
import api from "@/lib/axios";

// ── Recruiter APIs (inline — no separate file needed) ─────────
const recruiterAPI = {
  getAll: (params = {}) => api.get("/recruiters", { params }),
};

// ── Link Recruiter Modal ──────────────────────────────────────
function LinkRecruiterModal({ open, onClose, companyId, linkedIds, onLinked }) {
  const [search, setSearch] = useState("");
  const [linking, setLinking] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["all-recruiters"],
    queryFn: () => recruiterAPI.getAll().then((r) => r.data.recruiters || []),
    enabled: open,
  });

  const recruiters = (data || []).filter((r) => {
    // exclude already linked
    if (linkedIds.includes(r.user?._id || r._id)) return false;
    // exclude unverified? allow TPO to link any
    const name = r.user?.name?.toLowerCase() || "";
    const email = r.user?.email?.toLowerCase() || "";
    const q = search.toLowerCase();
    return !q || name.includes(q) || email.includes(q);
  });

  const handleLink = async (recruiterId) => {
    setLinking(recruiterId);
    try {
      await companyAPI.linkRecruiter(companyId, recruiterId);
      showSuccess("Recruiter linked to company");
      onLinked();
      onClose();
    } catch (err) {
      showError(err?.response?.data?.message || "Failed to link recruiter");
    } finally {
      setLinking(null);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-background rounded-2xl shadow-2xl overflow-hidden">
        {/* header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold">Link Recruiter</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
          >
            ✕
          </button>
        </div>

        {/* search */}
        <div className="px-6 pt-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 rounded-lg border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        {/* list */}
        <div className="px-6 pb-6 max-h-80 overflow-y-auto space-y-2 mt-2">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : recruiters.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              {search ? "No recruiters match your search." : "All recruiters are already linked or none exist."}
            </p>
          ) : (
            recruiters.map((r) => (
              <div
                key={r._id}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-card"
              >
                {/* avatar */}
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-sm font-semibold text-primary">
                  {r.user?.name?.charAt(0).toUpperCase() || "R"}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.user?.name || "—"}</p>
                  <p className="text-xs text-muted-foreground truncate">{r.user?.email || "—"}</p>
                  {r.designation && (
                    <p className="text-xs text-muted-foreground">{r.designation}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {r.isVerified ? (
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <ShieldX className="w-4 h-4 text-amber-400" />
                  )}
                  <Button
                    size="sm"
                    className="h-7 px-3 text-xs"
                    onClick={() => handleLink(r.user?._id)}
                    disabled={linking === r.user?._id}
                  >
                    {linking === r.user?._id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      "Link"
                    )}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ── Recruiters Tab Content ────────────────────────────────────
function RecruitersTab({ companyId, canManage }) {
  const queryClient = useQueryClient();
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [unlinking, setUnlinking] = useState(null);

  const { data: recruitersData, isLoading } = useQuery({
    queryKey: ["company-recruiters", companyId],
    queryFn: () =>
      companyAPI.getRecruiters(companyId).then((r) => r.data.recruiters || []),
    enabled: !!companyId,
  });

  const recruiters = recruitersData || [];
  const linkedUserIds = recruiters.map((r) => r.user?._id || "");

  const handleUnlink = async (recruiterUserId) => {
    setUnlinking(recruiterUserId);
    try {
      await companyAPI.unlinkRecruiter(companyId, recruiterUserId);
      showSuccess("Recruiter unlinked");
      queryClient.invalidateQueries({ queryKey: ["company-recruiters", companyId] });
    } catch (err) {
      showError(err?.response?.data?.message || "Failed to unlink recruiter");
    } finally {
      setUnlinking(null);
    }
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["company-recruiters", companyId] });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* header row */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {recruiters.length} recruiter{recruiters.length !== 1 ? "s" : ""} linked to this company
        </p>
        {canManage && (
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => setShowLinkModal(true)}
          >
            <UserPlus className="w-4 h-4" /> Link Recruiter
          </Button>
        )}
      </div>

      {/* recruiter cards */}
      {recruiters.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No recruiters linked yet</p>
            {canManage && (
              <p className="text-xs text-muted-foreground mt-1">
                Click "Link Recruiter" to add a recruiter from this company.
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {recruiters.map((r) => (
            <div
              key={r._id}
              className="flex items-center gap-4 px-5 py-4 rounded-xl border bg-card"
            >
              {/* avatar */}
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-sm font-semibold text-primary">
                {r.user?.name?.charAt(0).toUpperCase() || "R"}
              </div>

              {/* info */}
              <div className="flex-1 min-w-0 space-y-0.5">
                <p className="text-sm font-medium truncate">{r.user?.name || "—"}</p>
                <p className="text-xs text-muted-foreground truncate">{r.user?.email || "—"}</p>
                {r.designation && (
                  <p className="text-xs text-muted-foreground">{r.designation}</p>
                )}
              </div>

              {/* verification badge */}
              <div className="shrink-0">
                {r.isVerified ? (
                  <Badge className="gap-1 border-0 text-[11px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                    <ShieldCheck className="w-3 h-3" /> Verified
                  </Badge>
                ) : (
                  <Badge className="gap-1 border-0 text-[11px] bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                    <ShieldX className="w-3 h-3" /> Unverified
                  </Badge>
                )}
              </div>

              {/* unlink button — TPO only */}
              {canManage && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => handleUnlink(r.user?._id)}
                  disabled={unlinking === r.user?._id}
                  title="Unlink recruiter"
                >
                  {unlinking === r.user?._id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* link modal */}
      <LinkRecruiterModal
        open={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        companyId={companyId}
        linkedIds={linkedUserIds}
        onLinked={invalidate}
      />
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function CompanyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useSelector((s) => s.auth);
  const canManage = ["tpo", "admin"].includes(user?.role);
  const [editModal, setEditModal] = useState(false);

  const { data: company, isLoading } = useQuery({
    queryKey: ["company", id],
    queryFn: async () => {
      const res = await companyAPI.getById(id);
      return res.data.company;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["companyStats", id],
    queryFn: async () => {
      const res = await companyAPI.getStats(id);
      return res.data.stats;
    },
    enabled: !!id,
  });

  const { data: historyData } = useQuery({
    queryKey: ["companyHistory", id],
    queryFn: async () => {
      const res = await companyAPI.getHistory(id);
      return res.data.history;
    },
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (data) => companyAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company", id] });
      showSuccess("Company updated");
      setEditModal(false);
    },
    onError: (err) => showError(err.response?.data?.message || "Update failed"),
  });

  const historyColumns = [
    { key: "year", label: "Year", sortable: true },
    { key: "driveCount", label: "Drives", sortable: true },
    { key: "totalOffers", label: "Offers", sortable: true },
    { key: "totalHired", label: "Hired", sortable: true },
    {
      key: "averagePackage",
      label: "Avg Package",
      sortable: true,
      render: (r) => `₹${r.averagePackage} LPA`,
    },
    {
      key: "highestPackage",
      label: "Highest",
      sortable: true,
      render: (r) => `₹${r.highestPackage} LPA`,
    },
    {
      key: "rolesOffered",
      label: "Roles",
      render: (r) => r.rolesOffered?.join(", ") || "—",
    },
  ];

  if (isLoading) return <Spinner className="mt-20" />;
  if (!company)
    return (
      <p className="text-center mt-20 text-muted-foreground">
        Company not found
      </p>
    );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <PageHeader
          title={company.name}
          subtitle={company.sector}
          actions={
            canManage && (
              <Button variant="outline" onClick={() => setEditModal(true)}>
                <Pencil className="h-4 w-4 mr-2" /> Edit
              </Button>
            )
          }
        />
      </div>

      {/* header card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-6">
            {canManage ? (
              <LogoUpload
                companyId={company._id}
                logoUrl={company.logo?.cloudinaryUrl}
                companyName={company.name}
              />
            ) : (
              <div className="h-20 w-20 rounded-xl border flex items-center justify-center bg-muted">
                {company.logo?.cloudinaryUrl ? (
                  <img
                    src={company.logo.cloudinaryUrl}
                    alt={company.name}
                    className="h-full w-full object-contain rounded-xl p-1"
                  />
                ) : (
                  <span className="text-3xl font-bold text-muted-foreground">
                    {company.name.charAt(0)}
                  </span>
                )}
              </div>
            )}

            <div className="flex-1 space-y-3">
              <div className="flex flex-wrap gap-2">
                {company.sector && <Badge>{company.sector}</Badge>}
                {!company.isActive && (
                  <Badge variant="destructive">Inactive</Badge>
                )}
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {company.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" /> {company.location}
                  </span>
                )}
                {company.packageRange?.min && (
                  <span className="flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4" />₹
                    {company.packageRange.min}–{company.packageRange.max} LPA
                  </span>
                )}
                {company.website && (
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 hover:text-primary"
                  >
                    <Globe className="h-4 w-4" /> {company.website}
                  </a>
                )}
              </div>

              {company.description && (
                <p className="text-sm text-muted-foreground">
                  {company.description}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          title="Total Drives"
          value={stats?.totalDrives ?? 0}
          icon={Briefcase}
        />
        <StatCard
          title="Total Offers"
          value={stats?.totalOffers ?? 0}
          icon={TrendingUp}
        />
        <StatCard
          title="Total Hired"
          value={stats?.totalHired ?? 0}
          icon={Users}
        />
        <StatCard
          title="Highest Package"
          value={stats?.highestEver ? `₹${stats.highestEver} LPA` : "—"}
          icon={TrendingUp}
        />
      </div>

      {/* tabs */}
      <Tabs defaultValue="recruiters">
        <TabsList>
          <TabsTrigger value="recruiters">
            <Users className="h-4 w-4 mr-1" /> Recruiters
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-1" /> Hiring History
          </TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
        </TabsList>

        {/* ── Recruiters tab ── */}
        <TabsContent value="recruiters" className="mt-4">
          <RecruitersTab companyId={id} canManage={canManage} />
        </TabsContent>

        {/* ── History tab ── */}
        <TabsContent value="history" className="mt-4">
          {!historyData || historyData.length === 0 ? (
            <p className="text-center text-muted-foreground py-10">
              No hiring history yet
            </p>
          ) : (
            <DataTable
              columns={historyColumns}
              data={historyData}
              emptyMessage="No history found"
            />
          )}
        </TabsContent>

        {/* ── About tab ── */}
        <TabsContent value="about" className="mt-4">
          <Card>
            <CardContent className="pt-6 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Company Name", value: company.name },
                  { label: "Sector", value: company.sector },
                  { label: "Location", value: company.location },
                  { label: "Website", value: company.website },
                  {
                    label: "Min Package",
                    value: company.packageRange?.min
                      ? `₹${company.packageRange.min} LPA`
                      : "—",
                  },
                  {
                    label: "Max Package",
                    value: company.packageRange?.max
                      ? `₹${company.packageRange.max} LPA`
                      : "—",
                  },
                  { label: "Added By", value: company.createdBy?.name },
                  {
                    label: "Added On",
                    value: new Date(company.createdAt).toLocaleDateString(),
                  },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="font-medium">{value || "—"}</p>
                  </div>
                ))}
              </div>
              {company.description && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Description
                    </p>
                    <p>{company.description}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CompanyFormModal
        open={editModal}
        onClose={() => setEditModal(false)}
        onSubmit={(data) => updateMutation.mutate(data)}
        company={company}
        loading={updateMutation.isPending}
      />
    </div>
  );
}