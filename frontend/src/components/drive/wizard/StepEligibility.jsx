import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const BRANCHES = ["CSE", "IT", "ECE", "EEE", "ME", "CE", "Other"];
const YEARS = [2024, 2025, 2026, 2027, 2028];

export default function StepEligibility({ data, onNext, onBack }) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: data.eligibility,
  });

  const selectedBranches = watch("allowedBranches") || [];
  const selectedYears = watch("graduationYear") || [];

  const toggleBranch = (branch) => {
    const current = selectedBranches.includes(branch)
      ? selectedBranches.filter((b) => b !== branch)
      : [...selectedBranches, branch];
    setValue("allowedBranches", current);
  };

  const toggleYear = (year) => {
    const current = selectedYears.includes(year)
      ? selectedYears.filter((y) => y !== year)
      : [...selectedYears, year];
    setValue("graduationYear", current);
  };

  const onSubmit = (eligibility) => {
    onNext({ eligibility });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Minimum CGPA</Label>
          <Input
            type="number"
            step="0.1"
            min="0"
            max="10"
            placeholder="0 = no requirement"
            {...register("minCGPA", { valueAsNumber: true })}
          />
        </div>
        <div className="space-y-1">
          <Label>Max Active Backlogs</Label>
          <Input
            type="number"
            min="0"
            placeholder="0 = no backlogs allowed"
            {...register("maxBacklogs", { valueAsNumber: true })}
          />
        </div>
      </div>

      {/* branches */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Allowed Branches</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setValue("allowedBranches", BRANCHES)}
            >
              Select All
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setValue("allowedBranches", [])}
            >
              Clear
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {BRANCHES.map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => toggleBranch(b)}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm border transition-colors",
                selectedBranches.includes(b)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-muted hover:border-primary",
              )}
            >
              {b}
            </button>
          ))}
        </div>
        {selectedBranches.length === 0 && (
          <p className="text-xs text-destructive">Select at least one branch</p>
        )}
      </div>

      {/* graduation year */}
      <div className="space-y-2">
        <Label>
          Graduation Year{" "}
          <span className="text-muted-foreground text-xs">
            (leave empty for all)
          </span>
        </Label>
        <div className="flex flex-wrap gap-2">
          {YEARS.map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => toggleYear(y)}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm border transition-colors",
                selectedYears.includes(y)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-muted hover:border-primary",
              )}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      {/* gender */}
      <div className="space-y-1">
        <Label>Gender Restriction</Label>
        <Select
          defaultValue={data.eligibility?.genderRestriction || "any"}
          onValueChange={(v) => setValue("genderRestriction", v)}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">No restriction</SelectItem>
            <SelectItem value="male">Male only</SelectItem>
            <SelectItem value="female">Female only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onBack}>
          ← Back
        </Button>
        <Button type="submit" disabled={selectedBranches.length === 0}>
          Next: Rounds →
        </Button>
      </div>
    </form>
  );
}
