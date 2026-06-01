import { Link } from "react-router-dom";
import { MapPin, Clock, Users, Briefcase, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  getDriveStatusColor,
  getDriveCTCRange,
  getDeadlineStatus,
} from "@/lib/driveUtils";

export default function DriveCard({ drive, actions }) {
  const deadline = getDeadlineStatus(drive.applicationDeadline);
  const ctcRange = getDriveCTCRange(drive.roles);
  const totalOpenings =
    drive.roles?.reduce((s, r) => s + (r.openings || 1), 0) || 0;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-5">
        <div className="flex items-start gap-4">
          {/* company logo */}
          <div className="h-12 w-12 rounded-lg border bg-muted flex items-center justify-center shrink-0 overflow-hidden">
            {drive.company?.logo?.cloudinaryUrl ? (
              <img
                src={drive.company.logo.cloudinaryUrl}
                alt={drive.company?.name}
                className="h-full w-full object-contain p-1"
              />
            ) : (
              <Building2 className="h-6 w-6 text-muted-foreground" />
            )}
          </div>

          {/* main content */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link
                  to={`/drives/${drive._id}`}
                  className="font-semibold hover:text-primary transition-colors line-clamp-1 block"
                >
                  {drive.title}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {drive.company?.name}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={cn(
                    "text-xs font-medium px-2 py-0.5 rounded-full capitalize",
                    getDriveStatusColor(drive.status),
                  )}
                >
                  {drive.status}
                </span>
              </div>
            </div>

            {/* roles chips */}
            <div className="flex flex-wrap gap-1">
              {drive.roles?.slice(0, 3).map((role, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {role.title}
                </Badge>
              ))}
              {drive.roles?.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{drive.roles.length - 3} more
                </Badge>
              )}
            </div>

            {/* meta row */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{ctcRange}</span>

              {drive.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {drive.location}
                </span>
              )}

              <span className="flex items-center gap-1 capitalize">
                <Briefcase className="h-3 w-3" />
                {drive.mode === "oncampus"
                  ? "On Campus"
                  : drive.mode === "offcampus"
                    ? "Off Campus"
                    : "Hybrid"}
              </span>

              {totalOpenings > 0 && (
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" /> {totalOpenings} opening
                  {totalOpenings !== 1 ? "s" : ""}
                </span>
              )}

              {deadline && (
                <span
                  className={cn(
                    "flex items-center gap-1 font-medium",
                    deadline.color,
                  )}
                >
                  <Clock className="h-3 w-3" /> {deadline.label}
                </span>
              )}
            </div>

            {/* eligibility chips */}
            <div className="flex flex-wrap gap-1">
              {drive.eligibility?.minCGPA > 0 && (
                <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                  CGPA ≥ {drive.eligibility.minCGPA}
                </span>
              )}
              {drive.eligibility?.allowedBranches?.length < 7 && (
                <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                  {drive.eligibility.allowedBranches.slice(0, 3).join(", ")}
                  {drive.eligibility.allowedBranches.length > 3 ? "..." : ""}
                </span>
              )}
              {drive.eligibility?.maxBacklogs === 0 && (
                <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                  No backlogs
                </span>
              )}
            </div>

            {/* actions slot */}
            {actions && <div className="flex gap-2 pt-1">{actions}</div>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
