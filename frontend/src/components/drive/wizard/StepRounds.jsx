import { useFieldArray, useForm } from "react-hook-form";
import { Plus, Trash2, GripVertical } from "lucide-react";
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

const ROUND_TYPES = [
  { value: "aptitude", label: "Aptitude Test" },
  { value: "coding", label: "Coding Test" },
  { value: "technical", label: "Technical Interview" },
  { value: "hr", label: "HR Interview" },
  { value: "group_discussion", label: "Group Discussion" },
  { value: "presentation", label: "Presentation" },
  { value: "other", label: "Other" },
];

export default function StepRounds({ data, onNext, onBack }) {
  const { register, handleSubmit, control, setValue, watch } = useForm({
    defaultValues: { rounds: data.rounds || [] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "rounds" });

  const onSubmit = ({ rounds }) => onNext({ rounds });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">Interview Rounds</p>
          <p className="text-xs text-muted-foreground">
            Add rounds in order — students will see this
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            append({
              name: "",
              type: "technical",
              description: "",
              durationMinutes: "",
              venue: "",
              isOnline: false,
            })
          }
        >
          <Plus className="h-3 w-3 mr-1" /> Add Round
        </Button>
      </div>

      {fields.length === 0 && (
        <div className="text-center py-10 border-2 border-dashed rounded-lg text-muted-foreground text-sm">
          No rounds added yet. Rounds are optional.
        </div>
      )}

      <div className="space-y-3">
        {fields.map((field, i) => (
          <div key={field.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Round {i + 1}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => remove(i)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Round Name *</Label>
                <Input
                  placeholder="Technical Round 1"
                  {...register(`rounds.${i}.name`)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Type *</Label>
                <Select
                  defaultValue={field.type || "technical"}
                  onValueChange={(v) => setValue(`rounds.${i}.type`, v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROUND_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Duration (minutes)</Label>
                <Input
                  type="number"
                  placeholder="60"
                  {...register(`rounds.${i}.durationMinutes`)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Venue / Platform</Label>
                <Input
                  placeholder="Room 101 / Google Meet"
                  {...register(`rounds.${i}.venue`)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Description</Label>
              <Input
                placeholder="Brief description of this round"
                {...register(`rounds.${i}.description`)}
              />
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                {...register(`rounds.${i}.isOnline`)}
                className="rounded"
              />
              This round is online
            </label>
          </div>
        ))}
      </div>

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onBack}>
          ← Back
        </Button>
        <Button type="submit">Next: Settings →</Button>
      </div>
    </form>
  );
}
