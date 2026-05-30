import { useQuery } from '@tanstack/react-query';
import { Loader2, CheckCircle2, XCircle, Lightbulb } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { resumeAPI } from '@/api/resume.api';
import { cn } from '@/lib/utils';

function ScoreBar({ label, score, max }) {
  const pct = Math.round((score / max) * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{score}/{max}</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full',
            pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500'
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function ResumeScoreModal({ open, onClose, resumeId, resumeLabel }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['resumeScore', resumeId],
    queryFn: async () => {
      const res = await resumeAPI.getScore(resumeId);
      return res.data;
    },
    enabled: open && !!resumeId,
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Resume Score"
      description={resumeLabel}
    >
      <div className="mt-2 space-y-5">
        {isLoading && (
          <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Analyzing resume...
          </div>
        )}

        {isError && (
          <p className="text-center text-destructive py-6">
            Failed to load score. Try again.
          </p>
        )}

        {data && (
          <>
            {/* overall score */}
            <div className="text-center py-4 border rounded-md bg-muted/20">
              <p className="text-5xl font-bold">{data.score}</p>
              <p className="text-muted-foreground text-sm mt-1">out of 100</p>
              <span className={cn(
                'inline-block mt-2 text-sm font-semibold px-3 py-1 rounded-full',
                data.grade === 'A' ? 'bg-green-100 text-green-700' :
                data.grade === 'B' ? 'bg-blue-100 text-blue-700' :
                data.grade === 'C' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              )}>
                Grade {data.grade}
              </span>
            </div>

            {/* breakdown bars */}
            {data.breakdown && (
              <div className="space-y-3">
                <p className="text-sm font-medium">Breakdown</p>
                <ScoreBar label="Sections"  score={data.breakdown.sections?.score  || 0} max={40} />
                <ScoreBar label="Length"    score={data.breakdown.length?.score    || 0} max={20} />
                <ScoreBar label="Keywords"  score={data.breakdown.keywords?.score  || 0} max={30} />
                <ScoreBar label="Contact"   score={data.breakdown.contact?.score   || 0} max={10} />
              </div>
            )}

            {/* keywords found */}
            {data.breakdown?.keywords?.found?.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Keywords Found</p>
                <div className="flex flex-wrap gap-1">
                  {data.breakdown.keywords.found.map((kw) => (
                    <span key={kw} className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* suggestions */}
            {data.suggestions?.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium flex items-center gap-1">
                  <Lightbulb className="h-4 w-4 text-yellow-500" />
                  Suggestions
                </p>
                <ul className="space-y-1">
                  {data.suggestions.map((s, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                      <XCircle className="h-3.5 w-3.5 text-red-400 mt-0.5 shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {data.suggestions?.length === 0 && (
              <div className="flex items-center gap-2 text-green-600 text-sm">
                <CheckCircle2 className="h-4 w-4" />
                Great resume! No major suggestions.
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}