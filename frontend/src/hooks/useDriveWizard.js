import { useState } from "react";

const STEPS = [
  { id: 1, label: "Basics", description: "Company, title, roles, location" },
  { id: 2, label: "Eligibility", description: "CGPA, branches, backlogs" },
  { id: 3, label: "Rounds", description: "Interview and assessment rounds" },
  { id: 4, label: "Settings", description: "Policies and preferences" },
  { id: 5, label: "Review", description: "Review and publish" },
];

const defaultData = {
  // step 1
  company: "",
  title: "",
  roles: [{ title: "", ctc: "", openings: 1, description: "" }],
  location: "",
  mode: "oncampus",
  applicationDeadline: "",
  driveDate: "",
  // step 2
  eligibility: {
    minCGPA: 0,
    maxBacklogs: 0,
    allowedBranches: ["CSE", "IT", "ECE", "EEE", "ME", "CE", "Other"],
    graduationYear: [],
    genderRestriction: "any",
  },
  // step 3
  rounds: [],
  // step 4
  settings: {
    oneOfferPolicy: true,
    dreamPackageLPA: 0,
    allowLateApplications: false,
    gracePeriodHours: 0,
    autoShortlist: false,
    notifyOnStatusChange: true,
  },
};

export function useDriveWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState(defaultData);

  const updateData = (stepData) => {
    setData((prev) => ({ ...prev, ...stepData }));
  };

  const nextStep = () => setCurrentStep((s) => Math.min(s + 1, STEPS.length));
  const prevStep = () => setCurrentStep((s) => Math.max(s - 1, 1));
  const goToStep = (step) => setCurrentStep(step);

  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === STEPS.length;

  return {
    STEPS,
    currentStep,
    data,
    updateData,
    nextStep,
    prevStep,
    goToStep,
    isFirstStep,
    isLastStep,
  };
}
