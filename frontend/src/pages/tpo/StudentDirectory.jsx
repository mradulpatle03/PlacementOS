import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Search, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { studentAPI } from "@/api/student.api";
import { cn } from "@/lib/utils";

const BRANCHES = ["CSE", "IT", "ECE", "EEE", "ME", "CE", "Other"];

const PLACEMENT_CONFIG = {
  unplaced: {
    label: "Unplaced",
    class: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  },
  placed: {
    label: "Placed",
    class:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  dream_placed: {
    label: "Dream Placed 🌟",
    class:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  },
};

const CURRENT_YEAR = new Date().getFullYear();
const GRAD_YEARS = Array.from({ length: 6 }, (_, i) =>
  String(CURRENT_YEAR - 1 + i),
);

function StudentRow({ student }) {
  const cfg =
    PLACEMENT_CONFIG[student.placementStatus] || PLACEMENT_CONFIG.unplaced;

  return (
    <Link to={`/students/${student._id}`}>
      <div className="flex items-center gap-4 px-4 py-3.5 rounded-xl border bg-card hover:bg-muted/30 hover:shadow-sm transition-all">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-sm font-semibold text-primary">
          {student.user?.name?.charAt(0).toUpperCase() || "S"}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium truncate">
              {student.user?.name || "Unknown"}
            </p>
            {student.user?.isActive === false && (
              <Badge
                variant="outline"
                className="text-[10px] text-red-500 border-red-300"
              >
                Inactive
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {student.user?.email}
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground shrink-0">
          <span className="w-20 truncate">{student.rollNumber || "—"}</span>
          <span className="w-10">{student.branch || "—"}</span>
          <span className="w-20">CGPA {student.cgpa ?? "—"}</span>
          <span className="w-12">{student.graduationYear || "—"}</span>
        </div>

        <Badge className={cn("border-0 text-[11px] shrink-0", cfg.class)}>
          {cfg.label}
        </Badge>
      </div>
    </Link>
  );
}

export default function StudentDirectory() {
  const [search, setSearch] = useState("");
  const [branch, setBranch] = useState("all");
  const [graduationYear, setGraduationYear] = useState("all");
  const [placementStatus, setPlacementStatus] = useState("all");
  const [page, setPage] = useState(1);
  const limit = 20;

  const params = {
    search: search || undefined,
    branch: branch === "all" ? undefined : branch,
    graduationYear: graduationYear === "all" ? undefined : graduationYear,
    placementStatus: placementStatus === "all" ? undefined : placementStatus,
    page,
    limit,
  };

  const { data, isLoading } = useQuery({
    queryKey: ["students", params],
    queryFn: () => studentAPI.getAll(params).then((r) => r.data),
  });

  const students = data?.students || [];
  const pagination = data?.pagination || { total: 0, page: 1, pages: 1 };

  const hasFilters =
    !!search ||
    branch !== "all" ||
    graduationYear !== "all" ||
    placementStatus !== "all";

  const resetFilters = () => {
    setSearch("");
    setBranch("all");
    setGraduationYear("all");
    setPlacementStatus("all");
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        subtitle={`${pagination.total || 0} students registered`}
      />

      {/* filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-50">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, roll number..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>

        <Select
          value={branch}
          onValueChange={(v) => {
            setBranch(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All branches" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All branches</SelectItem>
            {BRANCHES.map((b) => (
              <SelectItem key={b} value={b}>
                {b}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={graduationYear}
          onValueChange={(v) => {
            setGraduationYear(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="All years" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All years</SelectItem>
            {GRAD_YEARS.map((y) => (
              <SelectItem key={y} value={y}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={placementStatus}
          onValueChange={(v) => {
            setPlacementStatus(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="unplaced">Unplaced</SelectItem>
            <SelectItem value="placed">Placed</SelectItem>
            <SelectItem value="dream_placed">Dream Placed</SelectItem>
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" onClick={resetFilters}>
            Clear
          </Button>
        )}
      </div>

      {isLoading && <CardListSkeleton count={6} />}

      {!isLoading && students.length === 0 && (
        <EmptyState
          icon={Users}
          title="No students found"
          description={
            hasFilters
              ? "Try adjusting your filters"
              : "No students have registered yet"
          }
        />
      )}

      <div className="space-y-2">
        {students.map((s) => (
          <StudentRow key={s._id} student={s} />
        ))}
      </div>

      {/* pagination */}
      {!isLoading && pagination.pages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            Page {pagination.page} of {pagination.pages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagination.pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}