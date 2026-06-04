import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus,
  Loader2,
  Save,
  Send,
  ArrowLeft,
  Settings2,
  ClipboardList,
} from "lucide-react";

import { assessmentAPI } from "@/api/assessment.api";
import QuestionForm from "@/components/assessment/QuestionForm";
import PageHeader from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import EmptyState from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";

// blank question templates
const blankMCQ = () => ({
  _tempId: crypto.randomUUID(),
  type: "mcq",
  title: "",
  description: "",
  options: [
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
  ],
  testCases: [],
  allowedLanguages: [],
  marks: 1,
  difficulty: "medium",
  order: 0,
});

const blankCoding = () => ({
  _tempId: crypto.randomUUID(),
  type: "coding",
  title: "",
  description: "",
  starterCode: "",
  options: [],
  testCases: [{ input: "", expectedOutput: "", isHidden: false }],
  allowedLanguages: ["python", "javascript", "java", "cpp", "c"],
  marks: 5,
  difficulty: "medium",
  order: 0,
});

// validate before save
function validateForm(meta, questions) {
  if (!meta.title?.trim()) return "Assessment title is required.";
  if (!meta.durationMinutes || meta.durationMinutes < 1)
    return "Duration must be at least 1 minute.";
  if (questions.length === 0) return "Add at least one question.";

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const n = i + 1;
    if (!q.title?.trim()) return `Question ${n}: title is required.`;
    if (q.type === "mcq") {
      if (!q.options || q.options.length < 2)
        return `Question ${n}: add at least 2 options.`;
      if (!q.options.some((o) => o.text?.trim()))
        return `Question ${n}: option text cannot be empty.`;
      if (!q.options.some((o) => o.isCorrect))
        return `Question ${n}: mark one option as correct.`;
    }
    if (q.type === "coding") {
      if (!q.testCases?.length)
        return `Question ${n}: add at least one test case.`;
      for (let j = 0; j < q.testCases.length; j++) {
        if (!q.testCases[j].expectedOutput?.trim())
          return `Question ${n}, Test Case ${j + 1}: expected output is required.`;
      }
    }
  }
  return null;
}

// strip _tempId before sending
function prepareQuestions(questions) {
  return questions.map(({ _tempId, ...q }, idx) => ({ ...q, order: idx }));
}

