import { useQuery } from "@tanstack/react-query";
import {
  Target,
  Users,
  Zap,
  ShieldCheck,
  TrendingUp,
  Building2,
  Award,
  Sparkles,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import StatsCounter from "@/components/public/StatsCounter";
import { publicAPI } from "@/api/public.api";
import { SEO } from "@/components/seo/SEO";

const VALUES = [
  {
    icon: Target,
    title: "Smart Eligibility",
    description:
      "Automated eligibility checks remove manual filtering and give students instant clarity on every drive.",
  },
  {
    icon: Zap,
    title: "Real-time Updates",
    description:
      "Live pipeline tracking, instant notifications, and transparent status updates for every application.",
  },
  {
    icon: ShieldCheck,
    title: "Fair Policy Engine",
    description:
      "Configurable one-offer and dream-company rules ensure equitable opportunities for every student.",
  },
  {
    icon: TrendingUp,
    title: "Data-Driven Decisions",
    description:
      "Comprehensive analytics help the placement office identify trends and improve outcomes year over year.",
  },
];

function StatBlock({
  icon: Icon,
  value,
  suffix,
  label,
  loading,
  decimals = 0,
}) {
  return (
    <div className="text-center">
      <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
        <Icon className="w-6 h-6 text-primary" />
      </div>
      <div className="text-3xl font-bold">
        {loading ? (
          <Skeleton className="h-8 w-16 mx-auto" />
        ) : (
          <StatsCounter value={value} suffix={suffix} decimals={decimals} />
        )}
      </div>
      <p className="text-sm text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

export default function About() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["public-stats-about"],
    queryFn: () => publicAPI.getStats().then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div>
      <SEO
        path="/about"
        title="About TPO"
        description="Our Training & Placement Office connects students with leading companies, ensuring transparent and equitable career opportunities."
      />
      {/* hero */}
      <section className="bg-linear-to-br from-primary/5 via-background to-background py-16 sm:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-5">
            <Sparkles className="w-3.5 h-3.5" />
            About the Training & Placement Office
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight">
            Building bridges between
            <br />
            <span className="text-primary">students and industry</span>
          </h1>
          <p className="text-lg text-muted-foreground mt-6 leading-relaxed">
            Our Training & Placement Office (TPO) is committed to creating
            meaningful career opportunities for every student. We partner with
            leading companies across industries to ensure our graduates are
            well-prepared and well-placed.
          </p>
        </div>
      </section>

      {/* stats */}
      <section className="py-14 border-y bg-muted/20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 grid grid-cols-2 sm:grid-cols-4 gap-8">
          <StatBlock
            icon={Award}
            value={stats?.totalStudentsPlaced || 0}
            label="Students Placed"
            loading={isLoading}
          />
          <StatBlock
            icon={Building2}
            value={stats?.totalCompanies || 0}
            label="Partner Companies"
            loading={isLoading}
          />
          <StatBlock
            icon={TrendingUp}
            value={stats?.placementPercent || 0}
            suffix="%"
            decimals={1}
            label="Placement Rate"
            loading={isLoading}
          />
          <StatBlock
            icon={Users}
            value={stats?.totalDrivesCompleted || 0}
            label="Drives Completed"
            loading={isLoading}
          />
        </div>
      </section>

      {/* mission */}
      <section className="py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold">Our Mission</h2>
            <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
              We believe every student deserves a fair, transparent, and
              efficient path to their career. PlacementOS is how we deliver on
              that promise.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {VALUES.map((v) => {
              const Icon = v.icon;
              return (
                <Card key={v.title}>
                  <CardContent className="pt-6 pb-6 flex gap-4">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{v.title}</p>
                      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                        {v.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* TPO team note */}
      <section className="py-16 bg-muted/20 border-t">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-xl sm:text-2xl font-bold">Have questions?</h2>
          <p className="text-muted-foreground mt-3">
            Our placement coordinators are here to help students, recruiters,
            and faculty navigate the placement process.
          </p>
          <a
            href="/contact"
            className="inline-block mt-5 text-sm font-medium text-primary hover:underline"
          >
            Get in touch →
          </a>
        </div>
      </section>
    </div>
  );
}
