import { cn } from '@/lib/utils';
import { CheckCircle2, Code2, ListChecks } from 'lucide-react';

export default function QuestionNav({ questions, answers, currentIndex, onSelect }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
        Questions
      </p>
      {questions.map((q, idx) => {
        const isAnswered = _isAnswered(answers[q._id]);
        const isCurrent  = idx === currentIndex;

        return (
          <button
            key={q._id}
            onClick={() => onSelect(idx)}
            className={cn(
              'flex items-center gap-2.5 w-full text-left px-3 py-2 rounded-lg text-sm transition-colors',
              isCurrent
                ? 'bg-primary text-primary-foreground font-medium'
                : isAnswered
                  ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'hover:bg-muted text-muted-foreground'
            )}
          >
            {/* type icon */}
            {q.type === 'coding'
              ? <Code2 className="w-3.5 h-3.5 shrink-0" />
              : <ListChecks className="w-3.5 h-3.5 shrink-0" />}

            <span className="flex-1">Q{idx + 1}</span>

            {/* answered indicator */}
            {isAnswered && !isCurrent && (
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
            )}

            {/* marks badge */}
            <span className={cn(
              'text-xs px-1.5 py-0.5 rounded font-medium',
              isCurrent ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
            )}>
              {q.marks}m
            </span>
          </button>
        );
      })}
    </div>
  );
}

function _isAnswered(answer) {
  if (!answer) return false;
  if (answer.questionType === 'mcq') return answer.selectedOptionIndex !== null && answer.selectedOptionIndex !== undefined;
  if (answer.questionType === 'coding') return answer.code && answer.code.trim().length > 0;
  return false;
}