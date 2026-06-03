import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  getEligibleStudents,
  exportEligibleStudents,
} from "../../api/eligibility.api";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../components/ui/tooltip";
import {
  CheckCircle2,
  XCircle,
  Download,
  Search,
  Loader2,
  AlertTriangle,
  Users,
} from "lucide-react";
import { toast } from "sonner";

// student row
const StudentRow = ({ student, showReasons = false }) => (
  <div className="flex items-start justify-between gap-4 rounded-lg border bg-card px-4 py-3 hover:shadow-sm transition-shadow">
    <div className="min-w-0 space-y-0.5">
      <div className="flex items-center gap-2 flex-wrap">
        <p className="font-medium text-sm">{student.name}</p>
        <span className="text-xs text-muted-foreground">{student.email}</span>
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
        <span>{student.rollNumber || "—"}</span>
        <span>{student.branch || "—"}</span>
        <span>CGPA: {student.cgpa ?? "—"}</span>
        <span>Backlogs: {student.backlogs ?? 0}</span>
        <span>{student.graduationYear || "—"}</span>
        <Badge
          variant="outline"
          className={
            student.placementStatus === "placed"
              ? "border-green-500 text-green-600 text-xs"
              : "text-xs"
          }
        >
          {student.placementStatus || "unplaced"}
        </Badge>
      </div>

      {/* ineligibility reasons */}
      {showReasons && student.reasons?.length > 0 && (
        <div className="mt-2 space-y-1">
          {student.reasons.map((r, i) => (
            <p
              key={i}
              className="flex items-start gap-1.5 text-xs text-red-600 dark:text-red-400"
            >
              <XCircle className="h-3 w-3 mt-0.5 shrink-0" />
              {r}
            </p>
          ))}
        </div>
      )}

      {/* warnings */}
      {student.warnings?.length > 0 && (
        <div className="mt-1 space-y-1">
          {student.warnings.map((w, i) => (
            <p
              key={i}
              className="flex items-start gap-1.5 text-xs text-yellow-600 dark:text-yellow-400"
            >
              <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
              {w}
            </p>
          ))}
        </div>
      )}
    </div>
  </div>
);

// main page
const DriveApplicants = () => {
  const { driveId } = useParams();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("eligible");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["drive-eligible-students", driveId],
    queryFn: () => getEligibleStudents(driveId).then((r) => r.data.data),
    enabled: !!driveId,
  });

  // export mutation
  const { mutate: doExport, isPending: exporting } = useMutation({
    mutationFn: () => exportEligibleStudents(driveId, data?.driveTitle),
    onSuccess: () => toast.success("Excel downloaded"),
    onError: () => toast.error("Export failed"),
  });

  const eligible = data?.eligible || [];
  const ineligible = data?.ineligible || [];
  const summary = data?.summary || {};

  // client-side search filter
  const filterStudents = (list) => {
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (s) =>
        s.name?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.rollNumber?.toLowerCase().includes(q) ||
        s.branch?.toLowerCase().includes(q),
    );
  };

  const filteredEligible = filterStudents(eligible);
  const filteredIneligible = filterStudents(ineligible);

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <p className="py-24 text-center text-sm text-destructive">
        Failed to load student data.
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      {/* header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{data?.driveTitle}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Eligibility screening results
          </p>
        </div>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                onClick={() => doExport()}
                disabled={exporting}
              >
                {exporting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Export Excel
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Download full eligible + ineligible list as .xlsx
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: "Total Students",
            value: summary.total,
            icon: Users,
            color: "text-foreground",
          },
          {
            label: "Eligible",
            value: summary.eligible,
            icon: CheckCircle2,
            color: "text-green-600",
          },
          {
            label: "Ineligible",
            value: summary.ineligible,
            icon: XCircle,
            color: "text-red-500",
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="rounded-xl border bg-card px-5 py-4 text-center shadow-sm"
          >
            <Icon className={`mx-auto mb-1 h-5 w-5 ${color}`} />
            <p className={`text-2xl font-bold ${color}`}>{value ?? "—"}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, roll number, branch…"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full">
          <TabsTrigger value="eligible" className="flex-1 gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            Eligible
            <Badge variant="secondary">{filteredEligible.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="ineligible" className="flex-1 gap-2">
            <XCircle className="h-4 w-4 text-red-500" />
            Ineligible
            <Badge variant="secondary">{filteredIneligible.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="eligible" className="mt-4 space-y-2">
          {filteredEligible.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No eligible students found.
            </p>
          ) : (
            filteredEligible.map((s) => (
              <StudentRow key={s.studentId} student={s} showReasons={false} />
            ))
          )}
        </TabsContent>

        <TabsContent value="ineligible" className="mt-4 space-y-2">
          {filteredIneligible.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No ineligible students.
            </p>
          ) : (
            filteredIneligible.map((s) => (
              <StudentRow key={s.studentId} student={s} showReasons={true} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DriveApplicants;
