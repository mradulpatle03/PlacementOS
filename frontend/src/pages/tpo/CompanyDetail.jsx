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
      <Tabs defaultValue="history">
        <TabsList>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-1" /> Hiring History
          </TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
        </TabsList>

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
