import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Shield, RotateCcw, Save, Loader2, Info,
  Users, FileText, Award, CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';

import { policyAPI }  from '@/api/policy.api';
import { Button }     from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PageHeader     from '@/components/ui/PageHeader';
import Spinner        from '@/components/ui/Spinner';
import ConfirmDialog  from '@/components/ui/ConfirmDialog';
import { cn }         from '@/lib/utils';

// ── custom toggle (same as NotificationPreferences) ───────────
function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full',
        'border-2 border-transparent transition-colors duration-200 ease-in-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        'focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-primary' : 'bg-muted'
      )}
    >
      <span className={cn(
        'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg',
        'transform transition duration-200 ease-in-out',
        checked ? 'translate-x-5' : 'translate-x-0'
      )} />
    </button>
  );
}

// ── number input ──────────────────────────────────────────────
function NumberField({ label, description, value, onChange, min = 0, max, disabled, suffix = '' }) {
  return (
    <div className="flex items-start justify-between gap-4 py-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className={cn(
            'w-20 h-9 rounded-lg border bg-background px-3 text-sm text-right',
            'focus:outline-none focus:ring-2 focus:ring-primary/30',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        />
        {suffix && (
          <span className="text-xs text-muted-foreground w-8">{suffix}</span>
        )}
      </div>
    </div>
  );
}

