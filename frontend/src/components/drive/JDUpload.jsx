import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Upload, Eye, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { driveAPI } from "@/api/drive.api";
import { showSuccess, showError } from "@/lib/toast";

/**
 * JD (Job Description) upload / preview / delete card.
 *
 * - canManage (TPO/admin): sees upload / replace / delete controls
 * - everyone else: sees "Preview JD" only, if a JD exists
 *
 * Mirrors the mutation pattern used by LogoUpload.jsx.
 */
export default function JDUpload({ driveId, jd, canManage, onPreview }) {
  const queryClient = useQueryClient();
  const inputRef = useRef();
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const hasJD = !!jd?.cloudinaryUrl;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["drive", driveId] });
  };

  const uploadMutation = useMutation({
    mutationFn: (formData) => driveAPI.uploadJD(driveId, formData),
    onSuccess: () => {
      invalidate();
      showSuccess(hasJD ? "JD replaced" : "JD uploaded");
    },
    onError: (err) =>
      showError(err.response?.data?.message || "JD upload failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => driveAPI.deleteJD(driveId),
    onSuccess: () => {
      invalidate();
      showSuccess("JD deleted");
      setDeleteConfirm(false);
    },
    onError: (err) =>
      showError(err.response?.data?.message || "Failed to delete JD"),
  });

  const handleFile = (file) => {
    if (!file) return;
    if (file.type !== "application/pdf") {
      showError("Only PDF files are allowed");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showError("File size must be under 5MB");
      return;
    }
    const formData = new FormData();
    formData.append("jd", file); // field name must match upload.single("jd") in drive.routes.js
    uploadMutation.mutate(formData);
  };

  const busy = uploadMutation.isPending || deleteMutation.isPending;

  return (
    <>
      <div className="space-y-2">
        {/* no JD yet, and viewer can't manage — nothing to show */}
        {!hasJD && !canManage && (
          <p className="text-sm text-muted-foreground">
            No job description has been uploaded yet.
          </p>
        )}

        {/* no JD yet, TPO view — upload prompt */}
        {!hasJD && canManage && (
          <div
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
          >
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => handleFile(e.target.files[0])}
            />
            {uploadMutation.isPending ? (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
                <p className="text-sm">Uploading…</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Upload className="h-6 w-6" />
                <p className="text-sm">Click to upload Job Description</p>
                <p className="text-xs">PDF only · Max 5MB</p>
              </div>
            )}
          </div>
        )}

        {/* JD exists — preview + manage controls */}
        {hasJD && (
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-primary shrink-0" />
              <span className="text-muted-foreground">
                Job description available
              </span>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={onPreview}
                className="gap-1.5"
              >
                <Eye className="h-3.5 w-3.5" /> Preview JD
              </Button>

              {canManage && (
                <>
                  <input
                    ref={inputRef}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => handleFile(e.target.files[0])}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => inputRef.current?.click()}
                    disabled={busy}
                    className="gap-1.5"
                  >
                    {uploadMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                    Replace
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteConfirm(true)}
                    disabled={busy}
                    className="text-destructive hover:text-destructive gap-1.5"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
        title="Delete Job Description?"
        description="This will permanently remove the JD PDF from this drive. This cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
      />
    </>
  );
}