import { useState } from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const BLANK_MCQ_OPTION = { text: "", isCorrect: false };

const DIFFICULTY_OPTIONS = ["easy", "medium", "hard"];
const LANGUAGE_OPTIONS = [
  "python",
  "javascript",
  "java",
  "cpp",
  "c",
  "go",
  "rust",
];

/**
 * Single question editor — supports MCQ and Coding.
 *
 * @param {object}   question   - current question object
 * @param {number}   index      - position in the list (for display)
 * @param {Function} onChange   - (updatedQuestion) => void
 * @param {Function} onRemove   - () => void
 */
export default function QuestionForm({ question, index, onChange, onRemove }) {
  const [collapsed, setCollapsed] = useState(false);

  const update = (fields) => onChange({ ...question, ...fields });

  // MCQ helpers
  const updateOption = (i, fields) => {
    const opts = question.options.map((o, idx) =>
      idx === i ? { ...o, ...fields } : o,
    );
    update({ options: opts });
  };

  const addOption = () => {
    if (question.options.length >= 5) return;
    update({ options: [...question.options, { ...BLANK_MCQ_OPTION }] });
  };

  const removeOption = (i) => {
    update({ options: question.options.filter((_, idx) => idx !== i) });
  };

  const setCorrect = (i) => {
    const opts = question.options.map((o, idx) => ({
      ...o,
      isCorrect: idx === i,
    }));
    update({ options: opts });
  };

  // Coding helpers
  const updateTestCase = (i, fields) => {
    const tcs = question.testCases.map((t, idx) =>
      idx === i ? { ...t, ...fields } : t,
    );
    update({ testCases: tcs });
  };

  const addTestCase = () => {
    update({
      testCases: [
        ...(question.testCases || []),
        { input: "", expectedOutput: "", isHidden: false },
      ],
    });
  };

  const removeTestCase = (i) => {
    update({ testCases: question.testCases.filter((_, idx) => idx !== i) });
  };

  const toggleLang = (lang) => {
    const cur = question.allowedLanguages || [];
    const next = cur.includes(lang)
      ? cur.filter((l) => l !== lang)
      : [...cur, lang];
    update({ allowedLanguages: next.length ? next : [lang] }); // at least one
  };

  const OPTION_LABELS = ["A", "B", "C", "D", "E"];

  return (
    <div className="rounded-xl border bg-card shadow-sm">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
        onClick={() => setCollapsed((p) => !p)}
      >
        <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
        <span
          className={cn(
            "text-xs font-semibold px-2 py-0.5 rounded-full",
            question.type === "mcq"
              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
              : "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
          )}
        >
          {question.type === "mcq" ? "MCQ" : "Coding"}
        </span>
        <p className="flex-1 text-sm font-medium truncate text-foreground">
          {question.title || `Question ${index + 1}`}
        </p>
        <span className="text-xs text-muted-foreground shrink-0">
          {question.marks}m · {question.difficulty}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="text-muted-foreground hover:text-destructive transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      {!collapsed && (
        <div className="px-4 pb-4 space-y-4 border-t pt-4">
          {/* type toggle */}
          <div className="flex gap-2">
            {["mcq", "coding"].map((t) => (
              <button
                key={t}
                onClick={() =>
                  update({
                    type: t,
                    options:
                      t === "mcq"
                        ? [
                            { text: "", isCorrect: false },
                            { text: "", isCorrect: false },
                          ]
                        : [],
                    testCases:
                      t === "coding"
                        ? [{ input: "", expectedOutput: "", isHidden: false }]
                        : [],
                    allowedLanguages:
                      t === "coding"
                        ? ["python", "javascript", "java", "cpp", "c"]
                        : [],
                  })
                }
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-medium border transition-colors",
                  question.type === t
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:border-primary/40",
                )}
              >
                {t === "mcq" ? "MCQ" : "Coding"}
              </button>
            ))}
          </div>

          {/* title */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Question Title *
            </label>
            <Input
              value={question.title}
              onChange={(e) => update({ title: e.target.value })}
              placeholder="Enter the question…"
              className="text-sm"
            />
          </div>

          {/* description */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Description / Context
            </label>
            <textarea
              value={question.description || ""}
              onChange={(e) => update({ description: e.target.value })}
              placeholder="Add additional context, constraints, or examples…"
              rows={3}
              className="w-full text-sm rounded-lg border bg-background px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {/* marks + difficulty */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Marks
              </label>
              <Input
                type="number"
                min={1}
                value={question.marks}
                onChange={(e) => update({ marks: Number(e.target.value) || 1 })}
                className="text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Difficulty
              </label>
              <div className="flex gap-1.5">
                {DIFFICULTY_OPTIONS.map((d) => (
                  <button
                    key={d}
                    onClick={() => update({ difficulty: d })}
                    className={cn(
                      "flex-1 py-1.5 rounded-lg text-xs font-medium border capitalize transition-colors",
                      question.difficulty === d
                        ? d === "easy"
                          ? "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700"
                          : d === "medium"
                            ? "bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-700"
                            : "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700"
                        : "border-border text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* MCQ options */}
          {question.type === "mcq" && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Options — click circle to mark correct answer *
              </label>
              {(question.options || []).map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  {/* correct marker */}
                  <button
                    onClick={() => setCorrect(i)}
                    className={cn(
                      "w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors text-xs font-bold",
                      opt.isCorrect
                        ? "bg-emerald-500 border-emerald-500 text-white"
                        : "border-border text-muted-foreground hover:border-emerald-400",
                    )}
                  >
                    {OPTION_LABELS[i]}
                  </button>
                  <Input
                    value={opt.text}
                    onChange={(e) => updateOption(i, { text: e.target.value })}
                    placeholder={`Option ${OPTION_LABELS[i]}`}
                    className="text-sm flex-1"
                  />
                  {question.options.length > 2 && (
                    <button
                      onClick={() => removeOption(i)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
              {question.options.length < 5 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={addOption}
                >
                  <Plus className="w-3.5 h-3.5" /> Add Option
                </Button>
              )}
            </div>
          )}

          {/* Coding: test cases + languages */}
          {question.type === "coding" && (
            <div className="space-y-4">
              {/* starter code */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Starter Code (optional)
                </label>
                <textarea
                  value={question.starterCode || ""}
                  onChange={(e) => update({ starterCode: e.target.value })}
                  placeholder="// starter code shown to student"
                  rows={4}
                  className="w-full font-mono text-xs rounded-lg border bg-muted/30 px-3 py-2 resize-y focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              {/* allowed languages */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Allowed Languages
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <button
                      key={lang}
                      onClick={() => toggleLang(lang)}
                      className={cn(
                        "px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
                        (question.allowedLanguages || []).includes(lang)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-muted-foreground hover:border-primary/40",
                      )}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>

              {/* test cases */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Test Cases *
                </label>
                {(question.testCases || []).map((tc, i) => (
                  <div
                    key={i}
                    className="rounded-lg border bg-muted/20 p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        Test Case {i + 1}
                      </span>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                          <input
                            type="checkbox"
                            checked={tc.isHidden || false}
                            onChange={(e) =>
                              updateTestCase(i, { isHidden: e.target.checked })
                            }
                            className="rounded"
                          />
                          Hidden
                        </label>
                        {question.testCases.length > 1 && (
                          <button
                            onClick={() => removeTestCase(i)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[11px] text-muted-foreground">
                          Input
                        </label>
                        <textarea
                          value={tc.input || ""}
                          onChange={(e) =>
                            updateTestCase(i, { input: e.target.value })
                          }
                          placeholder="stdin input"
                          rows={2}
                          className="w-full font-mono text-xs rounded border bg-background px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] text-muted-foreground">
                          Expected Output *
                        </label>
                        <textarea
                          value={tc.expectedOutput || ""}
                          onChange={(e) =>
                            updateTestCase(i, {
                              expectedOutput: e.target.value,
                            })
                          }
                          placeholder="expected stdout"
                          rows={2}
                          className="w-full font-mono text-xs rounded border bg-background px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={addTestCase}
                >
                  <Plus className="w-3.5 h-3.5" /> Add Test Case
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
