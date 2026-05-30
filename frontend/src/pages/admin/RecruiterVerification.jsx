import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ShieldCheck, ShieldX, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Modal from "@/components/ui/Modal";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import Spinner from "@/components/ui/Spinner";
import StatusBadge from "@/components/ui/StatusBadge";
import DataTable from "@/components/ui/DataTable";
import { recruiterAPI } from "@/api/recruiter.api";
import { verifyRecruiterSchema } from "@/lib/validators/recruiter.schema";
import { showSuccess, showError } from "@/lib/toast";

function VerifyModal({ open, onClose, recruiter, onSubmit, loading }) {
  const [action, setAction] = useState("approve");
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(verifyRecruiterSchema),
    defaultValues: { action: "approve", rejectionReason: "" },
  });

  const handleClose = () => {
    reset();
    setAction("approve");
    onClose();
  };

  const onFormSubmit = (data) => onSubmit({ ...data, action });

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Verify Recruiter"
      description={
        recruiter ? `${recruiter.user?.name} — ${recruiter.user?.email}` : ""
      }
    >
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4 mt-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setAction("approve")}
            className={`p-3 rounded-md border text-sm font-medium flex items-center gap-2 transition-colors ${
              action === "approve"
                ? "border-green-500 bg-green-50 text-green-700"
                : "border-muted text-muted-foreground hover:border-green-300"
            }`}
          >
            <ShieldCheck className="h-4 w-4" /> Approve
          </button>
          <button
            type="button"
            onClick={() => setAction("reject")}
            className={`p-3 rounded-md border text-sm font-medium flex items-center gap-2 transition-colors ${
              action === "reject"
                ? "border-red-500 bg-red-50 text-red-700"
                : "border-muted text-muted-foreground hover:border-red-300"
            }`}
          >
            <ShieldX className="h-4 w-4" /> Reject
          </button>
        </div>

        {action === "reject" && (
          <div className="space-y-1">
            <Label>Rejection Reason *</Label>
            <Textarea
              placeholder="Explain why this recruiter is being rejected..."
              rows={3}
              {...register("rejectionReason")}
            />
            {errors.rejectionReason && (
              <p className="text-xs text-destructive">
                {errors.rejectionReason.message}
              </p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
            variant={action === "reject" ? "destructive" : "default"}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {action === "approve" ? "Approve Recruiter" : "Reject Recruiter"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function RecruiterCard({ recruiter, onVerify }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Avatar>
              <AvatarFallback>
                {recruiter.user?.name?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <p className="font-medium text-sm">{recruiter.user?.name}</p>
              <p className="text-xs text-muted-foreground">
                {recruiter.user?.email}
              </p>
              {recruiter.designation && (
                <p className="text-xs text-muted-foreground">
                  {recruiter.designation}
                </p>
              )}
              {recruiter.company?.name && (
                <p className="text-xs font-medium">{recruiter.company.name}</p>
              )}
              {recruiter.linkedinProfile && (
                <a
                  href={recruiter.linkedinProfile}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary flex items-center gap-1 hover:underline"
                >
                  LinkedIn <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {recruiter.bio && (
                <p className="text-xs text-muted-foreground max-w-xs">
                  {recruiter.bio}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Registered: {new Date(recruiter.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <Button size="sm" onClick={() => onVerify(recruiter)}>
            Review
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function RecruiterVerification() {
  const queryClient = useQueryClient();
  const [verifyModal, setVerifyModal] = useState({
    open: false,
    recruiter: null,
  });

  const { data: pending = [], isLoading: pendingLoading } = useQuery({
    queryKey: ["pendingRecruiters"],
    queryFn: async () => {
      const res = await recruiterAPI.getPendingRecruiters();
      return res.data.recruiters;
    },
  });

  const { data: allData, isLoading: allLoading } = useQuery({
    queryKey: ["allRecruiters"],
    queryFn: async () => {
      const res = await recruiterAPI.getAllRecruiters();
      return res.data;
    },
  });

  const verifyMutation = useMutation({
    mutationFn: ({ id, data }) => recruiterAPI.verifyRecruiter(id, data),
    onSuccess: (_, { data }) => {
      queryClient.invalidateQueries({ queryKey: ["pendingRecruiters"] });
      queryClient.invalidateQueries({ queryKey: ["allRecruiters"] });
      showSuccess(
        data.action === "approve" ? "Recruiter approved" : "Recruiter rejected",
      );
      setVerifyModal({ open: false, recruiter: null });
    },
    onError: (err) => showError(err.response?.data?.message || "Action failed"),
  });

  const allColumns = [
    {
      key: "name",
      label: "Name",
      render: (r) => (
        <div>
          <p className="font-medium text-sm">{r.user?.name}</p>
          <p className="text-xs text-muted-foreground">{r.user?.email}</p>
        </div>
      ),
    },
    {
      key: "designation",
      label: "Designation",
      render: (r) => r.designation || "—",
    },
    { key: "company", label: "Company", render: (r) => r.company?.name || "—" },
    {
      key: "isVerified",
      label: "Status",
      render: (r) => (
        <StatusBadge status={r.isVerified ? "verified" : "pending"} />
      ),
    },
    {
      key: "actions",
      label: "",
      render: (r) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setVerifyModal({ open: true, recruiter: r })}
        >
          Review
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recruiter Verification"
        subtitle={`${pending.length} pending verification${pending.length !== 1 ? "s" : ""}`}
      />

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="all">All Recruiters</TabsTrigger>
        </TabsList>

        {/* ── Pending tab ── */}
        <TabsContent value="pending" className="mt-4">
          {pendingLoading && <Spinner className="mt-10" />}
          {!pendingLoading && pending.length === 0 && (
            <EmptyState
              icon={ShieldCheck}
              title="No pending verifications"
              description="All recruiters have been reviewed"
            />
          )}
          <div className="space-y-3">
            {pending.map((r) => (
              <RecruiterCard
                key={r._id}
                recruiter={r}
                onVerify={(rec) =>
                  setVerifyModal({ open: true, recruiter: rec })
                }
              />
            ))}
          </div>
        </TabsContent>

        {/* ── All tab ── */}
        <TabsContent value="all" className="mt-4">
          <DataTable
            columns={allColumns}
            data={allData?.recruiters || []}
            loading={allLoading}
            emptyMessage="No recruiters found"
          />
        </TabsContent>
      </Tabs>

      <VerifyModal
        open={verifyModal.open}
        onClose={() => setVerifyModal({ open: false, recruiter: null })}
        recruiter={verifyModal.recruiter}
        onSubmit={(data) =>
          verifyMutation.mutate({
            id: verifyModal.recruiter._id,
            data,
          })
        }
        loading={verifyMutation.isPending}
      />
    </div>
  );
}
