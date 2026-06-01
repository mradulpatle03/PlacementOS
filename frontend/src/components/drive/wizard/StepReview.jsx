import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Loader2,
  CheckCircle2,
  Building2,
  Users,
  Settings,
  ListChecks,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { driveAPI } from "@/api/drive.api";
import { companyAPI } from "@/api/company.api";
import { useQuery } from "@tanstack/react-query";
import { showSuccess, showError } from "@/lib/toast";

export default function StepReview({ data, onBack }) {
  const navigate = useNavigate();

  const { data: company } = useQuery({
    queryKey: ["company", data.company],
    queryFn: async () => {
      const res = await companyAPI.getById(data.company);
      return res.data.company;
    },
    enabled: !!data.company,
  });

  const createMutation = useMutation({
    mutationFn: () => {
      const payload = {
        ...data,
        applicationDeadline: new Date(data.applicationDeadline).toISOString(),
        driveDate: data.driveDate
          ? new Date(data.driveDate).toISOString()
          : undefined,
      };
      return driveAPI.create(payload);
    },
    onSuccess: (res) => {
      showSuccess("Drive created successfully!");
      navigate(`/drives/${res.data.drive._id}`);
    },
    onError: (err) => {
      const msg = err.response?.data?.message;
      showError(
        Array.isArray(msg) ? msg.join(", ") : msg || "Failed to create drive",
      );
    },
  });

  const totalOpenings =
    data.roles?.reduce((s, r) => s + Number(r.openings || 1), 0) || 0;

  return (
    <div className="space-y-5">
      <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-start gap-3">
        <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-green-700 dark:text-green-300">
            Ready to create
          </p>
          <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
            Drive will be saved as <strong>Draft</strong>. You can publish it
            when ready.
          </p>
        </div>
      </div>

      {/* basics */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Building2 className="h-4 w-4" /> Drive Basics
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Company</p>
              <p className="font-medium">{company?.name || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Title</p>
              <p className="font-medium">{data.title}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Location</p>
              <p className="font-medium">{data.location || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Mode</p>
              <p className="font-medium capitalize">{data.mode}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                Application Deadline
              </p>
              <p className="font-medium">
                {new Date(data.applicationDeadline).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Openings</p>
              <p className="font-medium">{totalOpenings}</p>
            </div>
          </div>

          <Separator />
          <p className="text-xs text-muted-foreground font-medium">Roles</p>
          <div className="space-y-1">
            {data.roles?.map((r, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-sm"
              >
                <span>{r.title}</span>
                <div className="flex items-center gap-3 text-muted-foreground text-xs">
                  <span>₹{r.ctc} LPA</span>
                  <span>
                    {r.openings} opening{r.openings !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* eligibility */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4" /> Eligibility
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Min CGPA</p>
              <p className="font-medium">{data.eligibility?.minCGPA || 0}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Max Backlogs</p>
              <p className="font-medium">
                {data.eligibility?.maxBacklogs ?? 0}
              </p>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">
              Allowed Branches
            </p>
            <div className="flex flex-wrap gap-1">
              {data.eligibility?.allowedBranches?.map((b) => (
                <Badge key={b} variant="secondary" className="text-xs">
                  {b}
                </Badge>
              ))}
            </div>
          </div>
          {data.eligibility?.graduationYear?.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                Graduation Years
              </p>
              <div className="flex gap-1">
                {data.eligibility.graduationYear.map((y) => (
                  <Badge key={y} variant="outline" className="text-xs">
                    {y}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* rounds */}
      {data.rounds?.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <ListChecks className="h-4 w-4" /> Rounds ({data.rounds.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {data.rounds.map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">
                    {i + 1}
                  </span>
                  <span>{r.name}</span>
                  <span className="text-xs text-muted-foreground capitalize ml-auto">
                    {r.type?.replace("_", " ")}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Settings className="h-4 w-4" /> Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-1.5">
          {[
            {
              label: "One Offer Policy",
              value: data.settings?.oneOfferPolicy ? "Enabled" : "Disabled",
            },
            {
              label: "Dream Company Threshold",
              value: data.settings?.dreamPackageLPA
                ? `₹${data.settings.dreamPackageLPA} LPA`
                : "Not set",
            },
            {
              label: "Late Applications",
              value: data.settings?.allowLateApplications
                ? `Allowed (${data.settings.gracePeriodHours}h grace)`
                : "Not allowed",
            },
            {
              label: "Auto Shortlist",
              value: data.settings?.autoShortlist ? "Enabled" : "Disabled",
            },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between">
              <span className="text-muted-foreground">{label}</span>
              <span className="font-medium">{value}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onBack}>
          ← Back
        </Button>
        <Button
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending}
        >
          {createMutation.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Create Drive
        </Button>
      </div>
    </div>
  );
}
