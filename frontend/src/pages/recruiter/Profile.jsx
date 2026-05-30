import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Pencil,
  ExternalLink,
  ShieldCheck,
  ShieldX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import Spinner from "@/components/ui/Spinner";
import { recruiterAPI } from "@/api/recruiter.api";
import { recruiterProfileSchema } from "@/lib/validators/recruiter.schema";
import { showSuccess, showError } from "@/lib/toast";
import { useSelector } from "react-redux";

export default function RecruiterProfile() {
  const queryClient = useQueryClient();
  const { user } = useSelector((s) => s.auth);
  const [editing, setEditing] = useState(false);

  const { data: recruiter, isLoading } = useQuery({
    queryKey: ["recruiterProfile"],
    queryFn: async () => {
      const res = await recruiterAPI.getMyProfile();
      return res.data.recruiter;
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(recruiterProfileSchema),
  });

  const startEditing = () => {
    reset({
      designation: recruiter?.designation || "",
      phone: recruiter?.phone || "",
      linkedinProfile: recruiter?.linkedinProfile || "",
      bio: recruiter?.bio || "",
    });
    setEditing(true);
  };

  const updateMutation = useMutation({
    mutationFn: recruiterAPI.updateMyProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruiterProfile"] });
      showSuccess("Profile updated");
      setEditing(false);
    },
    onError: (err) => showError(err.response?.data?.message || "Update failed"),
  });

  if (isLoading) return <Spinner className="mt-20" />;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title="My Profile"
        subtitle="Your recruiter profile visible to TPO and students"
      />

      {/* verification status banner */}
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-md border text-sm ${
          recruiter?.isVerified
            ? "bg-green-50 border-green-200 text-green-700"
            : "bg-yellow-50 border-yellow-200 text-yellow-700"
        }`}
      >
        {recruiter?.isVerified ? (
          <ShieldCheck className="h-5 w-5 shrink-0" />
        ) : (
          <ShieldX className="h-5 w-5 shrink-0" />
        )}
        <div>
          <p className="font-medium">
            {recruiter?.isVerified
              ? "Verified Recruiter"
              : "Verification Pending"}
          </p>
          <p className="text-xs opacity-80">
            {recruiter?.isVerified
              ? `Verified on ${new Date(recruiter.verifiedAt).toLocaleDateString()}`
              : recruiter?.rejectionReason
                ? `Rejected: ${recruiter.rejectionReason}`
                : "Your profile is under review by the TPO"}
          </p>
        </div>
      </div>

      {/* profile card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Profile Information</CardTitle>
          {!editing && (
            <Button variant="ghost" size="sm" onClick={startEditing}>
              <Pencil className="h-4 w-4 mr-1" /> Edit
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {editing ? (
            <form
              onSubmit={handleSubmit((d) => updateMutation.mutate(d))}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Designation</Label>
                  <Input
                    placeholder="HR Manager"
                    {...register("designation")}
                  />
                  {errors.designation && (
                    <p className="text-xs text-destructive">
                      {errors.designation.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label>Phone</Label>
                  <Input placeholder="+91 98765 43210" {...register("phone")} />
                  {errors.phone && (
                    <p className="text-xs text-destructive">
                      {errors.phone.message}
                    </p>
                  )}
                </div>
              </div>
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
                  placeholder="Brief bio..."
                  rows={3}
                  {...register("bio")}
                />
                {errors.bio && (
                  <p className="text-xs text-destructive">
                    {errors.bio.message}
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Name", value: user?.name },
                  { label: "Email", value: user?.email },
                  { label: "Designation", value: recruiter?.designation },
                  { label: "Phone", value: recruiter?.phone },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="font-medium">{value || "—"}</p>
                  </div>
                ))}
              </div>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground mb-1">Bio</p>
                <p className="text-sm">{recruiter?.bio || "—"}</p>
              </div>
              {recruiter?.linkedinProfile && (
                <a
                  href={recruiter.linkedinProfile}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary text-sm flex items-center gap-1 hover:underline"
                >
                  View LinkedIn <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {recruiter?.company && (
                <div>
                  <p className="text-xs text-muted-foreground">Company</p>
                  <p className="font-medium">
                    {recruiter.company?.name || "—"}
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
