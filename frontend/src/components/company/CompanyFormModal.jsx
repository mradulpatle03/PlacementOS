import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { companySchema } from "@/lib/validators/company.schema";

const SECTORS = [
  "Technology",
  "Finance",
  "Consulting",
  "Manufacturing",
  "Healthcare",
  "E-commerce",
  "Automobile",
  "Education",
  "Media",
  "Government",
  "Other",
];

export default function CompanyFormModal({
  open,
  onClose,
  onSubmit,
  company,
  loading,
}) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(companySchema),
  });

  useEffect(() => {
    if (company) {
      reset({
        name: company.name || "",
        sector: company.sector || "",
        location: company.location || "",
        website: company.website || "",
        description: company.description || "",
        packageRange: {
          min: company.packageRange?.min || "",
          max: company.packageRange?.max || "",
        },
      });
    } else {
      reset({
        name: "",
        sector: "",
        location: "",
        website: "",
        description: "",
        packageRange: { min: "", max: "" },
      });
    }
  }, [company, reset]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={company ? "Edit Company" : "Add Company"}
      className="max-w-xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
        <div className="space-y-1">
          <Label>Company Name *</Label>
          <Input placeholder="Google" {...register("name")} />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Sector</Label>
            <Select
              defaultValue={company?.sector}
              onValueChange={(v) => setValue("sector", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select sector" />
              </SelectTrigger>
              <SelectContent>
                {SECTORS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Location</Label>
            <Input placeholder="Bangalore" {...register("location")} />
          </div>
        </div>

        <div className="space-y-1">
          <Label>Website</Label>
          <Input placeholder="https://company.com" {...register("website")} />
          {errors.website && (
            <p className="text-xs text-destructive">{errors.website.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label>Package Range (LPA)</Label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Input
                type="number"
                placeholder="Min (e.g. 8)"
                {...register("packageRange.min")}
              />
            </div>
            <div>
              <Input
                type="number"
                placeholder="Max (e.g. 50)"
                {...register("packageRange.max")}
              />
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <Label>Description</Label>
          <Textarea
            placeholder="Brief description..."
            rows={3}
            {...register("description")}
          />
          {errors.description && (
            <p className="text-xs text-destructive">
              {errors.description.message}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {company ? "Save Changes" : "Create Company"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
