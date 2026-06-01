import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export default function WizardProgress({ steps, currentStep, onStepClick }) {
  return (
    <div className="flex items-center justify-between w-full">
      {steps.map((step, i) => {
        const isDone = step.id < currentStep;
        const isActive = step.id === currentStep;
        const isLast = i === steps.length - 1;

        return (
          <div key={step.id} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <button
                onClick={() => isDone && onStepClick(step.id)}
                disabled={!isDone}
                className={cn(
                  "h-9 w-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all border-2",
                  isDone &&
                    "bg-primary border-primary text-primary-foreground cursor-pointer hover:bg-primary/90",
                  isActive && "border-primary text-primary bg-background",
                  !isDone &&
                    !isActive &&
                    "border-muted text-muted-foreground bg-background",
                )}
              >
                {isDone ? <Check className="h-4 w-4" /> : step.id}
              </button>
              <span
                className={cn(
                  "text-xs mt-1 hidden sm:block font-medium",
                  isActive
                    ? "text-primary"
                    : isDone
                      ? "text-foreground"
                      : "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </div>
            {!isLast && (
              <div
                className={cn(
                  "flex-1 h-0.5 mx-2 transition-colors",
                  isDone ? "bg-primary" : "bg-muted",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
