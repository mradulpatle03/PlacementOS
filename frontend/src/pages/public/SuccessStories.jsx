import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Quote,
  Award,
  GraduationCap,
  Building2,
  ChevronDown,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/ui/EmptyState";
import { publicAPI } from "@/api/public.api";
import { cn } from "@/lib/utils";
import { SEO } from "@/components/seo/SEO";

const BRANCHES = ["CSE", "IT", "ECE", "EEE", "ME", "CE", "Other"];

function StoryCard({ story, featured }) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-shadow hover:shadow-lg",
        featured && "ring-2 ring-primary/30",
      )}
    >
      {featured && (
        <div className="absolute top-3 right-3">
          <Badge className="bg-primary text-primary-foreground border-0 text-[10px] gap-1">
            <Award className="w-3 h-3" /> Featured
          </Badge>
        </div>
      )}

      <CardContent className="pt-6 pb-6 space-y-4">
        <Quote className="w-7 h-7 text-primary/30" />

        <p className="text-sm text-foreground/90 leading-relaxed">
          {story.testimonial}
        </p>

        <div className="flex items-center gap-3 pt-3 border-t">
          {story.photoUrl ? (
            <img
              src={story.photoUrl}
              alt={story.studentName}
              loading="lazy"
              className="h-11 w-11 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center text-base font-semibold text-primary shrink-0">
              {story.studentName?.charAt(0)}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">
              {story.studentName}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {story.role ? `${story.role} at ` : ""}
              <span className="font-medium">{story.companyName}</span>
            </p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {story.branch && (
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <GraduationCap className="w-3 h-3" /> {story.branch}
                </span>
              )}
              {story.ctc && (
                <span className="text-[11px] text-emerald-600 font-medium">
                  ₹{story.ctc} LPA
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StoryCardSkeleton() {
  return (
    <Card>
      <CardContent className="pt-6 pb-6 space-y-4">
        <Skeleton className="h-7 w-7 rounded" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <div className="flex items-center gap-3 pt-3 border-t">
          <Skeleton className="h-11 w-11 rounded-full shrink-0" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SuccessStories() {
  const [branchFilter, setBranchFilter] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["public-success-stories-full"],
    queryFn: () =>
      publicAPI
        .getSuccessStories({ limit: 60 })
        .then((r) => r.data.data.stories),
    staleTime: 5 * 60 * 1000,
  });

  const stories = data || [];
  const filtered =
    branchFilter === "all"
      ? stories
      : stories.filter((s) => s.branch === branchFilter);

  const featured = filtered.filter((s) => s.isFeatured);
  const rest = filtered.filter((s) => !s.isFeatured);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
      <SEO
        path="/success-stories"
        title="Success Stories"
        description="Real students, real placements. See how PlacementOS helped students land their dream careers."
      />
      {/* header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold">Success Stories</h1>
        <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
          Real students, real placements. See how PlacementOS helped our
          students land their dream careers.
        </p>
      </div>

      {/* branch filter */}
      <div className="flex items-center justify-center gap-2 flex-wrap mb-10">
        <button
          onClick={() => setBranchFilter("all")}
          className={cn(
            "px-4 py-1.5 rounded-full text-sm font-medium border transition-colors",
            branchFilter === "all"
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border text-muted-foreground hover:border-primary/40",
          )}
        >
          All Branches
        </button>
        {BRANCHES.map((b) => (
          <button
            key={b}
            onClick={() => setBranchFilter(b)}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium border transition-colors",
              branchFilter === b
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:border-primary/40",
            )}
          >
            {b}
          </button>
        ))}
      </div>

      {/* content */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <StoryCardSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No stories found"
          description={
            branchFilter !== "all"
              ? `No success stories yet for ${branchFilter}.`
              : "Success stories will appear here soon."
          }
        />
      ) : (
        <div className="space-y-8">
          {featured.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featured.map((s) => (
                <StoryCard key={s._id} story={s} featured />
              ))}
            </div>
          )}
          {rest.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {rest.map((s) => (
                <StoryCard key={s._id} story={s} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
