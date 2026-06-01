import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

function Toggle({ label, description, checked, onChange }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${
          checked ? "bg-primary" : "bg-muted"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

export default function StepSettings({ data, onNext, onBack }) {
  const { register, handleSubmit, watch, setValue } = useForm({
    defaultValues: data.settings,
  });

  const values = watch();

  const onSubmit = (settings) => onNext({ settings });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <p className="font-medium text-sm">Placement Policies</p>

        <Toggle
          label="One Offer Policy"
          description="Students who have already received an offer cannot apply to this drive"
          checked={values.oneOfferPolicy ?? true}
          onChange={(v) => setValue("oneOfferPolicy", v)}
        />

        <div className="space-y-1 pl-4">
          <Label className="text-xs">Dream Company Threshold (LPA)</Label>
          <Input
            type="number"
            step="0.5"
            min="0"
            placeholder="0 = not a dream company drive"
            className="w-48"
            {...register("dreamPackageLPA", { valueAsNumber: true })}
          />
          <p className="text-xs text-muted-foreground">
            Students already placed can apply if this drive's CTC ≥ threshold
          </p>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <p className="font-medium text-sm">Application Settings</p>

        <Toggle
          label="Allow Late Applications"
          description="Accept applications after the deadline with a grace period"
          checked={values.allowLateApplications ?? false}
          onChange={(v) => setValue("allowLateApplications", v)}
        />

        {values.allowLateApplications && (
          <div className="space-y-1 pl-4">
            <Label className="text-xs">Grace Period (hours)</Label>
            <Input
              type="number"
              min="1"
              max="72"
              placeholder="24"
              className="w-32"
              {...register("gracePeriodHours", { valueAsNumber: true })}
            />
          </div>
        )}

        <Toggle
          label="Auto-shortlist Applicants"
          description="Automatically shortlist all eligible applicants when drive opens"
          checked={values.autoShortlist ?? false}
          onChange={(v) => setValue("autoShortlist", v)}
        />

        <Toggle
          label="Notify on Status Change"
          description="Send email notifications to students when their application status changes"
          checked={values.notifyOnStatusChange ?? true}
          onChange={(v) => setValue("notifyOnStatusChange", v)}
        />
      </div>

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onBack}>
          ← Back
        </Button>
        <Button type="submit">Next: Review →</Button>
      </div>
    </form>
  );
}
