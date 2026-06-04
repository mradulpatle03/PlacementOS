import { cn } from '@/lib/utils';

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E'];

export default function MCQQuestion({ question, answer, onAnswer }) {
  const selected = answer?.selectedOptionIndex ?? null;

  return (
    <div className="flex flex-col gap-4">
      {/* question text */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 px-2 py-0.5 rounded-full">
            MCQ
          </span>
          <span className="text-xs text-muted-foreground">
            {question.marks} mark{question.marks !== 1 ? 's' : ''}
          </span>
          <span className={cn(
            'text-xs px-2 py-0.5 rounded-full',
            question.difficulty === 'easy'   ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'  :
            question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' :
                                               'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
          )}>
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

      {/* options */}
      <div className="flex flex-col gap-2">
        {question.options.map((opt, idx) => (
          <button
            key={idx}
            onClick={() => onAnswer({ selectedOptionIndex: idx })}
            className={cn(
              'flex items-start gap-3 w-full text-left px-4 py-3 rounded-xl border-2 transition-all text-sm',
              selected === idx
                ? 'border-primary bg-primary/5 text-foreground font-medium'
                : 'border-border hover:border-primary/40 hover:bg-muted/50 text-foreground'
            )}
          >
            {/* option label (A, B, C…) */}
            <span className={cn(
              'flex-none w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5',
              selected === idx
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            )}>
              {OPTION_LABELS[idx] || idx + 1}
            </span>
            <span className="whitespace-pre-wrap">{opt.text}</span>
          </button>
        ))}
      </div>

      {/* clear selection */}
      {selected !== null && (
        <button
          onClick={() => onAnswer({ selectedOptionIndex: null })}
          className="self-start text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
        >
          Clear selection
        </button>
      )}
    </div>
  );
}