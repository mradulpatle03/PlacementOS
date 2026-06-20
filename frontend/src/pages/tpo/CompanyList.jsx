import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Building2 } from "lucide-react";
import { useSelector } from "react-redux";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import CardListSkeleton from "@/components/ui/skeletons/CardListSkeleton";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import CompanyCard from "@/components/company/CompanyCard";
import CompanyFormModal from "@/components/company/CompanyFormModal";
import { companyAPI } from "@/api/company.api";
import { showSuccess, showError } from "@/lib/toast";

const SECTORS = [
  "Technology",
  "Finance",
  "Consulting",
  "Manufacturing",
  "Healthcare",
  "E-commerce",
  "Automobile",
  "Education",
  "Media",
  "Government",
  "Other",
];

export default function CompanyList() {
  const { user } = useSelector((s) => s.auth);
  const queryClient = useQueryClient();
  const canManage = ["tpo", "admin"].includes(user?.role);

  const [search, setSearch] = useState("");
  const [sector, setSector] = useState("all");
  const [formModal, setFormModal] = useState({ open: false, company: null });
  const [deleteConfirm, setDeleteConfirm] = useState({
    open: false,
    company: null,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["companies", { search, sector }],
    queryFn: async () => {
      const res = await companyAPI.getAll({
        search,
        sector: sector === "all" ? undefined : sector,
      });
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: companyAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      showSuccess("Company created");
      setFormModal({ open: false, company: null });
    },
    onError: (err) =>
      showError(err.response?.data?.message || "Failed to create company"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => companyAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      showSuccess("Company updated");
      setFormModal({ open: false, company: null });
    },
    onError: (err) =>
      showError(err.response?.data?.message || "Failed to update company"),
  });

  const deleteMutation = useMutation({
    mutationFn: companyAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      showSuccess("Company deleted");
      setDeleteConfirm({ open: false, company: null });
    },
    onError: (err) =>
      showError(err.response?.data?.message || "Failed to delete company"),
  });

  const handleSubmit = (formData) => {
    if (formModal.company) {
      updateMutation.mutate({ id: formModal.company._id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const companies = data?.companies || [];
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Companies"
        subtitle={`${data?.pagination?.total || 0} companies registered`}
        actions={
          canManage && (
            <Button onClick={() => setFormModal({ open: true, company: null })}>
              <Plus className="h-4 w-4 mr-2" /> Add Company
            </Button>
          )
        }
      />

      {/* filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-50">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search companies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={sector} onValueChange={setSector}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All sectors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sectors</SelectItem>
            {SECTORS.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(search || sector) && (
          <Button
            variant="ghost"
            onClick={() => {
              setSearch("");
              setSector("all");
            }}
          >
            Clear
          </Button>
        )}
      </div>

      {/* list */}
      {isLoading && <CardListSkeleton count={5} />}

      {!isLoading && companies.length === 0 && (
        <EmptyState
          icon={Building2}
          title="No companies found"
          description={
            search || sector
              ? "Try adjusting your filters"
              : "Add your first company to get started"
          }
          action={
            canManage && (
              <Button
                onClick={() => setFormModal({ open: true, company: null })}
              >
                <Plus className="h-4 w-4 mr-2" /> Add Company
              </Button>
            )
          }
        />
      )}

      <div className="space-y-3">
        {companies.map((company) => (
          <CompanyCard
            key={company._id}
            company={company}
            canManage={canManage}
            onEdit={(c) => setFormModal({ open: true, company: c })}
            onDelete={(c) => setDeleteConfirm({ open: true, company: c })}
          />
        ))}
      </div>

      {/* modals */}
      <CompanyFormModal
        open={formModal.open}
        onClose={() => setFormModal({ open: false, company: null })}
        onSubmit={handleSubmit}
        company={formModal.company}
        loading={isSubmitting}
      />

      <ConfirmDialog
        open={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, company: null })}
        onConfirm={() => deleteMutation.mutate(deleteConfirm.company?._id)}
        loading={deleteMutation.isPending}
        title="Delete Company"
        description={`Are you sure you want to delete "${deleteConfirm.company?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
      />
    </div>
  );
}
