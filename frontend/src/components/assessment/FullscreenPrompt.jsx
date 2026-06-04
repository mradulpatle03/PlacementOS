import { useState } from "react";
import {
  Maximize2,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const RULES = [
  "Do not switch tabs or windows during the assessment.",
  "Keep the browser in fullscreen mode at all times.",
  "Do not copy or paste content outside the code editor.",
  "Do not open developer tools (F12).",
  "Violating rules will be recorded and may cause auto-submission.",
];

/**
 * Full-screen gate shown before the assessment starts.
 * Student must click "Enter Fullscreen & Begin" to proceed.
 *
 * @param {object}   assessment   - assessment object (title, durationMinutes, settings)
 * @param {Function} onBegin      - called after fullscreen is entered
 */
export default function FullscreenPrompt({ assessment, onBegin }) {
  const [entering, setEntering] = useState(false);
  const [error, setError] = useState("");

  const requireFullscreen = assessment?.settings?.requireFullscreen !== false;

  const handleBegin = async () => {
    setEntering(true);
    setError("");

    try {
      if (requireFullscreen) {
        await document.documentElement.requestFullscreen?.();
      }
      onBegin();
    } catch {
      setError(
        "Could not enter fullscreen. Please allow fullscreen access in your browser and try again.",
      );
      setEntering(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-lg w-full space-y-6">
        {/* header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">
            {assessment?.title || "Online Assessment"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Duration: <strong>{assessment?.durationMinutes} minutes</strong>
            {" · "}
            {assessment?.totalQuestions} question
            {assessment?.totalQuestions !== 1 ? "s" : ""}
            {" · "}
            {assessment?.totalMarks} mark
            {assessment?.totalMarks !== 1 ? "s" : ""}
          </p>
        </div>

        {/* instructions */}
        {assessment?.instructions && (
          <div className="rounded-lg border bg-muted/30 p-4 text-sm text-foreground whitespace-pre-wrap">
            {assessment.instructions}
          </div>
        )}

        {/* rules */}
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-4 space-y-2">
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            Assessment Rules
          </p>
          <ul className="space-y-1.5">
            {RULES.map((rule, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-500" />
                {rule}
              </li>
            ))}
          </ul>
        </div>

        {/* max tab switches info */}
        {!assessment?.settings?.allowTabSwitch && (
          <p className="text-xs text-center text-muted-foreground">
            You are allowed{" "}
            <strong className="text-foreground">
              {assessment?.settings?.maxTabSwitches ?? 3}
            </strong>{" "}
            tab switch warning(s) before auto-submission.
          </p>
        )}

        {/* error */}
        {error && (
          <p className="text-xs text-center text-destructive">{error}</p>
        )}

        {/* CTA */}
        <Button
          className="w-full gap-2"
          size="lg"
          onClick={handleBegin}
          disabled={entering}
        >
          <Maximize2 className="w-4 h-4" />
          {requireFullscreen ? "Enter Fullscreen & Begin" : "Begin Assessment"}
        </Button>

        <p className="text-[11px] text-center text-muted-foreground">
          By beginning, you agree to follow the assessment rules above.
        </p>
      </div>
    </div>
  );
}
