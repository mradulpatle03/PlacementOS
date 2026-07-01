import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Mail,
  GraduationCap,
  Award,
  FileText,
  GitFork as Github,
  Link as Linkedin,
  Globe,
  Building2,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/ui/PageHeader";
import Spinner from "@/components/ui/Spinner";
import StatCard from "@/components/ui/StatCard";
import { studentAPI } from "@/api/student.api";
import { cn } from "@/lib/utils";

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

const GRADE_COLOR = {
  A: "text-emerald-600",
  B: "text-blue-600",
  C: "text-amber-600",
  D: "text-red-500",
};

export default function StudentProfileDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: student, isLoading } = useQuery({
    queryKey: ["student", id],
    queryFn: () => studentAPI.getById(id).then((r) => r.data.student),
    enabled: !!id,
  });

  if (isLoading) return <Spinner className="mt-20" />;
  if (!student)
    return (
      <p className="text-center mt-20 text-muted-foreground">
        Student not found
      </p>
    );

  const cfg =
    PLACEMENT_CONFIG[student.placementStatus] || PLACEMENT_CONFIG.unplaced;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <PageHeader
          title={student.user?.name || "Student"}
          subtitle={student.user?.email}
        />
      </div>

      {/* header card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-6 flex-wrap">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 text-2xl font-bold text-primary">
              {student.user?.name?.charAt(0).toUpperCase() || "S"}
            </div>

            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={cn("border-0 text-xs", cfg.class)}>
                  {cfg.label}
                </Badge>
                {student.user?.isActive === false && (
                  <Badge
                    variant="outline"
                    className="text-xs text-red-500 border-red-300"
                  >
                    Inactive account
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-4 h-4" /> {student.user?.email}
                </span>
                {student.rollNumber && (
                  <span className="flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4" /> {student.rollNumber}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-4 pt-1">
                {student.socialLinks?.linkedin && (
                  <a
                    href={student.socialLinks.linkedin}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs flex items-center gap-1 text-primary hover:underline"
                  >
                    <Linkedin className="w-3.5 h-3.5" /> LinkedIn
                  </a>
                )}
                {student.socialLinks?.github && (
                  <a
                    href={student.socialLinks.github}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs flex items-center gap-1 text-primary hover:underline"
                  >
                    <Github className="w-3.5 h-3.5" /> GitHub
                  </a>
                )}
                {student.socialLinks?.portfolio && (
                  <a
                    href={student.socialLinks.portfolio}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs flex items-center gap-1 text-primary hover:underline"
                  >
                    <Globe className="w-3.5 h-3.5" /> Portfolio
                  </a>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="CGPA" value={student.cgpa ?? "—"} icon={Award} />
        <StatCard
          title="Backlogs"
          value={student.backlogs ?? 0}
          icon={FileText}
        />
        <StatCard
          title="Branch"
          value={student.branch || "—"}
          icon={GraduationCap}
        />
        <StatCard
          title="Grad Year"
          value={student.graduationYear || "—"}
          icon={GraduationCap}
        />
      </div>

      {/* skills */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Skills</CardTitle>
        </CardHeader>
        <CardContent>
          {student.skills?.length ? (
            <div className="flex flex-wrap gap-2">
              {student.skills.map((s, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {s}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No skills added yet
            </p>
          )}
        </CardContent>
      </Card>

      {/* projects */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Projects</CardTitle>
        </CardHeader>
        <CardContent>
          {student.projects?.length ? (
            <div className="space-y-3">
              {student.projects.map((p) => (
                <div
                  key={p._id}
                  className="px-4 py-3 rounded-xl border bg-muted/20"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{p.title}</p>
                    {p.link && (
                      <a
                        href={p.link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1 shrink-0"
                      >
                        <ExternalLink className="w-3 h-3" /> View
                      </a>
                    )}
                  </div>
                  {p.description && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {p.description}
                    </p>
                  )}
                  {p.techStack?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {p.techStack.map((t, i) => (
                        <span
                          key={i}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No projects added yet
            </p>
          )}
        </CardContent>
      </Card>

      {/* resumes */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Resumes</CardTitle>
        </CardHeader>
        <CardContent>
          {student.resumes?.length ? (
            <div className="space-y-2">
              {student.resumes.map((r) => (
                <div
                  key={r._id}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-lg border bg-card"
                >
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate flex items-center gap-2">
                      {r.label}
                      {r.isPrimary && (
                        <Badge className="text-[10px] border-0 bg-primary/10 text-primary">
                          Primary
                        </Badge>
                      )}
                    </p>
                  </div>
                  {r.score != null && (
                    <span
                      className={cn(
                        "text-xs font-semibold shrink-0",
                        GRADE_COLOR[r.grade] || "text-muted-foreground",
                      )}
                    >
                      {r.score}/100{r.grade && ` (${r.grade})`}
                    </span>
                  )}
                  <a
                    href={r.cloudinaryUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    title="Open resume"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No resumes uploaded yet
            </p>
          )}
        </CardContent>
      </Card>

      {/* offered by */}
      {student.offeredBy?.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" /> Offered By
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {student.offeredBy.map((c) => (
                <Badge
                  key={c._id || c}
                  variant="outline"
                  className="text-xs gap-1"
                >
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />{" "}
                  {c.name || c}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}