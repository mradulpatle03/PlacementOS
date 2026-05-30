import { NavLink } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  Users,
  BarChart2,
  Settings,
  Building2,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = {
  student: [
    { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/drives", icon: Briefcase, label: "Drives" },
    { to: "/applications", icon: FileText, label: "My Applications" },
    { to: "/profile", icon: Settings, label: "Profile" },
    { to: "/resumes", icon: FileText, label: "My Resumes" },
  ],
  recruiter: [
    { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/my-drives", icon: Briefcase, label: "My Drives" },
    { to: "/pipeline", icon: Users, label: "Pipeline" },
    { to: "/recruiter/profile", icon: Settings, label: "Profile" },
  ],
  tpo: [
    { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/companies", icon: Building2, label: "Companies" },
    { to: "/drives", icon: Briefcase, label: "Drives" },
    { to: "/students", icon: Users, label: "Students" },
    { to: "/analytics", icon: BarChart2, label: "Analytics" },
  ],
  admin: [
    { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/admin/users", icon: Users, label: "Users" },
    { to: "/admin/recruiters", icon: ShieldCheck, label: "Recruiters" },
    { to: "/admin/audit", icon: FileText, label: "Audit Logs" },
  ],
};

export default function Sidebar() {
  const { user } = useSelector((state) => state.auth);
  const items = navItems[user?.role] || navItems.student;

  return (
    <aside className="w-60 min-h-screen border-r bg-background px-3 py-6">
      <nav className="flex flex-col gap-1">
        {items.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
