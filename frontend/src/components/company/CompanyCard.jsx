import { Link } from "react-router-dom";
import { MapPin, Globe, Briefcase, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function CompanyCard({ company, onEdit, onDelete, canManage }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-5">
        <div className="flex items-start gap-4">
          {/* logo */}
          <div className="h-14 w-14 rounded-lg border bg-muted flex items-center justify-center shrink-0 overflow-hidden">
            {company.logo?.cloudinaryUrl ? (
              <img
                src={company.logo.cloudinaryUrl}
                alt={company.name}
                className="h-full w-full object-contain p-1"
              />
            ) : (
              <span className="text-xl font-bold text-muted-foreground">
                {company.name.charAt(0)}
              </span>
            )}
          </div>

          {/* info */}
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <Link
                  to={`/companies/${company._id}`}
                  className="font-semibold hover:text-primary transition-colors line-clamp-1"
                >
                  {company.name}
                </Link>
                {company.sector && (
                  <Badge variant="secondary" className="mt-0.5 text-xs">
                    {company.sector}
                  </Badge>
                )}
              </div>
              {canManage && (
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(company)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => onDelete(company)}
                  >
                    Delete
                  </Button>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {company.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {company.location}
                </span>
              )}
              {company.packageRange?.min && (
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {company.packageRange.min}–{company.packageRange.max} LPA
                </span>
              )}
              {company.totalDrives > 0 && (
                <span className="flex items-center gap-1">
                  <Briefcase className="h-3 w-3" /> {company.totalDrives} drives
                </span>
              )}
              {company.website && (
                <a
                  href={company.website}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 hover:text-primary"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Globe className="h-3 w-3" /> Website
                </a>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
