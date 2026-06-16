import { useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Send,
  BookOpen,
} from "lucide-react";

import { assessmentAPI, submissionAPI } from "@/api/assessment.api";
import { useAntiCheat } from "@/hooks/useAntiCheat";
import TimerBar from "@/components/assessment/TimerBar";
import QuestionNav from "@/components/assessment/QuestionNav";
import MCQQuestion from "@/components/assessment/MCQQuestion";
import CodingQuestion from "@/components/assessment/CodingQuestion";
import FullscreenPrompt from "@/components/assessment/FullscreenPrompt";
import ViolationBanner from "@/components/assessment/ViolationBanner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ErrorBoundary } from "react-error-boundary";

export default function AssessmentTaker() {
  return (
    <ErrorBoundary
      fallback={
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
          <p className="font-semibold">The assessment editor crashed.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Your progress up to the last save is safe. Please refresh to
            continue.
          </p>
        </div>
      }
    >
      <AssessmentTakerInner />
    </ErrorBoundary>
  );
}

function AssessmentTakerInner() {
  const { assessmentId } = useParams();
  const navigate = useNavigate();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [hasBegun, setHasBegun] = useState(false); // fullscreen gate
  const [violationCount, setViolationCount] = useState(0);

  const submissionIdRef = useRef(null);

  // 1. Start assessment
  const {
    data: startData,
    isLoading: starting,
    isError: startError,
    error: startErr,
  } = useQuery({
    queryKey: ["assessment-start", assessmentId],
    queryFn: () =>
      assessmentAPI.start(assessmentId).then((r) => {
        submissionIdRef.current = r.data.data.submission._id;
        return r.data.data;
      }),
    retry: false,
    staleTime: Infinity,
  });

  const assessment = startData?.assessment;
  const questions = assessment?.questions || [];
  const totalSeconds = (assessment?.durationMinutes || 1) * 60;

  // 2. Anti-cheat hook
  const handleAutoSubmitFromCheat = useCallback(() => {
    toast.error(" Auto-submitting due to repeated violations.", {
      duration: 5000,
    });
    handleSubmit(true);
  }, []);

  useAntiCheat({
    submissionId: submissionIdRef.current,
    enabled: hasBegun && !submitted && !submitting,
    settings: assessment?.settings,
    onAutoSubmit: handleAutoSubmitFromCheat,
    onViolation: (count) => setViolationCount(count),
  });

  // 3. Answer update
  const handleAnswer = useCallback((questionId, questionType, answerData) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { questionType, ...answerData },
    }));
  }, []);

  // 4. Submit mutation
  const submitMutation = useMutation({
    mutationFn: ({ autoSubmitted }) => {
      const submissionId = submissionIdRef.current;
      if (!submissionId) throw new Error("No active submission");

      const answersArray = questions.map((q) => {
        const a = answers[q._id] || {};
        return {
          questionId: q._id,
          questionType: q.type,
          selectedOptionIndex: a.selectedOptionIndex ?? null,
          code: a.code || "",
          language: a.language || "",
        };
      });

      return submissionAPI.submit(submissionId, {
        answers: answersArray,
        autoSubmitted,
      });
    },
    onSuccess: () => {
      // exit fullscreen cleanly
      if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {});
      }
      setSubmitted(true);
      setShowConfirm(false);
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.message || "Submission failed. Try again.",
      );
      setSubmitting(false);
    },
  });

  const handleSubmit = useCallback(
    (autoSubmitted = false) => {
      setSubmitting(true);
      submitMutation.mutate({ autoSubmitted });
    },
    [answers, questions],
  );

  // 5. Timer expiry
  const handleTimerExpire = useCallback(() => {
    toast.warning(" Time is up! Auto-submitting your assessment…");
    handleSubmit(true);
  }, [handleSubmit]);

  // Loading
  if (starting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-sm">Loading assessment…</p>
        </div>
      </div>
    );
  }

  // Error
  if (startError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-destructive mx-auto" />
          <h2 className="text-lg font-semibold">Cannot Start Assessment</h2>
          <p className="text-sm text-muted-foreground">
            {startErr?.response?.data?.message || "Something went wrong."}
          </p>
          <Button variant="outline" onClick={() => navigate(-1)}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  // Fullscreen gate
  if (!hasBegun) {
    return (
      <FullscreenPrompt
        assessment={assessment}
        onBegin={() => setHasBegun(true)}
      />
    );
  }

  // Submitted screen
  if (submitted) {
    const answeredCount = Object.keys(answers).length;
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mx-auto">
            <Send className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-xl font-semibold">Assessment Submitted!</h2>
          <p className="text-sm text-muted-foreground">
            You answered <strong>{answeredCount}</strong> of{" "}
            <strong>{questions.length}</strong> questions. Results will be
            shared by the recruiter after grading.
          </p>
          <Button onClick={() => navigate("/applications")}>
            Back to My Applications
          </Button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const maxViolations = assessment?.settings?.maxTabSwitches ?? 3;

  return (
    <div className="min-h-screen bg-background flex flex-col select-none">
      {/* violation banner */}
      <ViolationBanner count={violationCount} max={maxViolations} />

      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur px-4 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <BookOpen className="w-4 h-4 text-primary shrink-0" />
          <h1 className="text-sm font-semibold truncate">
            {assessment?.title}
          </h1>
        </div>

        <div className="flex-1 max-w-xs">
          <TimerBar
            totalSeconds={totalSeconds}
            onExpire={handleTimerExpire}
            paused={submitting}
          />
        </div>

        <Button
          size="sm"
          className="shrink-0"
          onClick={() => setShowConfirm(true)}
          disabled={submitting}
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit"}
        </Button>
      </header>

      {/* Body */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Question navigator */}
        <aside className="w-52 shrink-0 border-r bg-card overflow-y-auto p-3 hidden md:block">
          <QuestionNav
            questions={questions}
            answers={answers}
            currentIndex={currentIndex}
            onSelect={setCurrentIndex}
          />
          <div className="mt-4 px-1 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{answeredCount}</span>
            /{questions.length} answered
          </div>
        </aside>

        {/* Question area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {currentQuestion ? (
            <div className="max-w-3xl mx-auto">
              <p className="text-xs font-medium text-muted-foreground mb-4">
                Question {currentIndex + 1} of {questions.length}
              </p>

              {currentQuestion.type === "mcq" ? (
                <MCQQuestion
                  key={currentQuestion._id}
                  question={currentQuestion}
                  answer={answers[currentQuestion._id]}
                  onAnswer={(data) =>
                    handleAnswer(currentQuestion._id, "mcq", data)
                  }
                />
              ) : (
                <CodingQuestion
                  key={currentQuestion._id}
                  question={currentQuestion}
                  answer={answers[currentQuestion._id]}
                  onAnswer={(data) =>
                    handleAnswer(currentQuestion._id, "coding", data)
                  }
                />
              )}

              {/* prev / next */}
              <div className="flex items-center justify-between mt-8 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                  disabled={currentIndex === 0}
                  className="gap-1.5"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>

                {currentIndex < questions.length - 1 ? (
                  <Button
                    size="sm"
                    onClick={() =>
                      setCurrentIndex((i) =>
                        Math.min(questions.length - 1, i + 1),
                      )
                    }
                    className="gap-1.5"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => setShowConfirm(true)}
                    disabled={submitting}
                    className="gap-1.5"
                  >
                    <Send className="w-4 h-4" />
                    Submit Assessment
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              No questions found.
            </div>
          )}
        </main>
      </div>

      {/* Submit confirm dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Submit Assessment?</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-2 text-sm text-muted-foreground">
            <p>
              You have answered{" "}
              <span className="font-medium text-foreground">
                {answeredCount}
              </span>{" "}
              of{" "}
              <span className="font-medium text-foreground">
                {questions.length}
              </span>{" "}
              questions.
            </p>
            {answeredCount < questions.length && (
              <p className="text-amber-600 dark:text-amber-400">
                ⚠ {questions.length - answeredCount} question(s) are unanswered.
              </p>
            )}
            <p>Once submitted you cannot make changes.</p>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowConfirm(false)}
              disabled={submitMutation.isPending}
            >
              Continue Answering
            </Button>
            <Button
              onClick={() => handleSubmit(false)}
              disabled={submitMutation.isPending}
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Submitting…
                </>
              ) : (
                "Yes, Submit"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
