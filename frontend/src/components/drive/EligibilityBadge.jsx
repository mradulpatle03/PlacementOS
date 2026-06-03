import { useState } from "react";
import { useCheckEligibility } from "../../hooks/useEligibility";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Badge } from "../ui/badge";
import { CheckCircle2, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "../ui/button";

// small inline badge shown on drive cards
export const EligibilityBadge = ({ driveId }) => {
  const [open, setOpen] = useState(false);
  const { data, isLoading, isError } = useCheckEligibility(driveId);

  if (isLoading) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Checking…
      </span>
    );
  }

  if (isError || !data) return null;

  if (data.eligible) {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-green-500 text-green-600 dark:text-green-400"
      >
        <CheckCircle2 className="h-3 w-3" />
        Eligible
      </Badge>
    );
  }

  // not eligible — show badge + trigger modal
  return (
    <>
      <button
        onClick={(e) => {
          e.preventDefault(); // don't navigate if inside a Link
          e.stopPropagation();
          setOpen(true);
        }}
        className="inline-flex items-center gap-1 rounded-full border border-red-400 px-2 py-0.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
      >
        <XCircle className="h-3 w-3" />
        Not Eligible
      </button>

      <WhyNotEligibleModal
        open={open}
        onClose={() => setOpen(false)}
        data={data}
      />
    </>
  );
};

// modal with full reason breakdown
const WhyNotEligibleModal = ({ open, onClose, data }) => {
  if (!data) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-500">
            <XCircle className="h-5 w-5" />
            Not Eligible — {data.driveTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* hard blocks */}
          {data.reasons && data.reasons.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium text-foreground">
                Why you cannot apply:
              </p>
              <ul className="space-y-2">
                {data.reasons.map((reason, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 rounded-md bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-300"
                  >
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* soft warnings */}
          {data.warnings && data.warnings.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium text-foreground">
                Profile warnings:
              </p>
              <ul className="space-y-2">
                {data.warnings.map((warning, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 rounded-md bg-yellow-50 dark:bg-yellow-950/40 px-3 py-2 text-sm text-yellow-700 dark:text-yellow-300"
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Update your profile to meet eligibility criteria before the drive
            closes.
          </p>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
            <Button
              size="sm"
              onClick={() => {
                onClose();
                window.location.href = "/student/profile";
              }}
            >
              Go to Profile
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EligibilityBadge;
