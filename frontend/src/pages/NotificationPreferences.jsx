import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Mail, Smartphone, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import PageHeader from "@/components/ui/PageHeader";
import Spinner from "@/components/ui/Spinner";
import { cn } from "@/lib/utils";
import { showSuccess, showError } from "@/lib/toast";
import { notificationAPI } from "@/api/notification.api";

// ── notification types shown in UI ────────────────────────────
const NOTIFICATION_TYPES = [
  {
    key: "drive_opened",
    label: "New Drive Published",
    description: "When a new placement drive opens and you are eligible",
  },
  {
    key: "application_status",
    label: "Application Status Update",
    description:
      "When your pipeline stage changes (shortlisted, OA, interview, etc.)",
  },
  {
    key: "oa_reminder",
    label: "Online Assessment Reminder",
    description: "Reminders before your OA window opens",
  },
  {
    key: "interview_reminder",
    label: "Interview Reminder",
    description: "24-hour and 1-hour reminders before scheduled interviews",
  },
  {
    key: "offer_released",
    label: "Offer Letter Released",
    description: "When a recruiter uploads your offer letter",
  },
  {
    key: "result_declared",
    label: "Result Declared",
    description: "When final placement results are announced",
  },
  {
    key: "general",
    label: "General Announcements",
    description: "Broadcast announcements from the placement office",
  },
];

// ── custom toggle ─────────────────────────────────────────────
function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent",
        "transition-colors duration-200 ease-in-out focus-visible:outline-none",
        "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-primary" : "bg-muted",
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg",
          "transform transition duration-200 ease-in-out",
          checked ? "translate-x-5" : "translate-x-0",
        )}
      />
    </button>
  );
}

// ── single preference row ─────────────────────────────────────
function PreferenceRow({ type, emailVal, inAppVal, onToggle, disabled }) {
  return (
    <div className="flex items-center justify-between py-4">
      <div className="flex-1 min-w-0 pr-4">
        <p className="text-sm font-medium text-foreground">{type.label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {type.description}
        </p>
      </div>
      <div className="flex items-center gap-6 shrink-0">
        {/* in-app toggle */}
        <div className="flex flex-col items-center gap-1">
          <Smartphone className="w-3.5 h-3.5 text-muted-foreground" />
          <Toggle
            checked={inAppVal}
            onChange={(v) => onToggle("inApp", type.key, v)}
            disabled={disabled}
          />
        </div>
        {/* email toggle */}
        <div className="flex flex-col items-center gap-1">
          <Mail className="w-3.5 h-3.5 text-muted-foreground" />
          <Toggle
            checked={emailVal}
            onChange={(v) => onToggle("email", type.key, v)}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────
export default function NotificationPreferences() {
  const queryClient = useQueryClient();

  // local state mirrors server prefs — edited optimistically
  const [localPrefs, setLocalPrefs] = useState(null);
  const [dirty, setDirty] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["notification-preferences"],
    queryFn: () =>
      notificationAPI.getPreferences().then((r) => r.data.data.preferences),
  });

  // initialise local state once data arrives
  useEffect(() => {
    if (data && !localPrefs) setLocalPrefs(data);
  }, [data, localPrefs]);

  const saveMutation = useMutation({
    mutationFn: (prefs) => notificationAPI.updatePreferences(prefs),
    onSuccess: (res) => {
      queryClient.setQueryData(
        ["notification-preferences"],
        res.data.data.preferences,
      );
      setDirty(false);
      showSuccess("Preferences saved");
    },
    onError: () => showError("Failed to save preferences"),
  });

  const handleToggle = (channel, type, value) => {
    setLocalPrefs((prev) => ({
      ...prev,
      [channel]: { ...prev[channel], [type]: value },
    }));
    setDirty(true);
  };

  const handleSave = () => {
    if (!localPrefs) return;
    saveMutation.mutate(localPrefs);
  };

  const handleReset = () => {
    setLocalPrefs(data);
    setDirty(false);
  };

  if (isLoading || !localPrefs) {
    return <Spinner className="mt-16" />;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title="Notification Preferences"
        subtitle="Choose how and when you want to be notified"
        actions={
          dirty && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleReset}>
                Reset
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="gap-1.5"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                Save
              </Button>
            </div>
          )
        }
      />

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Notification Channels
            </CardTitle>
            {/* legend */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Smartphone className="w-3 h-3" /> In-app
              </span>
              <span className="flex items-center gap-1">
                <Mail className="w-3 h-3" /> Email
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="divide-y divide-border">
            {NOTIFICATION_TYPES.map((type, i) => (
              <PreferenceRow
                key={type.key}
                type={type}
                inAppVal={localPrefs.inApp?.[type.key] ?? true}
                emailVal={localPrefs.email?.[type.key] ?? false}
                onToggle={handleToggle}
                disabled={saveMutation.isPending}
              />
            ))}
          </div>

          {/* save bar at bottom for convenience */}
          {dirty && (
            <>
              <Separator className="mt-4 mb-4" />
              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" size="sm" onClick={handleReset}>
                  Reset changes
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={saveMutation.isPending}
                  className="gap-1.5"
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  Save preferences
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        Changes take effect immediately. Turning off email for a type only
        affects future notifications — existing emails already in queue will
        still be sent.
      </p>
    </div>
  );
}
