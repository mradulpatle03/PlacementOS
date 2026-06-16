import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Trash2, Plus, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import PageHeader from "@/components/ui/PageHeader";
import SkillsInput from "@/components/ui/SkillsInput";
import ProfileMeter from "@/components/ui/ProfileMeter";
import ProjectFormModal from "@/components/ui/ProjectFormModal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { studentAPI } from "@/api/student.api";
import { profileSchema } from "@/lib/validators/student.schema";
import { showSuccess, showError } from "@/lib/toast";
import { FormSkeleton } from "@/components/ui/skeletons";

const BRANCHES = ["CSE", "IT", "ECE", "EEE", "ME", "CE", "Other"];

export default function StudentProfile() {
  const queryClient = useQueryClient();
  const [editingInfo, setEditingInfo] = useState(false);
  const [skills, setSkills] = useState([]);
  const [skillsChanged, setSkillsChanged] = useState(false);
  const [projectModal, setProjectModal] = useState({
    open: false,
    project: null,
  });
  const [deleteConfirm, setDeleteConfirm] = useState({
    open: false,
    projectId: null,
  });

  // Fetch profile
  const { data, isLoading } = useQuery({
    queryKey: ["studentProfile"],
    queryFn: async () => {
      const res = await studentAPI.getMyProfile();
      setSkills(res.data.student.skills || []);
      return res.data.student;
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(profileSchema),
  });

  const startEditing = () => {
    if (!data) return;
    reset({
      rollNumber: data.rollNumber || "",
      branch: data.branch || "",
      graduationYear: data.graduationYear || "",
      cgpa: data.cgpa || "",
      backlogs: data.backlogs ?? 0,
      socialLinks: {
        linkedin: data.socialLinks?.linkedin || "",
        github: data.socialLinks?.github || "",
        portfolio: data.socialLinks?.portfolio || "",
      },
    });
    setEditingInfo(true);
  };

  // Update basic info
  const updateMutation = useMutation({
    mutationFn: studentAPI.updateMyProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["studentProfile"] });
      showSuccess("Profile updated");
      setEditingInfo(false);
    },
    onError: (err) => showError(err.response?.data?.message || "Update failed"),
  });

  // Update skills
  const skillsMutation = useMutation({
    mutationFn: (s) => studentAPI.updateSkills(s),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["studentProfile"] });
      showSuccess("Skills updated");
      setSkillsChanged(false);
    },
    onError: (err) =>
      showError(err.response?.data?.message || "Failed to update skills"),
  });

  // Project mutations
  const addProjectMutation = useMutation({
    mutationFn: studentAPI.addProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["studentProfile"] });
      showSuccess("Project added");
      setProjectModal({ open: false, project: null });
    },
    onError: (err) =>
      showError(err.response?.data?.message || "Failed to add project"),
  });

  const updateProjectMutation = useMutation({
    mutationFn: ({ id, data }) => studentAPI.updateProject(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["studentProfile"] });
      showSuccess("Project updated");
      setProjectModal({ open: false, project: null });
    },
    onError: (err) =>
      showError(err.response?.data?.message || "Failed to update project"),
  });

  const deleteProjectMutation = useMutation({
    mutationFn: studentAPI.deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["studentProfile"] });
      showSuccess("Project deleted");
      setDeleteConfirm({ open: false, projectId: null });
    },
    onError: (err) =>
      showError(err.response?.data?.message || "Failed to delete project"),
  });

  const handleProjectSubmit = (formData) => {
    if (projectModal.project) {
      updateProjectMutation.mutate({
        id: projectModal.project._id,
        data: formData,
      });
    } else {
      addProjectMutation.mutate(formData);
    }
  };

  if (isLoading) return <FormSkeleton />;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="My Profile"
        subtitle="Keep your profile complete to improve eligibility"
      />

      {/* Completeness meter */}
      <Card>
        <CardContent className="pt-6">
          <ProfileMeter student={data} />
        </CardContent>
      </Card>

      {/* Basic Info */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Basic Information</CardTitle>
          {!editingInfo && (
            <Button variant="ghost" size="sm" onClick={startEditing}>
              <Pencil className="h-4 w-4 mr-1" /> Edit
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {editingInfo ? (
            <form
              onSubmit={handleSubmit((d) => updateMutation.mutate(d))}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Roll Number</Label>
                  <Input placeholder="2021CSE001" {...register("rollNumber")} />
                  {errors.rollNumber && (
                    <p className="text-xs text-destructive">
                      {errors.rollNumber.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label>Branch</Label>
                  <Select
                    defaultValue={data?.branch}
                    onValueChange={(v) => setValue("branch", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {BRANCHES.map((b) => (
                        <SelectItem key={b} value={b}>
                          {b}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Graduation Year</Label>
                  <Input
                    type="number"
                    placeholder="2025"
                    {...register("graduationYear")}
                  />
                  {errors.graduationYear && (
                    <p className="text-xs text-destructive">
                      {errors.graduationYear.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label>CGPA</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="8.5"
                    {...register("cgpa")}
                  />
                  {errors.cgpa && (
                    <p className="text-xs text-destructive">
                      {errors.cgpa.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label>Active Backlogs</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    {...register("backlogs")}
                  />
                </div>
              </div>

              <Separator />
              <p className="text-sm font-medium">Social Links</p>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>LinkedIn</Label>
                  <Input
                    placeholder="https://linkedin.com/in/..."
                    {...register("socialLinks.linkedin")}
                  />
                  {errors.socialLinks?.linkedin && (
                    <p className="text-xs text-destructive">
                      {errors.socialLinks.linkedin.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label>GitHub</Label>
                  <Input
                    placeholder="https://github.com/..."
                    {...register("socialLinks.github")}
                  />
                  {errors.socialLinks?.github && (
                    <p className="text-xs text-destructive">
                      {errors.socialLinks.github.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label>Portfolio</Label>
                  <Input
                    placeholder="https://yourportfolio.com"
                    {...register("socialLinks.portfolio")}
                  />
                  {errors.socialLinks?.portfolio && (
                    <p className="text-xs text-destructive">
                      {errors.socialLinks.portfolio.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingInfo(false)}
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
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                { label: "Roll Number", value: data?.rollNumber },
                { label: "Branch", value: data?.branch },
                { label: "Graduation Year", value: data?.graduationYear },
                { label: "CGPA", value: data?.cgpa },
                { label: "Backlogs", value: data?.backlogs ?? 0 },
                { label: "Placement Status", value: data?.placementStatus },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-muted-foreground text-xs">{label}</p>
                  <p className="font-medium">{value || "—"}</p>
                </div>
              ))}
              <div>
                <p className="text-muted-foreground text-xs">LinkedIn</p>
                {data?.socialLinks?.linkedin ? (
                  <a
                    href={data.socialLinks.linkedin}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary text-xs flex items-center gap-1 hover:underline"
                  >
                    View <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <p className="font-medium">—</p>
                )}
              </div>
              <div>
                <p className="text-muted-foreground text-xs">GitHub</p>
                {data?.socialLinks?.github ? (
                  <a
                    href={data.socialLinks.github}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary text-xs flex items-center gap-1 hover:underline"
                  >
                    View <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <p className="font-medium">—</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Skills */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Skills</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <SkillsInput
            skills={skills}
            onChange={(s) => {
              setSkills(s);
              setSkillsChanged(true);
            }}
          />
          {skillsChanged && (
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={() => skillsMutation.mutate(skills)}
                disabled={skillsMutation.isPending}
              >
                {skillsMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Skills
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Projects */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Projects</CardTitle>
          <Button
            size="sm"
            onClick={() => setProjectModal({ open: true, project: null })}
            disabled={(data?.projects?.length || 0) >= 10}
          >
            <Plus className="h-4 w-4 mr-1" /> Add Project
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {(!data?.projects || data.projects.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-6">
              No projects yet. Add your first project!
            </p>
          )}
          {data?.projects?.map((project) => (
            <div key={project._id} className="border rounded-md p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{project.title}</p>
                  {project.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {project.description}
                    </p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0 ml-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setProjectModal({ open: true, project })}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() =>
                      setDeleteConfirm({ open: true, projectId: project._id })
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {project.techStack?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {project.techStack.map((t) => (
                    <span
                      key={t}
                      className="text-xs bg-muted px-2 py-0.5 rounded-full"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
              {project.link && (
                <a
                  href={project.link}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary flex items-center gap-1 hover:underline"
                >
                  View Project <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Modals */}
      <ProjectFormModal
        open={projectModal.open}
        onClose={() => setProjectModal({ open: false, project: null })}
        onSubmit={handleProjectSubmit}
        project={projectModal.project}
        loading={
          addProjectMutation.isPending || updateProjectMutation.isPending
        }
      />

      <ConfirmDialog
        open={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, projectId: null })}
        onConfirm={() => deleteProjectMutation.mutate(deleteConfirm.projectId)}
        loading={deleteProjectMutation.isPending}
        title="Delete Project"
        description="Are you sure you want to delete this project? This cannot be undone."
        confirmLabel="Delete"
      />
    </div>
  );
}
