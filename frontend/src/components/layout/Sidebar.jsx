import { useState } from "react";
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
  Calendar,
  Bell,
  BriefcaseBusiness,
  Shield,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── nav definitions ───────────────────────────────────────────

const navItems = {
  student: [
    { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/drives", icon: Briefcase, label: "Drives" },
    { to: "/applications", icon: FileText, label: "My Applications" },
    { to: "/interviews", icon: Calendar, label: "My Interviews" },
    { to: "/offers", icon: BriefcaseBusiness, label: "Offer Letters" },
    { to: "/resumes", icon: FileText, label: "My Resumes" },
    { to: "/notifications", icon: Bell, label: "Notifications" },
    { to: "/profile", icon: Settings, label: "Profile" },
  ],

  recruiter: [
    { to: "/recruiter/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/drives", icon: Briefcase, label: "Drives" },
    { to: "/tpo/drives", icon: Users, label: "Pipeline" },
    { to: "/notifications", icon: Bell, label: "Notifications" },
    { to: "/recruiter/profile", icon: Settings, label: "Profile" },
  ],

  coordinator: [
    { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/companies", icon: Building2, label: "Companies" },
    { to: "/drives", icon: Briefcase, label: "Drives" },
    { to: "/students", icon: Users, label: "Students" },
    { to: "/analytics", icon: BarChart2, label: "Analytics" },
    { to: "/notifications", icon: Bell, label: "Notifications" },
  ],

  tpo: [
    { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/companies", icon: Building2, label: "Companies" },
    { to: "/drives", icon: Briefcase, label: "Drives" },
    { to: "/students", icon: Users, label: "Students" },
    { to: "/analytics", icon: BarChart2, label: "Analytics" },
    { to: "/tpo/policy", icon: Shield, label: "Policy" },
    { to: "/notifications", icon: Bell, label: "Notifications" },
  ],

  admin: [
    { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/admin/users", icon: Users, label: "Users" },
    { to: "/admin/recruiters", icon: ShieldCheck, label: "Recruiters" },
    { to: "/admin/audit", icon: FileText, label: "Audit Logs" },
    { to: "/companies", icon: Building2, label: "Companies" },
    { to: "/drives", icon: Briefcase, label: "Drives" },
    { to: "/analytics", icon: BarChart2, label: "Analytics" },
    { to: "/tpo/policy", icon: Shield, label: "Policy" },
    { to: "/notifications", icon: Bell, label: "Notifications" },
  ],
};

// ── single nav link ───────────────────────────────────────────

function NavItem({ to, icon: Icon, label, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          isActive
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        )
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{label}</span>
    </NavLink>
  );
}

// ── sidebar content ───────────────────────────────────────────

function SidebarContent({ items, onNavigate }) {
  return (
    <nav className="flex flex-col gap-0.5 px-3 py-4">
      {items.map(({ to, icon, label }) => (
        <NavItem
          key={to}
          to={to}
          icon={icon}
          label={label}
          onClick={onNavigate}
        />
      ))}
    </nav>
  );
}

// ── main export ───────────────────────────────────────────────

export default function Sidebar() {
  const { user } = useSelector((s) => s.auth);
  const [open, setOpen] = useState(false);
  const items = navItems[user?.role] || navItems.student;

  const close = () => setOpen(false);

  return (
    <>
      {/* ── mobile hamburger ─────────────────────────────── */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-background border shadow-sm"
        onClick={() => setOpen((p) => !p)}
        aria-label="Toggle menu"
      >
        {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>

      {/* ── mobile backdrop ───────────────────────────────── */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={close}
        />
      )}

      {/* ── mobile drawer ─────────────────────────────────── */}
      <aside
        className={cn(
          "lg:hidden fixed top-0 left-0 z-50 h-full w-64 bg-background border-r shadow-xl",
          "transform transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b">
          <span className="font-bold text-primary">PlacementOS</span>
          <button onClick={close} className="p-1 rounded-md hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <SidebarContent items={items} onNavigate={close} />
      </aside>

      {/* ── desktop sidebar ───────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-56 shrink-0 min-h-screen border-r bg-background">
        <SidebarContent items={items} onNavigate={undefined} />
      </aside>
    </>
  );
}