// ── toggle row ────────────────────────────────────────────────
function ToggleRow({ label, description, checked, onChange, disabled }) {
  return (
    <div className="flex items-start justify-between gap-4 py-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <Toggle checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}

// ── policy section card ───────────────────────────────────────
function PolicySection({ title, icon: Icon, children }) {
  return (
    <Card>
      <CardHeader className="pb-2 pt-5">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="divide-y divide-border">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}

// ── info banner ───────────────────────────────────────────────
function InfoBanner({ message }) {
  return (
    <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300">
      <Info className="w-4 h-4 shrink-0 mt-0.5" />
      <p className="text-xs leading-relaxed">{message}</p>
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────
export default function PolicyEditor() {
  const queryClient   = useQueryClient();
  const [local, setLocal]       = useState(null);
  const [dirty, setDirty]       = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['policy'],
    queryFn:  () => policyAPI.get().then((r) => r.data.data.policy),
  });

  // seed local state once
  useEffect(() => {
    if (data && !local) setLocal(data);
  }, [data, local]);

  const set = (key, value) => {
    setLocal((p) => ({ ...p, [key]: value }));
    setDirty(true);
  };

  const saveMutation = useMutation({
    mutationFn: (p) => policyAPI.update(p),
    onSuccess: (res) => {
      queryClient.setQueryData(['policy'], res.data.data.policy);
      setDirty(false);
      toast.success('Policy saved successfully');
    },
    onError: (err) =>
      toast.error(err?.response?.data?.message || 'Failed to save policy'),
  });

  const resetMutation = useMutation({
    mutationFn: () => policyAPI.reset(),
    onSuccess: (res) => {
      const fresh = res.data.data.policy;
      queryClient.setQueryData(['policy'], fresh);
      setLocal(fresh);
      setDirty(false);
      setResetOpen(false);
      toast.success('Policy reset to defaults');
    },
    onError: () => toast.error('Failed to reset policy'),
  });

  const handleSave = () => {
    if (!local) return;
    // strip mongoose fields before sending
    const {
      oneOfferPolicy, dreamPackageLPA, maxActiveApplications,
      maxApplicationsPerWeek, offerResponseWindowDays,
      requireCompleteProfile, minProfileScore,
    } = local;

    saveMutation.mutate({
      oneOfferPolicy, dreamPackageLPA, maxActiveApplications,
      maxApplicationsPerWeek, offerResponseWindowDays,
      requireCompleteProfile, minProfileScore,
    });
  };

  const handleDiscard = () => {
    setLocal(data);
    setDirty(false);
  };

  if (isLoading || !local) return <Spinner className="mt-16" />;

  const isBusy = saveMutation.isPending || resetMutation.isPending;

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      <PageHeader
        title="Placement Policy"
        subtitle="Configure college-wide placement rules applied to all students"
        actions={
          dirty && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDiscard}
                disabled={isBusy}
              >
                Discard
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isBusy}
                className="gap-1.5"
              >
                {saveMutation.isPending
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Save className="w-3.5 h-3.5" />}
                Save Policy
              </Button>
            </div>
          )
        }
      />

      <InfoBanner message="Policy changes take effect immediately for all future apply and accept actions. Existing applications are not affected retroactively." />

      {/* ── Section 1: Offer rules ──────────────────────────── */}
      <PolicySection title="Offer & Placement Rules" icon={Award}>
        <ToggleRow
          label="One-Offer Policy"
          description="When enabled, students cannot apply to non-dream drives after accepting an offer. All active applications are automatically withdrawn on acceptance."
          checked={local.oneOfferPolicy}
          onChange={(v) => set('oneOfferPolicy', v)}
          disabled={isBusy}
        />

        <NumberField
          label="Dream Company Threshold (LPA)"
          description="Drives with a maximum CTC at or above this value are classified as dream drives. Placed students can still apply to dream drives even with the one-offer policy active. Set to 0 to disable dream company classification."
          value={local.dreamPackageLPA}
          onChange={(v) => set('dreamPackageLPA', v)}
          min={0}
          suffix="LPA"
          disabled={isBusy}
        />

        <NumberField
          label="Offer Response Window"
          description="Number of days a student has to accept or reject a verified offer before it expires."
          value={local.offerResponseWindowDays}
          onChange={(v) => set('offerResponseWindowDays', Math.max(1, v))}
          min={1}
          suffix="days"
          disabled={isBusy}
        />
      </PolicySection>

      {/* ── Section 2: Application limits ──────────────────── */}
      <PolicySection title="Application Limits" icon={FileText}>
        <NumberField
          label="Max Active Applications"
          description="Maximum number of open (non-withdrawn, non-rejected, non-accepted) applications a student can hold at once. Set to 0 for unlimited."
          value={local.maxActiveApplications}
          onChange={(v) => set('maxActiveApplications', v)}
          min={0}
          disabled={isBusy}
        />

        <NumberField
          label="Max Applications Per Week"
          description="Maximum number of drives a student can apply to in a rolling 7-day window. Set to 0 for unlimited."
          value={local.maxApplicationsPerWeek}
          onChange={(v) => set('maxApplicationsPerWeek', v)}
          min={0}
          suffix="/week"
          disabled={isBusy}
        />
      </PolicySection>

      {/* ── Section 3: Profile gate ─────────────────────────── */}
      <PolicySection title="Profile Requirements" icon={Users}>
        <ToggleRow
          label="Require Complete Profile"
          description="Students must have CGPA, branch, graduation year, and roll number filled in before they can apply to any drive."
          checked={local.requireCompleteProfile}
          onChange={(v) => set('requireCompleteProfile', v)}
          disabled={isBusy}
        />

        <NumberField
          label="Minimum Resume Score"
          description="Students must have a primary resume with a score at or above this threshold to apply. Set to 0 to disable this gate."
          value={local.minProfileScore}
          onChange={(v) => set('minProfileScore', Math.min(100, Math.max(0, v)))}
          min={0}
          max={100}
          suffix="/ 100"
          disabled={isBusy}
        />
      </PolicySection>

      {/* ── last updated info ───────────────────────────────── */}
      {data?.updatedAt && (
        <p className="text-xs text-muted-foreground text-center">
          Last updated{' '}
          {new Date(data.updatedAt).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'long', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
          })}
        </p>
      )}

      {/* ── save bar at bottom ──────────────────────────────── */}
      {dirty && (
        <div className="flex items-center justify-between gap-2 px-5 py-4 rounded-xl border bg-card shadow-sm">
          <p className="text-sm text-muted-foreground">You have unsaved changes.</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDiscard} disabled={isBusy}>
              Discard
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isBusy} className="gap-1.5">
              {saveMutation.isPending
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Save className="w-3.5 h-3.5" />}
              Save Policy
            </Button>
          </div>
        </div>
      )}

      {/* ── danger zone ─────────────────────────────────────── */}
      <Card className="border-destructive/30">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-destructive">Reset to Defaults</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Restore all policy settings to factory defaults. This cannot be undone.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10 shrink-0"
              onClick={() => setResetOpen(true)}
              disabled={isBusy}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* reset confirm */}
      <ConfirmDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={() => resetMutation.mutate()}
        loading={resetMutation.isPending}
        title="Reset Policy to Defaults?"
        description="This will restore all placement policy settings to their factory defaults. Existing applications and offers are not affected."
        confirmLabel="Yes, Reset"
        variant="destructive"
      />
    </div>
  );
}