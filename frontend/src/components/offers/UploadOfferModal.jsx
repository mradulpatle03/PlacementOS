import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { Upload, FileText, X, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { offerAPI } from "@/api/offer.api";
import { getApplicationsByDrive } from "@/api/application.api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// fetch offered-stage applications for this drive so recruiter
// can pick which student the offer is for
const useOfferedApplications = (driveId) =>
  useQuery({
    queryKey: ["applications-offered", driveId],
    queryFn: () =>
      getApplicationsByDrive(driveId, { status: "offered", limit: 100 })
        .then((r) => r.data.data.applications || []),
    enabled: !!driveId,
  });

export default function UploadOfferModal({
  open,
  onClose,
  driveId,
  onSuccess,
}) {
  const fileRef = useRef(null);

  const [form, setForm] = useState({
    applicationId: "",
    ctc: "",
    designation: "",
    location: "",
    joiningDate: "",
    responseDeadline: "",
  });
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [errors, setErrors] = useState({});

  const { data: applications = [], isLoading: appsLoading } =
    useOfferedApplications(driveId);

  const uploadMutation = useMutation({
    mutationFn: (fd) => offerAPI.upload(fd),
    onSuccess: () => {
      toast.success("Offer letter uploaded successfully");
      resetForm();
      onSuccess?.();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Upload failed");
    },
  });

  const resetForm = () => {
    setForm({
      applicationId: "",
      ctc: "",
      designation: "",
      location: "",
      joiningDate: "",
      responseDeadline: "",
    });
    setFile(null);
    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleFile = (f) => {
    if (!f) return;
    if (f.type !== "application/pdf") {
      setErrors((p) => ({ ...p, file: "Only PDF files are accepted" }));
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setErrors((p) => ({ ...p, file: "File size must be under 5 MB" }));
      return;
    }
    setFile(f);
    setErrors((p) => ({ ...p, file: undefined }));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const validate = () => {
    const errs = {};
    if (!form.applicationId) errs.applicationId = "Please select a student";
    if (!file) errs.file = "Offer letter PDF is required";
    if (form.ctc && isNaN(Number(form.ctc))) errs.ctc = "CTC must be a number";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const fd = new FormData();
    fd.append("offerLetter", file);
    fd.append("applicationId", form.applicationId);
    if (form.ctc) fd.append("ctc", form.ctc);
    if (form.designation) fd.append("designation", form.designation);
    if (form.location) fd.append("location", form.location);
    if (form.joiningDate) fd.append("joiningDate", form.joiningDate);
    if (form.responseDeadline)
      fd.append("responseDeadline", form.responseDeadline);

    uploadMutation.mutate(fd);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      <div className="relative z-10 w-full max-w-lg bg-background rounded-2xl shadow-2xl overflow-hidden">
        {/* header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold">Upload Offer Letter</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* body */}
        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* student selector */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Student <span className="text-destructive">*</span>
            </label>
            {appsLoading ? (
              <div className="h-9 rounded-lg border bg-muted animate-pulse" />
            ) : applications.length === 0 ? (
              <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                No students at "offered" stage for this drive. Move candidates
                to the "Offered" pipeline stage first.
              </div>
            ) : (
              <select
                value={form.applicationId}
                onChange={(e) =>
                  setForm((p) => ({ ...p, applicationId: e.target.value }))
                }
                className={cn(
                  "w-full h-9 rounded-lg border bg-background px-3 text-sm",
                  "focus:outline-none focus:ring-2 focus:ring-primary/30",
                  errors.applicationId && "border-destructive",
                )}
              >
                <option value="">Select student…</option>
                {applications.map((app) => {
                  const name = app.student?.user?.name || "Unknown";
                  const email = app.student?.user?.email || "";
                  return (
                    <option key={app._id} value={app._id}>
                      {name} — {email}
                    </option>
                  );
                })}
              </select>
            )}
            {errors.applicationId && (
              <p className="text-xs text-destructive mt-1">
                {errors.applicationId}
              </p>
            )}
          </div>

          {/* PDF drop zone */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Offer Letter PDF <span className="text-destructive">*</span>
            </label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors",
                dragOver
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/30",
                errors.file && "border-destructive",
              )}
            >
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => handleFile(e.target.files[0])}
              />
              {file ? (
                <div className="flex items-center justify-center gap-2 text-sm">
                  <FileText className="w-5 h-5 text-primary" />
                  <span className="font-medium truncate max-w-xs">
                    {file.name}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  <Upload className="w-6 h-6 text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground">
                    Drag & drop or{" "}
                    <span className="text-primary font-medium">browse</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PDF only, max 5 MB
                  </p>
                </div>
              )}
            </div>
            {errors.file && (
              <p className="text-xs text-destructive mt-1">{errors.file}</p>
            )}
          </div>

          {/* offer details — 2 col grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                key: "ctc",
                label: "CTC (LPA)",
                type: "number",
                placeholder: "e.g. 12",
              },
              {
                key: "designation",
                label: "Designation",
                type: "text",
                placeholder: "e.g. SDE-1",
              },
              {
                key: "location",
                label: "Location",
                type: "text",
                placeholder: "e.g. Bangalore",
              },
              {
                key: "joiningDate",
                label: "Joining Date",
                type: "date",
                placeholder: "",
              },
            ].map(({ key, label, type, placeholder }) => (
              <div key={key}>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  {label}
                </label>
                <input
                  type={type}
                  value={form[key]}
                  placeholder={placeholder}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, [key]: e.target.value }))
                  }
                  className={cn(
                    "w-full h-9 rounded-lg border bg-background px-3 text-sm",
                    "focus:outline-none focus:ring-2 focus:ring-primary/30",
                    errors[key] && "border-destructive",
                  )}
                />
                {errors[key] && (
                  <p className="text-xs text-destructive mt-1">{errors[key]}</p>
                )}
              </div>
            ))}
          </div>

          {/* response deadline — full width */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Response Deadline
            </label>
            <input
              type="date"
              value={form.responseDeadline}
              onChange={(e) =>
                setForm((p) => ({ ...p, responseDeadline: e.target.value }))
              }
              min={new Date().toISOString().split("T")[0]}
              className="w-full h-9 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        {/* footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t bg-muted/20">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={uploadMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={uploadMutation.isPending || applications.length === 0}
            className="gap-1.5"
          >
            {uploadMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Uploading…
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" /> Upload Offer
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
