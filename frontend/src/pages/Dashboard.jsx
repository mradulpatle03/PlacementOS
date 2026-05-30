import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { Briefcase, FileText, User, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ProfileMeter from "@/components/ui/ProfileMeter";

function StudentDashboard() {
  return (
    <div className="space-y-6">
      {/* completeness */}
      <Card>
        <CardContent className="pt-6">
          <ProfileMeter />
        </CardContent>
      </Card>

      {/* quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            title: "Browse Drives",
            description: "View all open placement drives",
            icon: Briefcase,
            to: "/drives",
            color: "text-blue-500",
            bg: "bg-blue-50 dark:bg-blue-950",
          },
          {
            title: "My Applications",
            description: "Track your application status",
            icon: Clock,
            to: "/applications",
            color: "text-orange-500",
            bg: "bg-orange-50 dark:bg-orange-950",
          },
          {
            title: "My Resumes",
            description: "Manage your resume versions",
            icon: FileText,
            to: "/resumes",
            color: "text-green-500",
            bg: "bg-green-50 dark:bg-green-950",
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.to} to={item.to}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="pt-6">
                  <div
                    className={`h-10 w-10 rounded-lg ${item.bg} flex items-center justify-center mb-3`}
                  >
                    <Icon className={`h-5 w-5 ${item.color}`} />
                  </div>
                  <p className="font-semibold text-sm">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {item.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function RecruiterDashboard({ user }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          {
            title: "My Drives",
            to: "/my-drives",
            icon: Briefcase,
            color: "text-blue-500",
            bg: "bg-blue-50",
          },
          {
            title: "Pipeline",
            to: "/pipeline",
            icon: User,
            color: "text-purple-500",
            bg: "bg-purple-50",
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.to} to={item.to}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="pt-6 flex items-center gap-4">
                  <div
                    className={`h-10 w-10 rounded-lg ${item.bg} flex items-center justify-center`}
                  >
                    <Icon className={`h-5 w-5 ${item.color}`} />
                  </div>
                  <p className="font-semibold">{item.title}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function TPODashboard() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {[
        {
          title: "Companies",
          to: "/companies",
          icon: Briefcase,
          color: "text-blue-500",
          bg: "bg-blue-50",
        },
        {
          title: "Drives",
          to: "/drives",
          icon: Clock,
          color: "text-orange-500",
          bg: "bg-orange-50",
        },
        {
          title: "Analytics",
          to: "/analytics",
          icon: FileText,
          color: "text-green-500",
          bg: "bg-green-50",
        },
        {
          title: "Students",
          to: "/students",
          icon: User,
          color: "text-purple-500",
          bg: "bg-purple-50",
        },
      ].map((item) => {
        const Icon = item.icon;
        return (
          <Link key={item.to} to={item.to}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-6">
                <div
                  className={`h-10 w-10 rounded-lg ${item.bg} flex items-center justify-center mb-3`}
                >
                  <Icon className={`h-5 w-5 ${item.color}`} />
                </div>
                <p className="font-semibold text-sm">{item.title}</p>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useSelector((s) => s.auth);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          {greeting()}, {user?.name?.split(" ")[0]} 👋
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          {new Date().toLocaleDateString("en-IN", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {user?.role === "student" && <StudentDashboard user={user} />}
      {user?.role === "recruiter" && <RecruiterDashboard user={user} />}
      {(user?.role === "tpo" || user?.role === "coordinator") && (
        <TPODashboard />
      )}
      {user?.role === "admin" && <TPODashboard />}
    </div>
  );
}
