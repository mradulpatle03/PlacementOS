import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Loader2, CheckCircle2, User, Briefcase, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { recruiterAPI } from "@/api/recruiter.api";
import { recruiterProfileSchema } from "@/lib/validators/recruiter.schema";
import { showError, showSuccess } from "@/lib/toast";

const STEPS = [
  { id: 1, label: "Basic Info", icon: User },
  { id: 2, label: "Professional", icon: Briefcase },
  { id: 3, label: "Done", icon: CheckCircle2 },
];

export default function RecruiterOnboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm({
    resolver: zodResolver(recruiterProfileSchema),
  });

  const mutation = useMutation({
    mutationFn: recruiterAPI.updateMyProfile,
    onSuccess: () => {
      showSuccess("Profile saved!");
      setStep(3);
    },
    onError: (err) =>
      showError(err.response?.data?.message || "Failed to save profile"),
  });

  const handleStepSubmit = (data) => {
    if (step === 2) {
      mutation.mutate(data);
    } else {
      setStep((s) => s + 1);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Welcome to PlacementOS</h1>
          <p className="text-muted-foreground mt-1">
            Complete your recruiter profile to get started
          </p>
        </div>

        {/* step indicators */}
        <div className="flex items-center justify-center gap-2">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = s.id === step;
            const isDone = s.id < step;
            return (
              <div key={s.id} className="flex items-center gap-2">
                <div
                  className={cn(
                    "h-9 w-9 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                    isDone
                      ? "bg-primary text-primary-foreground"
                      : isActive
                        ? "border-2 border-primary text-primary"
                        : "border-2 border-muted text-muted-foreground",
                  )}
                >
                  {isDone ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                <span
                  className={cn(
                    "text-sm hidden sm:block",
                    isActive ? "font-medium" : "text-muted-foreground",
                  )}
                >
                  {s.label}
                </span>
                {i < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "h-px w-8 mx-1",
                      isDone ? "bg-primary" : "bg-muted",
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* ── Step 1: Basic Info ── */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Tell us about your role</CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={handleSubmit(handleStepSubmit)}
                className="space-y-4"
              >
                <div className="space-y-1">
                  <Label>Designation</Label>
                  <Input
                    placeholder="HR Manager / Technical Recruiter"
                    {...register("designation")}
                  />
                  {errors.designation && (
                    <p className="text-xs text-destructive">
                      {errors.designation.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label>Phone Number</Label>
                  <Input placeholder="+91 98765 43210" {...register("phone")} />
                  {errors.phone && (
                    <p className="text-xs text-destructive">
                      {errors.phone.message}
                    </p>
                  )}
                </div>
                <div className="flex justify-end">
                  <Button type="submit">Next →</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* ── Step 2: Professional ── */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Professional Details</CardTitle>
              <CardDescription>Help students know you better</CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={handleSubmit(handleStepSubmit)}
                className="space-y-4"
              >
                <div className="space-y-1">
                  <Label>LinkedIn Profile</Label>
                  <Input
                    placeholder="https://linkedin.com/in/..."
                    {...register("linkedinProfile")}
                  />
                  {errors.linkedinProfile && (
                    <p className="text-xs text-destructive">
                      {errors.linkedinProfile.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label>Bio</Label>
                  <Textarea
                    placeholder="Brief description about yourself and your hiring focus..."
                    rows={4}
                    {...register("bio")}
                  />
                  {errors.bio && (
                    <p className="text-xs text-destructive">
                      {errors.bio.message}
                    </p>
                  )}
                </div>
                <div className="flex justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                  >
                    ← Back
                  </Button>
                  <Button type="submit" disabled={mutation.isPending}>
                    {mutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Save Profile
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* ── Step 3: Done ── */}
        {step === 3 && (
          <Card>
            <CardContent className="pt-8 pb-8 text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Profile Complete!</h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  Your profile is under review by the TPO. You'll be notified
                  once verified.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 bg-yellow-50 text-yellow-700 text-sm px-4 py-2 rounded-md border border-yellow-200">
                <Info className="h-4 w-4 shrink-0" />
                Verification pending — some features are limited until approved.
              </div>
              <Button onClick={() => navigate("/dashboard")} className="mt-2">
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
