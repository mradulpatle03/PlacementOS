import { useState } from "react";
import Editor from "@monaco-editor/react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Play, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { submissionAPI } from "@/api/assessment.api";

const LANGUAGES = [
  { value: "python", label: "Python" },
  { value: "javascript", label: "JavaScript" },
  { value: "java", label: "Java" },
  { value: "cpp", label: "C++" },
  { value: "c", label: "C" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
];

// Monaco language IDs differ slightly from our backend keys
const MONACO_LANG = {
  python: "python",
  javascript: "javascript",
  java: "java",
  cpp: "cpp",
  c: "c",
  go: "go",
  rust: "rust",
};

export default function CodingQuestion({ question, answer, onAnswer }) {
  const allowedLangs = question.allowedLanguages?.length
    ? LANGUAGES.filter((l) => question.allowedLanguages.includes(l.value))
    : LANGUAGES;

  const [language, setLanguage] = useState(
    answer?.language || allowedLangs[0]?.value || "python",
  );
  const [code, setCode] = useState(answer?.code || question.starterCode || "");
  const [customInput, setCustomInput] = useState("");
  const [runResult, setRunResult] = useState(null);
  const [showInput, setShowInput] = useState(false);

  // live run (visible test cases only)
  const runMutation = useMutation({
    mutationFn: () => submissionAPI.runCode(code, language, customInput),
    onSuccess: (res) => {
      setRunResult(res.data.data);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Code execution failed");
    },
  });

  const handleCodeChange = (val) => {
    setCode(val || "");
    onAnswer({ code: val || "", language });
  };

  const handleLangChange = (val) => {
    setLanguage(val);
    onAnswer({ code, language: val });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* question header */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-medium bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 px-2 py-0.5 rounded-full">
            Coding
          </span>
          <span className="text-xs text-muted-foreground">
            {question.marks} mark{question.marks !== 1 ? "s" : ""}
          </span>
          <span
            className={cn(
              "text-xs px-2 py-0.5 rounded-full",
              question.difficulty === "easy"
                ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                : question.difficulty === "medium"
                  ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300"
                  : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
            )}
          >
            {question.difficulty}
          </span>
        </div>
        <h2 className="text-base font-medium leading-relaxed text-foreground whitespace-pre-wrap">
          {question.title}
        </h2>
        {question.description && (
          <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
            {question.description}
          </p>
        )}
      </div>

      {/* visible test cases */}
      {question.testCases?.length > 0 && (
        <div className="rounded-lg border bg-muted/30 p-3 text-xs font-mono space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Sample Test Cases
          </p>
          {question.testCases.map((tc, i) => (
            <div key={i} className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-muted-foreground">Input:</span>
                <pre className="mt-0.5 bg-background rounded p-1.5 text-foreground whitespace-pre-wrap break-all">
                  {tc.input || "(none)"}
                </pre>
              </div>
              <div>
                <span className="text-muted-foreground">Expected Output:</span>
                <pre className="mt-0.5 bg-background rounded p-1.5 text-foreground whitespace-pre-wrap break-all">
                  {tc.expectedOutput}
                </pre>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* language selector */}
      <div className="flex items-center gap-3">
        <Select value={language} onValueChange={handleLangChange}>
          <SelectTrigger className="w-40 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {allowedLangs.map((l) => (
              <SelectItem key={l.value} value={l.value} className="text-xs">
                {l.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs gap-1.5"
          onClick={() => runMutation.mutate()}
          disabled={runMutation.isPending || !code.trim()}
        >
          {runMutation.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Play className="w-3.5 h-3.5" />
          )}
          Run Code
        </Button>
      </div>

      {/* Monaco editor */}
      <div className="rounded-lg overflow-hidden border">
        <Editor
          height="300px"
          language={MONACO_LANG[language] || "plaintext"}
          value={code}
          onChange={handleCodeChange}
          theme="vs-dark"
          options={{
            fontSize: 13,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: "on",
            tabSize: 2,
            automaticLayout: true,
            lineNumbers: "on",
            renderLineHighlight: "line",
            padding: { top: 12, bottom: 12 },
          }}
        />
      </div>

      {/* custom input toggle */}
      <div>
        <button
          onClick={() => setShowInput((p) => !p)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {showInput ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
          Custom Input
        </button>
        {showInput && (
          <textarea
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder="Enter custom input..."
            rows={3}
            className="mt-2 w-full font-mono text-xs rounded-lg border bg-muted/30 p-2 resize-none focus:outline-none focus:ring-1 focus:ring-ring"
          />
        )}
      </div>

      {/* run result */}
      {runResult && (
        <div
          className={cn(
            "rounded-lg border p-3 text-xs font-mono",
            runResult.status === "Accepted" || runResult.stderr === ""
              ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30"
              : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30",
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className={cn(
                "font-semibold text-xs",
                runResult.stderr
                  ? "text-red-600 dark:text-red-400"
                  : "text-emerald-600 dark:text-emerald-400",
              )}
            >
              {runResult.status}
            </span>
            <span className="text-muted-foreground text-[11px]">
              {runResult.time}ms · {runResult.memory}KB
            </span>
          </div>
          {runResult.stdout && (
            <div>
              <p className="text-muted-foreground mb-1">Output:</p>
              <pre className="whitespace-pre-wrap break-all">
                {runResult.stdout}
              </pre>
            </div>
          )}
          {runResult.stderr && (
            <div className="mt-2">
              <p className="text-red-500 mb-1">Error:</p>
              <pre className="whitespace-pre-wrap break-all text-red-600 dark:text-red-400">
                {runResult.stderr}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
