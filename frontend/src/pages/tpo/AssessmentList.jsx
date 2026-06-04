import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus,
  ClipboardList,
  ArrowLeft,
  Users,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Loader2,
} from "lucide-react";

import { assessmentAPI } from "@/api/assessment.api";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const STATUS_STYLES = {
  draft: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  active:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  closed: "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400",
};

export default function AssessmentList() {
  const { driveId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["assessments", driveId],
    queryFn: () =>
      assessmentAPI.getByDrive(driveId).then((r) => r.data.data.assessments),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => assessmentAPI.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assessments", driveId] });
      toast.success("Status updated");
    },
    onError: (err) =>
      toast.error(err?.response?.data?.message || "Failed to update status"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => assessmentAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assessments", driveId] });
      toast.success("Assessment deleted");
    },
    onError: (err) =>
      toast.error(err?.response?.data?.message || "Failed to delete"),
  });

  const assessments = data || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Assessments"
        subtitle="Manage online assessments for this drive"
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(-1)}
              className="gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() =>
                navigate(`/tpo/drives/${driveId}/assessments/create`)
              }
            >
              <Plus className="w-4 h-4" /> New Assessment
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : assessments.length === 0 ? (
        <Card>
          <CardContent className="pt-0">
            <EmptyState
              icon={ClipboardList}
              title="No assessments yet"
              description="Create an assessment for this drive."
              action={
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={() =>
                    navigate(`/tpo/drives/${driveId}/assessments/create`)
                  }
                >
                  <Plus className="w-4 h-4" /> Create Assessment
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {assessments.map((a) => (
            <Card key={a._id} className="hover:shadow-sm transition-shadow">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{a.title}</p>
                      <span
                        className={cn(
                          "text-[11px] font-medium px-2 py-0.5 rounded-full capitalize",
                          STATUS_STYLES[a.status],
                        )}
                      >
                        {a.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {a.totalQuestions} question
                      {a.totalQuestions !== 1 ? "s" : ""}
                      {" · "}
                      {a.totalMarks} marks
                      {" · "}
                      {a.durationMinutes} min
                    </p>
                    {a.startsAt && (
                      <p className="text-xs text-muted-foreground">
                        Opens: {new Date(a.startsAt).toLocaleString("en-IN")}
                        {a.endsAt &&
                          ` · Closes: ${new Date(a.endsAt).toLocaleString("en-IN")}`}
                      </p>
                    )}
                  </div>

                  {/* actions */}
                  <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                    {/* view submissions */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={() =>
                        navigate(
                          `/tpo/drives/${driveId}/assessments/${a._id}/submissions`,
                        )
                      }
                    >
                      <Users className="w-3.5 h-3.5" />
                      Results
                    </Button>

                    {/* activate / close toggle */}
                    {a.status === "draft" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                        onClick={() =>
                          statusMutation.mutate({ id: a._id, status: "active" })
                        }
                        disabled={statusMutation.isPending}
                      >
                        <ToggleLeft className="w-3.5 h-3.5" />
                        Activate
                      </Button>
                    )}
                    {a.status === "active" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs text-amber-600 border-amber-300 hover:bg-amber-50"
                        onClick={() =>
                          statusMutation.mutate({ id: a._id, status: "closed" })
                        }
                        disabled={statusMutation.isPending}
                      >
                        <ToggleRight className="w-3.5 h-3.5" />
                        Close
                      </Button>
                    )}

                    {/* delete (draft only) */}
                    {a.status === "draft" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => deleteMutation.mutate(a._id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
