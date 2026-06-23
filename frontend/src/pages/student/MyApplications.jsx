import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getMyApplications,
  withdrawApplication,
} from "../../api/application.api";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import { Loader2, FileText, Building2, Calendar, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { CardListSkeleton } from "@/components/ui/skeletons";
import { Link, useNavigate } from "react-router-dom";

// status badge config
// const STATUS_CONFIG = {
//   applied: {
//     label: "Applied",
//     class: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
//   },
//   shortlisted: {
//     label: "Shortlisted",
//     class:
//       "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
//   },
//   oa: {
//     label: "OA",
//     class:
//       "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
//   },
//   interview: {
//     label: "Interview",
//     class:
//       "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
//   },
//   selected: {
//     label: "Selected 🎉",
//     class:
//       "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
//   },
//   rejected: {
//     label: "Rejected",
//     class: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
//   },
//   withdrawn: {
//     label: "Withdrawn",
//     class: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
//   },
// };
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
    label: "Online Assessment",
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
    label: "Offered",
    class:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  },

  accepted: {
    label: "Accepted 🎉",
    class:
      "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  },

  // Legacy aliases
  interview: {
    label: "Interview",
    class:
      "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  },

  selected: {
    label: "Selected 🎉",
    class:
      "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  },

  // Exit statuses
  rejected: {
    label: "Rejected",
    class: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  },

  withdrawn: {
    label: "Withdrawn",
    class: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  },
};

const MyApplications = () => {
  const [statusFilter, setStatusFilter] = useState("all");
  const [withdrawId, setWithdrawId] = useState(null);
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["my-applications", statusFilter, page],
    queryFn: () =>
      getMyApplications({
        status: statusFilter === "all" ? undefined : statusFilter,
        page,
        limit: 10,
      }).then((r) => r.data.data),
  });

  const { mutate: withdraw, isPending: withdrawing } = useMutation({
    mutationFn: () => withdrawApplication(withdrawId),
    onSuccess: () => {
      toast.success("Application withdrawn");
      queryClient.invalidateQueries({ queryKey: ["my-applications"] });
      setWithdrawId(null);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Failed to withdraw");
      setWithdrawId(null);
    },
  });

  const applications = data?.applications || [];
  const pagination = data?.pagination;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      {/* header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Applications</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track all your placement drive applications
          </p>
        </div>

        {/* status filter */}
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([key, val]) => (
              <SelectItem key={key} value={key}>
                {val.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* list */}
      {isLoading ? (
        <CardListSkeleton count={5} />
      ) : isError ? (
        <p className="py-16 text-center text-sm text-destructive">
          Failed to load applications.
        </p>
      ) : applications.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center">
          <FileText className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No applications found.
          </p>
          <Button
            variant="link"
            className="mt-1"
            onClick={() => (window.location.href = "/drives")}
          >
            Browse open drives
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => {
            const status = STATUS_CONFIG[app.status] || STATUS_CONFIG.applied;
            const canWithdraw = !["withdrawn", "selected", "rejected"].includes(
              app.status,
            );

            return (
              <div
                key={app._id}
                className="rounded-xl border bg-card px-5 py-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* left — drive info */}
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold truncate">
                        {app.drive?.title || "Drive"}
                      </p>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${status.class}`}
                      >
                        {status.label}
                      </span>
                      {app.status === "offered" && (
                        <Link
                          to="/offers"
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                        >
                          <FileText className="w-3 h-3" />
                          View offer letter →
                        </Link>
                      )}
                      {/* Show Take Assessment button if there's a linked active assessment */}
                      {app.activeAssessmentId && app.status === "oa" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            navigate(
                              `/assessments/${app.activeAssessmentId}/take`,
                            )
                          }
                        >
                          <ClipboardList className="h-4 w-4 mr-1" />
                          Take Assessment
                        </Button>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {app.drive?.company?.name || "—"}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {app.resume?.label || "Resume"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Applied{" "}
                        {app.appliedAt
                          ? format(new Date(app.appliedAt), "dd MMM yyyy")
                          : "—"}
                      </span>
                    </div>

                    {app.remarks && (
                      <p className="mt-1 text-xs text-muted-foreground italic">
                        Remark: {app.remarks}
                      </p>
                    )}
                  </div>

                  {/* right — action */}
                  {canWithdraw && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0 text-destructive hover:bg-destructive/10"
                      onClick={() => setWithdrawId(app._id)}
                    >
                      Withdraw
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page === pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {/* withdraw confirm dialog */}
      <AlertDialog open={!!withdrawId} onOpenChange={() => setWithdrawId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Withdraw Application?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. You will not be able to re-apply to
              this drive after withdrawing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={withdrawing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => withdraw()}
              disabled={withdrawing}
              className="bg-destructive hover:bg-destructive/90"
            >
              {withdrawing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Yes, Withdraw"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MyApplications;
