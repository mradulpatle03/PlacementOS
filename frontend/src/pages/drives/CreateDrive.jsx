import { Card, CardContent } from "@/components/ui/card";
import PageHeader from "@/components/ui/PageHeader";
import WizardProgress from "@/components/drive/WizardProgress";
import StepBasics from "@/components/drive/wizard/StepBasics";
import StepEligibility from "@/components/drive/wizard/StepEligibility";
import StepRounds from "@/components/drive/wizard/StepRounds";
import StepSettings from "@/components/drive/wizard/StepSettings";
import StepReview from "@/components/drive/wizard/StepReview";
import { useDriveWizard } from "@/hooks/useDriveWizard";

export default function CreateDrive() {
  const { STEPS, currentStep, data, updateData, nextStep, prevStep, goToStep } =
    useDriveWizard();

  const handleStepNext = (stepData) => {
    updateData(stepData);
    nextStep();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="Create Placement Drive"
        subtitle="Fill in the details step by step"
      />

      <WizardProgress
        steps={STEPS}
        currentStep={currentStep}
        onStepClick={goToStep}
      />

      <Card>
        <CardContent className="pt-6">
          <div className="mb-4 pb-4 border-b">
            <p className="font-semibold">{STEPS[currentStep - 1].label}</p>
            <p className="text-sm text-muted-foreground">
              {STEPS[currentStep - 1].description}
            </p>
          </div>

          {currentStep === 1 && (
            <StepBasics data={data} onNext={handleStepNext} />
          )}
          {currentStep === 2 && (
            <StepEligibility
              data={data}
              onNext={handleStepNext}
              onBack={prevStep}
            />
          )}
          {currentStep === 3 && (
            <StepRounds data={data} onNext={handleStepNext} onBack={prevStep} />
          )}
          {currentStep === 4 && (
            <StepSettings
              data={data}
              onNext={handleStepNext}
              onBack={prevStep}
            />
          )}
          {currentStep === 5 && <StepReview data={data} onBack={prevStep} />}
        </CardContent>
      </Card>
    </div>
  );
}
