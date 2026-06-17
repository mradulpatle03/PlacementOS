import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  TrendingUp,
  Building2,
  Award,
  IndianRupee,
  Quote,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import StatsCounter from "@/components/public/StatsCounter";
import { publicAPI } from "@/api/public.api";
import { cn } from "@/lib/utils";
import { SEO } from "@/components/seo/SEO";

// ── hero section ─────────────────────────────────────────────
function Hero({ stats, loading }) {
  return (
    <section className="relative overflow-hidden bg-linear-to-br from-primary/5 via-background to-background py-20 sm:py-28">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          Digitizing campus placements end-to-end
        </div>

        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight leading-tight">
          Your career journey
          <br />
          <span className="text-primary">starts here.</span>
        </h1>

        <p className="text-lg text-muted-foreground mt-6 max-w-2xl mx-auto">
          PlacementOS connects students, recruiters, and the placement office on
          one unified platform — from eligibility checks to offer letters.
        </p>

        <div className="flex items-center justify-center gap-3 mt-8 flex-wrap">
          <Button size="lg" asChild className="gap-2">
            <Link to="/register">
              Get Started <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link to="/success-stories">View Success Stories</Link>
          </Button>
        </div>

        {/* hero stat strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-16 max-w-3xl mx-auto">
          {[
            {
              label: "Placement Rate",
              icon: TrendingUp,
              render: () =>
                loading ? (
                  "…"
                ) : (
                  <StatsCounter
                    value={stats?.placementPercent || 0}
                    suffix="%"
                    decimals={1}
                  />
                ),
            },
            {
              label: "Students Placed",
              icon: Award,
              render: () =>
                loading ? (
                  "…"
                ) : (
                  <StatsCounter value={stats?.totalStudentsPlaced || 0} />
                ),
            },
            {
              label: "Recruiting Companies",
              icon: Building2,
              render: () =>
                loading ? (
                  "…"
                ) : (
                  <StatsCounter value={stats?.totalCompanies || 0} />
                ),
            },
            {
              label: "Highest Package",
              icon: IndianRupee,
              render: () =>
                loading ? (
                  "…"
                ) : (
                  <>
                    <StatsCounter
                      value={stats?.highestPackage || 0}
                      decimals={1}
                    />{" "}
                    LPA
                  </>
                ),
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="bg-card border rounded-2xl px-4 py-5 shadow-sm"
              >
                <Icon className="w-5 h-5 text-primary mx-auto mb-2" />
                <p className="text-2xl font-bold">{item.render()}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {item.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── recruiters grid ──────────────────────────────────────────
function RecruitersGrid({ companies, loading }) {
  return (
    <section className="py-16 sm:py-20 bg-muted/30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold">
            Companies that trust us
          </h2>
          <p className="text-muted-foreground mt-2">
            Leading recruiters across industries hire through PlacementOS
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : companies.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">
            Company showcase coming soon.
          </p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-4">
            {companies.map((c) => (
              <div
                key={c._id}
                className="flex flex-col items-center justify-center gap-2 bg-card border rounded-xl p-4 h-20 hover:shadow-md transition-shadow"
              >
                {c.logo ? (
                  <img
                    src={c.logo}
                    alt={c.name}
                    loading="lazy"
                    width="80"
                    height="32"
                    className="h-8 max-w-full object-contain"
                  />
                ) : (
                  <Building2 className="w-6 h-6 text-muted-foreground" />
                )}
                <p className="text-[10px] text-muted-foreground text-center truncate w-full">
                  {c.name}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ── testimonials carousel-ish grid ───────────────────────────
function TestimonialsPreview({ stories, loading }) {
  return (
    <section className="py-16 sm:py-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold">Success stories</h2>
            <p className="text-muted-foreground mt-2">
              Hear from students who landed their dream jobs
            </p>
          </div>
          <Button variant="outline" asChild className="hidden sm:flex gap-1.5">
            <Link to="/success-stories">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48 rounded-2xl" />
            ))}
          </div>
        ) : stories.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-10">
            Success stories coming soon.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {stories.slice(0, 3).map((s) => (
              <Card key={s._id} className="relative overflow-hidden">
                <CardContent className="pt-6 pb-6 space-y-4">
                  <Quote className="w-6 h-6 text-primary/30" />
                  <p className="text-sm text-foreground/90 leading-relaxed line-clamp-4">
                    {s.testimonial}
                  </p>
                  <div className="flex items-center gap-3 pt-2 border-t">
                    {s.photoUrl ? (
                      <img
                        src={s.photoUrl}
                        alt={s.studentName}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                        {s.studentName?.charAt(0)}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-semibold">{s.studentName}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.role ? `${s.role} at ` : ""}
                        {s.companyName}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="flex justify-center mt-8 sm:hidden">
          <Button variant="outline" asChild className="gap-1.5">
            <Link to="/success-stories">
              View all stories <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

// ── CTA section ───────────────────────────────────────────────
function CTASection() {
  return (
    <section className="py-16 bg-primary text-primary-foreground">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold">
          Ready to start your placement journey?
        </h2>
        <p className="mt-3 opacity-90">
          Join thousands of students who found their dream careers through
          PlacementOS.
        </p>
        <Button size="lg" variant="secondary" asChild className="mt-6 gap-2">
          <Link to="/register">
            Create your account <ArrowRight className="w-4 h-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}

// ── main page ─────────────────────────────────────────────────
export default function Home() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["public-stats"],
    queryFn: () => publicAPI.getStats().then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });

  const { data: companiesData, isLoading: companiesLoading } = useQuery({
    queryKey: ["public-recruiters"],
    queryFn: () => publicAPI.getRecruiters().then((r) => r.data.data.companies),
    staleTime: 5 * 60 * 1000,
  });

  const { data: storiesData, isLoading: storiesLoading } = useQuery({
    queryKey: ["public-stories-preview"],
    queryFn: () =>
      publicAPI
        .getSuccessStories({ limit: 3 })
        .then((r) => r.data.data.stories),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div>
      <SEO
        path="/"
        title="Home"
        description="PlacementOS digitizes the entire college placement lifecycle — from company onboarding to final offer acceptance."
      />
      <Hero stats={stats} loading={statsLoading} />
      <RecruitersGrid
        companies={companiesData || []}
        loading={companiesLoading}
      />
      <TestimonialsPreview
        stories={storiesData || []}
        loading={storiesLoading}
      />
      <CTASection />
    </div>
  );
}
