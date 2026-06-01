import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, Loader2 } from "lucide-react";
import { companyAPI } from "@/api/company.api";
import { showSuccess, showError } from "@/lib/toast";
import { cn } from "@/lib/utils";

export default function LogoUpload({ companyId, logoUrl, companyName }) {
  const queryClient = useQueryClient();
  const inputRef = useRef();
  const [preview, setPreview] = useState(logoUrl);

  const mutation = useMutation({
    mutationFn: ({ id, formData }) => companyAPI.uploadLogo(id, formData),
    onSuccess: (res) => {
      setPreview(res.data.logo.cloudinaryUrl);
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["company", companyId] });
      showSuccess("Logo updated");
    },
    onError: (err) =>
      showError(err.response?.data?.message || "Logo upload failed"),
  });

  const handleFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showError("Only image files allowed");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showError("Image must be under 2MB");
      return;
    }

    const formData = new FormData();
    formData.append("logo", file);
    mutation.mutate({ id: companyId, formData });
  };

  return (
    <div
      className="relative h-20 w-20 rounded-xl border-2 border-dashed border-muted cursor-pointer hover:border-primary transition-colors"
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files[0])}
      />
      {preview ? (
        <img
          src={preview}
          alt={companyName}
          className="h-full w-full object-contain rounded-xl p-1"
        />
      ) : (
        <div className="h-full w-full flex items-center justify-center">
          <span className="text-2xl font-bold text-muted-foreground">
            {companyName?.charAt(0).toUpperCase()}
          </span>
        </div>
      )}
      <div
        className={cn(
          "absolute inset-0 rounded-xl bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity",
          mutation.isPending && "opacity-100",
        )}
      >
        {mutation.isPending ? (
          <Loader2 className="h-5 w-5 text-white animate-spin" />
        ) : (
          <Camera className="h-5 w-5 text-white" />
        )}
      </div>
    </div>
  );
}