export default function AssessmentBuilder() {
  const { driveId } = useParams();
  const navigate = useNavigate();

  // meta fields
  const [meta, setMeta] = useState({
    title: "",
    instructions: "",
    durationMinutes: 60,
    startsAt: "",
    endsAt: "",
  });

  // settings
  const [settings, setSettings] = useState({
    shuffleQuestions: false,
    shuffleOptions: false,
    showResultAfterSubmit: false,
    allowTabSwitch: false,
    maxTabSwitches: 3,
    requireFullscreen: true,
    copyPasteDisabled: true,
  });

  const [questions, setQuestions] = useState([]);
  const [showSettings, setShowSettings] = useState(false);

  // fetch drive info for breadcrumb
  const { data: driveData } = useQuery({
    queryKey: ["drive", driveId],
    queryFn: () =>
      import("@/api/drive.api").then((m) =>
        m.driveAPI.getById(driveId).then((r) => r.data.data.drive),
      ),
    enabled: !!driveId,
  });

  // create mutation
  const createMutation = useMutation({
    mutationFn: (payload) => assessmentAPI.create(payload),
    onSuccess: (res) => {
      toast.success("Assessment created successfully!");
      navigate(`/tpo/drives/${driveId}/assessments`);
    },
    onError: (err) => {
      const msg = err?.response?.data?.message;
      toast.error(
        Array.isArray(msg)
          ? msg.join(", ")
          : msg || "Failed to create assessment.",
      );
    },
  });

  // handlers
  const addQuestion = (type) => {
    setQuestions((prev) => [
      ...prev,
      type === "mcq" ? blankMCQ() : blankCoding(),
    ]);
  };

  const updateQuestion = (index, updated) => {
    setQuestions((prev) => prev.map((q, i) => (i === index ? updated : q)));
  };

  const removeQuestion = (index) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = (status = "draft") => {
    const error = validateForm(meta, questions);
    if (error) {
      toast.error(error);
      return;
    }

    createMutation.mutate({
      drive: driveId,
      ...meta,
      durationMinutes: Number(meta.durationMinutes),
      startsAt: meta.startsAt || null,
      endsAt: meta.endsAt || null,
      questions: prepareQuestions(questions),
      settings,
      status,
    });
  };

  const totalMarks = questions.reduce((s, q) => s + (q.marks || 0), 0);
  const isSaving = createMutation.isPending;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Create Assessment"
        subtitle={driveData ? `For: ${driveData.title}` : `Drive ${driveId}`}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
            className="gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
        }
      />

      {/* Meta */}
      <Card>
        <CardContent className="pt-5 space-y-4">
          <p className="text-sm font-semibold text-foreground">
            Assessment Details
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">
                Title *
              </label>
              <Input
                value={meta.title}
                onChange={(e) =>
                  setMeta((p) => ({ ...p, title: e.target.value }))
                }
                placeholder="e.g. Round 1 — Aptitude + Coding"
                className="text-sm"
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">
                Instructions
              </label>
              <textarea
                value={meta.instructions}
                onChange={(e) =>
                  setMeta((p) => ({ ...p, instructions: e.target.value }))
                }
                placeholder="Instructions shown to students before they begin…"
                rows={3}
                className="w-full text-sm rounded-lg border bg-background px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Duration (minutes) *
              </label>
              <Input
                type="number"
                min={1}
                value={meta.durationMinutes}
                onChange={(e) =>
                  setMeta((p) => ({ ...p, durationMinutes: e.target.value }))
                }
                className="text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Total Marks
                <span className="ml-2 font-semibold text-foreground">
                  {totalMarks}
                </span>
              </label>
              <p className="text-xs text-muted-foreground pt-2">
                Auto-computed from questions below.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Opens At (optional)
              </label>
              <Input
                type="datetime-local"
                value={meta.startsAt}
                onChange={(e) =>
                  setMeta((p) => ({ ...p, startsAt: e.target.value }))
                }
                className="text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Closes At (optional)
              </label>
              <Input
                type="datetime-local"
                value={meta.endsAt}
                onChange={(e) =>
                  setMeta((p) => ({ ...p, endsAt: e.target.value }))
                }
                className="text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings (collapsible) */}
      <Card>
        <CardContent className="pt-5 space-y-4">
          <button
            onClick={() => setShowSettings((p) => !p)}
            className="flex items-center gap-2 text-sm font-semibold text-foreground w-full text-left"
          >
            <Settings2 className="w-4 h-4 text-muted-foreground" />
            Anti-cheat &amp; Settings
            <span className="ml-auto text-xs text-muted-foreground font-normal">
              {showSettings ? "Hide" : "Show"}
            </span>
          </button>

          {showSettings && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t">
              {[
                { key: "requireFullscreen", label: "Require Fullscreen" },
                { key: "copyPasteDisabled", label: "Disable Copy/Paste" },
                { key: "shuffleQuestions", label: "Shuffle Questions" },
                { key: "shuffleOptions", label: "Shuffle MCQ Options" },
                {
                  key: "showResultAfterSubmit",
                  label: "Show Result After Submit",
                },
                { key: "allowTabSwitch", label: "Allow Tab Switching" },
              ].map(({ key, label }) => (
                <label
                  key={key}
                  className="flex items-center gap-2.5 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={settings[key]}
                    onChange={(e) =>
                      setSettings((p) => ({ ...p, [key]: e.target.checked }))
                    }
                    className="rounded"
                  />
                  <span className="text-sm text-foreground">{label}</span>
                </label>
              ))}

              {!settings.allowTabSwitch && (
                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    Max Tab Switches Before Auto-submit
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={settings.maxTabSwitches}
                    onChange={(e) =>
                      setSettings((p) => ({
                        ...p,
                        maxTabSwitches: Number(e.target.value),
                      }))
                    }
                    className="text-sm w-32"
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Question bank */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-muted-foreground" />
            Questions
            {questions.length > 0 && (
              <span className="text-xs font-normal text-muted-foreground">
                ({questions.length} · {totalMarks} marks total)
              </span>
            )}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => addQuestion("mcq")}
            >
              <Plus className="w-3.5 h-3.5" /> MCQ
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => addQuestion("coding")}
            >
              <Plus className="w-3.5 h-3.5" /> Coding
            </Button>
          </div>
        </div>

        {questions.length === 0 ? (
          <Card>
            <CardContent className="pt-0">
              <EmptyState
                icon={ClipboardList}
                title="No questions yet"
                description="Add MCQ or Coding questions using the buttons above."
              />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {questions.map((q, idx) => (
              <QuestionForm
                key={q._tempId || idx}
                question={q}
                index={idx}
                onChange={(updated) => updateQuestion(idx, updated)}
                onRemove={() => removeQuestion(idx)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-between pb-8">
        <Button variant="outline" onClick={() => navigate(-1)}>
          Cancel
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => handleSave("draft")}
            disabled={isSaving}
            className="gap-1.5"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save as Draft
          </Button>
          <Button
            onClick={() => handleSave("active")}
            disabled={isSaving}
            className="gap-1.5"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Publish Assessment
          </Button>
        </div>
      </div>
    </div>
  );
}
