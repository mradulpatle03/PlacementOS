import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  Users,
  ShieldCheck,
  UserX,
  UserCheck,
  Megaphone,
  Loader2,
  ChevronDown,
  Search,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

import { adminAPI } from "@/api/admin.api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/utils";

const ROLES = ["student", "recruiter", "coordinator", "tpo", "admin"];
const ROLE_COLORS = {
  student: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  recruiter:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  coordinator:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  tpo: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  admin: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

// ── User row ──────────────────────────────────────────────────
function UserRow({ user, onRoleChange, onToggle, togglingId, roleChangingId }) {
  const [showRoles, setShowRoles] = useState(false);

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors",
        user.isActive ? "bg-card" : "bg-muted/30 opacity-70",
      )}
    >
      {/* avatar */}
      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-sm font-semibold text-primary">
        {user.name?.charAt(0).toUpperCase()}
      </div>

      {/* info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{user.name}</p>
        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Joined{" "}
          {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
        </p>
      </div>

      {/* role badge + picker */}
      <div className="relative shrink-0">
        <button
          onClick={() => setShowRoles((p) => !p)}
          disabled={!!roleChangingId}
          className="flex items-center gap-1"
        >
          <Badge
            className={cn(
              "border-0 text-[11px] capitalize gap-1",
              ROLE_COLORS[user.role],
            )}
          >
            {roleChangingId === user._id ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : null}
            {user.role}
          </Badge>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        </button>

        {showRoles && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowRoles(false)}
            />
            <div className="absolute right-0 top-7 z-20 bg-popover border rounded-xl shadow-lg p-1 min-w-32.5">
              {ROLES.map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    setShowRoles(false);
                    onRoleChange(user._id, r);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-1.5 text-xs rounded-lg capitalize transition-colors hover:bg-muted",
                    user.role === r && "font-semibold text-primary",
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* active toggle */}
      <button
        onClick={() => onToggle(user._id)}
        disabled={togglingId === user._id}
        className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shrink-0"
        title={user.isActive ? "Deactivate user" : "Activate user"}
      >
        {togglingId === user._id ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : user.isActive ? (
          <ToggleRight className="w-4 h-4 text-emerald-500" />
        ) : (
          <ToggleLeft className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
    </div>
  );
}

function UserSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-card">
      <Skeleton className="h-8 w-8 rounded-full shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-3 w-48" />
      </div>
      <Skeleton className="h-5 w-20 rounded-full" />
    </div>
  );
}

