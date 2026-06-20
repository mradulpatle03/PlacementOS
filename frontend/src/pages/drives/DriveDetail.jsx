import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Users,
  Clock,
  Briefcase,
  Globe,
  FileText,
  Pencil,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import PageHeader from "@/components/ui/PageHeader";
import Spinner from "@/components/ui/Spinner";
import PDFPreviewModal from "@/components/ui/PDFPreviewModal";
import DriveStatusControl from "@/components/drive/DriveStatusControl";
import RoundsTimeline from "@/components/drive/RoundsTimeline";
import EligibilityChecker from "@/components/drive/EligibilityChecker";
import { driveAPI } from "@/api/drive.api";
import { studentAPI } from "@/api/student.api";
import { getDriveCTCRange, getDeadlineStatus } from "@/lib/driveUtils";
import ApplyModal from "../../components/drive/ApplyModal";
import { EligibilityBadge } from "../../components/drive/EligibilityBadge";
import { Kanban } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DriveDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);
  const isTPO = ["tpo", "admin"].includes(user?.role);
  const isStudent = user?.role === "student";
  const isRecruiter = user?.role === "recruiter";
  const [jdPreview, setJdPreview] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["drive", id],
    queryFn: async () => {
      const res = await driveAPI.getById(id);
      return res.data;
    },
  });

  const { data: studentProfile } = useQuery({
    queryKey: ["studentProfile"],
    queryFn: async () => {
      const res = await studentAPI.getMyProfile();
      return res.data.student;
    },
    enabled: isStudent,
  });

  if (isLoading) return <Spinner className="mt-20" />;
  if (!data?.drive)
    return (
      <div className="text-center mt-20 text-muted-foreground">
        Drive not found
      </div>
    );

  const { drive, allowedTransitions } = data;
  const deadline = getDeadlineStatus(drive.applicationDeadline);
  const ctcRange = getDriveCTCRange(drive.roles);
  const totalOpenings =
    drive.roles?.reduce((s, r) => s + (r.openings || 1), 0) || 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* back button */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <p className="text-sm text-muted-foreground">Back to drives</p>
      </div>

      {/* header */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">{drive.title}</h1>
            <div className="flex items-center gap-2">
              {drive.company?.logo?.cloudinaryUrl ? (
                <img
                  src={drive.company.logo.cloudinaryUrl}
                  alt={drive.company.name}
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : null}
              <p className="text-muted-foreground">{drive.company?.name}</p>
              {drive.company?.sector && (
                <Badge variant="secondary">{drive.company.sector}</Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {isTPO && (
              <>
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/drives/${id}/edit`}>
                    <Pencil className="h-4 w-4 mr-1" /> Edit
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    navigate(`/tpo/drives/${drive._id}/applicants`)
                  }
                >
                  <Users className="mr-2 h-4 w-4" />
                  View Applicants
                </Button>
                <DriveStatusControl
                  driveId={id}
                  status={drive.status}
                  allowedTransitions={allowedTransitions}
                />
              </>
            )}
            {isTPO && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/tpo/drives/${id}/pipeline`)}
              >
                <Kanban className="h-4 w-4 mr-2" />
                View Pipeline
              </Button>
            )}
            {!isTPO && (
              <DriveStatusControl
                driveId={id}
                status={drive.status}
                allowedTransitions={[]}
              />
            )}
            {["tpo", "recruiter", "admin"].includes(user?.role) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/tpo/drives/${drive._id}/interviews`)}
                className="gap-1.5"
              >
                <Calendar className="w-4 h-4" />
                Interviews
              </Button>
            )}
            {isTPO && (
              <Link
                to={`/tpo/drives/${drive._id}/offers`}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                  location.pathname.includes("/offers")
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
              >
                <FileText className="w-4 h-4" />
                Offers
              </Link>
            )}
          </div>
        </div>

        {/* quick stats bar */}
        <div className="flex flex-wrap gap-4 text-sm">
          <span className="flex items-center gap-1.5 font-semibold text-base">
            {ctcRange}
          </span>
          {drive.location && (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="h-4 w-4" /> {drive.location}
            </span>
          )}
          <span className="flex items-center gap-1.5 text-muted-foreground capitalize">
            <Briefcase className="h-4 w-4" />
            {drive.mode === "oncampus"
              ? "On Campus"
              : drive.mode === "offcampus"
                ? "Off Campus"
                : "Hybrid"}
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Users className="h-4 w-4" /> {totalOpenings} opening
            {totalOpenings !== 1 ? "s" : ""}
          </span>
          {deadline && (
            <span
              className={`flex items-center gap-1.5 font-medium ${deadline.color}`}
            >
              <Clock className="h-4 w-4" />
              Deadline:{" "}
              {new Date(drive.applicationDeadline).toLocaleDateString()} (
              {deadline.label})
            </span>
          )}
        </div>
      </div>

      {/* student eligibility checker */}
      {isStudent && (
        <EligibilityChecker drive={drive} student={studentProfile} />
      )}

      {/* student apply button */}
      {isStudent && drive.status === "open" && (
        <Card className="border-primary/50">
          <CardContent className="pt-4 pb-4 flex items-center justify-between">
            <div>
              <p className="font-medium">Interested in this drive?</p>
              <p className="text-sm text-muted-foreground">
                Application closes{" "}
                {new Date(drive.applicationDeadline).toLocaleDateString()}
              </p>
            </div>
            {isStudent && drive?.status === "open" && (
              <div className="flex items-center gap-3">
                <EligibilityBadge driveId={drive._id} />
                <Button onClick={() => setApplyOpen(true)}>Apply Now</Button>
              </div>
            )}

            {/* Apply Modal */}
            {isStudent && (
              <ApplyModal
                open={applyOpen}
                onClose={() => setApplyOpen(false)}
                drive={drive}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* main content tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* left — main info */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="rounds">
                Rounds {drive.rounds?.length ? `(${drive.rounds.length})` : ""}
              </TabsTrigger>
              <TabsTrigger value="eligibility">Eligibility</TabsTrigger>
              {isTPO && <TabsTrigger value="stats">Stats</TabsTrigger>}
            </TabsList>

            {/* overview */}
            <TabsContent value="overview" className="mt-4 space-y-4">
              {/* roles */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Roles & CTC</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {drive.roles?.map((role, i) => (
                    <div key={i} className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm">{role.title}</p>
                        {role.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {role.description}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <p className="font-semibold text-sm">₹{role.ctc} LPA</p>
                        <p className="text-xs text-muted-foreground">
                          {role.openings} opening
                          {role.openings !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* company info */}
              {drive.company?.description && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">
                      About {drive.company.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {drive.company.description}
                    </p>
                    {drive.company.website && (
                      <a
                        href={drive.company.website}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-primary flex items-center gap-1 mt-2 hover:underline"
                      >
                        <Globe className="h-3.5 w-3.5" /> Visit website
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* JD */}
              {drive.jd?.cloudinaryUrl && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Job Description</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setJdPreview(true)}
                    >
                      <FileText className="h-4 w-4 mr-2" /> Preview JD
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* rounds */}
            <TabsContent value="rounds" className="mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Interview Process</CardTitle>
                </CardHeader>
                <CardContent>
                  <RoundsTimeline rounds={drive.rounds} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* eligibility */}
            <TabsContent value="eligibility" className="mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">
                    Eligibility Criteria
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Minimum CGPA
                      </p>
                      <p className="font-medium">
                        {drive.eligibility?.minCGPA > 0
                          ? `≥ ${drive.eligibility.minCGPA}`
                          : "No requirement"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Max Backlogs
                      </p>
                      <p className="font-medium">
                        {drive.eligibility?.maxBacklogs === 0
                          ? "No active backlogs"
                          : `≤ ${drive.eligibility.maxBacklogs}`}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Gender</p>
                      <p className="font-medium capitalize">
                        {drive.eligibility?.genderRestriction === "any"
                          ? "All genders"
                          : drive.eligibility?.genderRestriction}
                      </p>
                    </div>
                    {drive.eligibility?.graduationYear?.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Graduation Years
                        </p>
                        <p className="font-medium">
                          {drive.eligibility.graduationYear.join(", ")}
                        </p>
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div>
                    <p className="text-xs text-muted-foreground mb-2">
                      Allowed Branches
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {drive.eligibility?.allowedBranches?.map((b) => (
                        <Badge key={b} variant="secondary">
                          {b}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* stats (TPO only) */}
            {isTPO && (
              <TabsContent value="stats" className="mt-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Drive Statistics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      {[
                        {
                          label: "Applications",
                          value: drive.totalApplications || 0,
                        },
                        {
                          label: "Shortlisted",
                          value: drive.totalShortlisted || 0,
                        },
                        { label: "Offers", value: drive.totalOffers || 0 },
                      ].map(({ label, value }) => (
                        <div key={label} className="space-y-1">
                          <p className="text-2xl font-bold">{value}</p>
                          <p className="text-xs text-muted-foreground">
                            {label}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </div>

        {/* right — sidebar info */}
        <div className="space-y-4">
          {/* key dates */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Key Dates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">
                  Application Deadline
                </p>
                <p className="font-medium">
                  {new Date(drive.applicationDeadline).toLocaleString()}
                </p>
                {deadline && (
                  <p className={`text-xs font-medium mt-0.5 ${deadline.color}`}>
                    {deadline.label}
                  </p>
                )}
              </div>
              {drive.driveDate && (
                <div>
                  <p className="text-xs text-muted-foreground">Drive Date</p>
                  <p className="font-medium">
                    {new Date(drive.driveDate).toLocaleString()}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground">Posted On</p>
                <p className="font-medium">
                  {new Date(drive.createdAt).toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* settings (TPO/recruiter) */}
          {(isTPO || isRecruiter) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Drive Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {[
                  {
                    label: "One Offer Policy",
                    value: drive.settings?.oneOfferPolicy
                      ? "Enabled"
                      : "Disabled",
                  },
                  {
                    label: "Dream Company",
                    value: drive.settings?.dreamPackageLPA
                      ? `₹${drive.settings.dreamPackageLPA} LPA+`
                      : "Not set",
                  },
                  {
                    label: "Late Applications",
                    value: drive.settings?.allowLateApplications
                      ? `Yes (${drive.settings.gracePeriodHours}h grace)`
                      : "No",
                  },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium text-xs">{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* TPO actions */}
          {isTPO && drive.jd?.cloudinaryUrl && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setJdPreview(true)}
                >
                  <FileText className="h-4 w-4 mr-2" /> View JD
                </Button>
              </CardContent>
            </Card>
          )}

          {/* created by */}
          <Card>
            <CardContent className="pt-4 text-xs text-muted-foreground">
              Created by {drive.createdBy?.name || "—"}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* JD preview modal */}
      {drive.jd?.cloudinaryUrl && (
        <PDFPreviewModal
          open={jdPreview}
          onClose={() => setJdPreview(false)}
          previewUrl={driveAPI.getJDPreviewUrl(id)}
          title={`JD — ${drive.title}`}
        />
      )}
    </div>
  );
}