// ── Announcement form ─────────────────────────────────────────
function AnnouncementForm({ onBroadcast, loading }) {
  const [form, setForm] = useState({
    title: "",
    message: "",
    targetRoles: ["student", "recruiter", "coordinator", "tpo"],
    expiresAt: "",
  });

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const toggleRole = (role) => {
    setForm((p) => ({
      ...p,
      targetRoles: p.targetRoles.includes(role)
        ? p.targetRoles.filter((r) => r !== role)
        : [...p.targetRoles, role],
    }));
  };

  const handleSubmit = () => {
    if (!form.title.trim() || !form.message.trim()) {
      toast.error("Title and message are required");
      return;
    }
    if (form.targetRoles.length === 0) {
      toast.error("Select at least one target role");
      return;
    }
    onBroadcast({
      title: form.title.trim(),
      message: form.message.trim(),
      targetRoles: form.targetRoles,
      expiresAt: form.expiresAt || undefined,
    });
    setForm({
      title: "",
      message: "",
      targetRoles: ["student", "recruiter", "coordinator", "tpo"],
      expiresAt: "",
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-1.5">
          Title <span className="text-destructive">*</span>
        </label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Announcement title"
          maxLength={200}
          className="w-full h-9 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-1.5">
          Message <span className="text-destructive">*</span>
        </label>
        <textarea
          rows={3}
          value={form.message}
          onChange={(e) => set("message", e.target.value)}
          placeholder="Write your announcement here…"
          maxLength={2000}
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <p className="text-[11px] text-muted-foreground mt-1 text-right">
          {form.message.length}/2000
        </p>
      </div>

      {/* target roles */}
      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-2">
          Target Roles
        </label>
        <div className="flex items-center gap-2 flex-wrap">
          {ROLES.filter((r) => r !== "admin").map((role) => (
            <button
              key={role}
              onClick={() => toggleRole(role)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium border capitalize transition-colors",
                form.targetRoles.includes(role)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-primary/40",
              )}
            >
              {role}
            </button>
          ))}
        </div>
      </div>

      {/* expiry */}
      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-1.5">
          Expires At (optional)
        </label>
        <input
          type="datetime-local"
          value={form.expiresAt}
          onChange={(e) => set("expiresAt", e.target.value)}
          min={new Date().toISOString().slice(0, 16)}
          className="h-9 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <Button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full gap-1.5"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Megaphone className="w-4 h-4" />
        )}
        Broadcast Announcement
      </Button>
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────
export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [toggleId, setToggleId] = useState(null);
  const [roleChangingId, setRoleChangingId] = useState(null);
  const [confirmToggle, setConfirmToggle] = useState(null);

  // users
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["admin-users", search, roleFilter, page],
    queryFn: () =>
      adminAPI
        .getUsers({
          page,
          limit: 15,
          search: search || undefined,
          role: roleFilter !== "all" ? roleFilter : undefined,
        })
        .then((r) => r.data.data),
    keepPreviousData: true,
  });

  // announcements history
  const { data: announcementsData, isLoading: announcementsLoading } = useQuery(
    {
      queryKey: ["admin-announcements"],
      queryFn: () => adminAPI.getAnnouncements().then((r) => r.data.data),
    },
  );

  const users = usersData?.users || [];
  const byRole = usersData?.byRole || {};
  const pagination = usersData?.pagination || {};
  const announcements = announcementsData?.announcements || [];

  // role update
  const roleMutation = useMutation({
    mutationFn: ({ id, role }) => adminAPI.updateRole(id, role),
    onMutate: ({ id }) => setRoleChangingId(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Role updated");
      setRoleChangingId(null);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Failed to update role");
      setRoleChangingId(null);
    },
  });

  // toggle active
  const toggleMutation = useMutation({
    mutationFn: (id) => adminAPI.toggleActive(id),
    onMutate: (id) => setToggleId(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success(res.data.message);
      setToggleId(null);
      setConfirmToggle(null);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Failed");
      setToggleId(null);
      setConfirmToggle(null);
    },
  });

  // broadcast
  const broadcastMutation = useMutation({
    mutationFn: (data) => adminAPI.broadcast(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
      toast.success(res.data.message);
    },
    onError: (err) =>
      toast.error(err?.response?.data?.message || "Broadcast failed"),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Dashboard"
        subtitle="User management, roles, and announcements"
      />

      {/* role summary cards */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
        {ROLES.map((role) => (
          <div
            key={role}
            onClick={() => {
              setRoleFilter(role === roleFilter ? "all" : role);
              setPage(1);
            }}
            className={cn(
              "rounded-xl px-3 py-3 text-center cursor-pointer border transition-all",
              roleFilter === role
                ? "border-primary bg-primary/5"
                : "border-border bg-muted/40 hover:border-primary/30",
            )}
          >
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">
              {role}
            </p>
            <p className="text-xl font-bold mt-1">{byRole[role] || 0}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="announce">Announcements</TabsTrigger>
        </TabsList>

        {/* ── Users tab ─────────────────────────────────────── */}
        <TabsContent value="users" className="mt-4 space-y-4">
          {/* search + filter */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-50">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by name or email…"
                className="w-full h-9 rounded-lg border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="relative">
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setPage(1);
                }}
                className="h-9 rounded-lg border bg-background px-3 pr-8 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="all">All Roles</option>
                {ROLES.map((r) => (
                  <option key={r} value={r} className="capitalize">
                    {r}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                queryClient.invalidateQueries({ queryKey: ["admin-users"] })
              }
              className="gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* user list */}
          {usersLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <UserSkeleton key={i} />
              ))}
            </div>
          ) : users.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No users found"
              description="Try adjusting your search or filters"
            />
          ) : (
            <div className="space-y-2">
              {users.map((u) => (
                <UserRow
                  key={u._id}
                  user={u}
                  onRoleChange={(id, role) => roleMutation.mutate({ id, role })}
                  onToggle={(id) => setConfirmToggle(id)}
                  togglingId={toggleId}
                  roleChangingId={roleChangingId}
                />
              ))}
            </div>
          )}

          {/* pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || usersLoading}
              >
                Prev
              </Button>
              <span className="text-sm text-muted-foreground">
                {page} / {pagination.pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPage((p) => Math.min(pagination.pages, p + 1))
                }
                disabled={page === pagination.pages || usersLoading}
              >
                Next
              </Button>
            </div>
          )}
        </TabsContent>

        {/* ── Announcements tab ─────────────────────────────── */}
        <TabsContent value="announce" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* broadcast form */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-primary" />
                  Broadcast Announcement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AnnouncementForm
                  onBroadcast={(data) => broadcastMutation.mutate(data)}
                  loading={broadcastMutation.isPending}
                />
              </CardContent>
            </Card>

            {/* history */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">
                  Recent Announcements
                </CardTitle>
              </CardHeader>
              <CardContent>
                {announcementsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 rounded-lg" />
                    ))}
                  </div>
                ) : announcements.length === 0 ? (
                  <EmptyState
                    icon={Megaphone}
                    title="No announcements yet"
                    description="Broadcasts will appear here"
                  />
                ) : (
                  <div className="space-y-3 max-h-105 overflow-y-auto">
                    {announcements.map((a) => (
                      <div
                        key={a._id}
                        className="px-4 py-3 rounded-xl border bg-muted/30 space-y-1.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold line-clamp-1">
                            {a.title}
                          </p>
                          <span className="text-[11px] text-muted-foreground shrink-0">
                            {formatDistanceToNow(new Date(a.createdAt), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {a.message}
                        </p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {a.targetRoles.map((r) => (
                            <Badge
                              key={r}
                              className={cn(
                                "border-0 text-[10px] capitalize",
                                ROLE_COLORS[r],
                              )}
                            >
                              {r}
                            </Badge>
                          ))}
                          {a.expiresAt && (
                            <span className="text-[10px] text-muted-foreground ml-auto">
                              Expires{" "}
                              {formatDistanceToNow(new Date(a.expiresAt), {
                                addSuffix: true,
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* confirm toggle dialog */}
      <ConfirmDialog
        open={!!confirmToggle}
        onClose={() => setConfirmToggle(null)}
        onConfirm={() => toggleMutation.mutate(confirmToggle)}
        loading={toggleMutation.isPending}
        title="Toggle user status?"
        description="This will activate or deactivate the user's account. They will not be able to log in while deactivated."
        confirmLabel="Confirm"
        variant="destructive"
      />
    </div>
  );
}
