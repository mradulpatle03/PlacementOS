import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { applyToDrive } from '../../api/application.api';
import api from '../../lib/axios';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';
import { FileText, Star, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const ApplyModal = ({ open, onClose, drive }) => {
  const [selectedResumeId, setSelectedResumeId] = useState(null);
  const queryClient = useQueryClient();

  // fetch student's resumes
  const { data: resumeData, isLoading: resumesLoading } = useQuery({
    queryKey: ['my-resumes'],
    queryFn: async () => {
      const { data } = await api.get('/resumes');
      return data.data;
    },
    enabled: open,
  });

  const resumes = resumeData?.resumes || [];

  // auto-select primary resume when modal opens
  const primaryResume = resumes.find((r) => r.isPrimary);
  const effectiveSelection = selectedResumeId || primaryResume?._id || null;

  // apply mutation
  const { mutate: apply, isPending } = useMutation({
    mutationFn: () => applyToDrive(drive._id, effectiveSelection),
    onSuccess: () => {
      toast.success('Application submitted successfully!');
      queryClient.invalidateQueries({ queryKey: ['my-applications'] });
      queryClient.invalidateQueries({ queryKey: ['eligibility', drive._id] });
      onClose();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to apply');
    },
  });

  const handleApply = () => {
    if (!effectiveSelection) {
      toast.error('Please select a resume to apply');
      return;
    }
    apply();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Apply to {drive?.title}</DialogTitle>
          <DialogDescription>
            Select the resume you want to submit with this application.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* drive quick info */}
          <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm space-y-1">
            <p className="font-medium">{drive?.title}</p>
            {drive?.roles?.length > 0 && (
              <p className="text-muted-foreground">
                {drive.roles.map((r) => r.title).join(', ')}
                {drive.roles[0]?.ctc
                  ? ` · ₹${drive.roles[0].ctc} LPA`
                  : ''}
              </p>
            )}
          </div>

          {/* resume picker */}
          <div>
            <p className="mb-3 text-sm font-medium">Choose a resume</p>

            {resumesLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading resumes…
              </div>
            ) : resumes.length === 0 ? (
              <div className="rounded-md border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                No resumes uploaded yet.{' '}
                <a href="/student/resumes" className="text-primary underline">
                  Upload one first.
                </a>
              </div>
            ) : (
              <RadioGroup
                value={effectiveSelection}
                onValueChange={setSelectedResumeId}
                className="space-y-2"
              >
                {resumes.map((resume) => (
                  <div
                    key={resume._id}
                    className={`flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-colors ${
                      effectiveSelection === resume._id
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedResumeId(resume._id)}
                  >
                    <RadioGroupItem value={resume._id} id={resume._id} />
                    <Label
                      htmlFor={resume._id}
                      className="flex flex-1 items-center gap-2 cursor-pointer"
                    >
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="flex-1 font-medium text-sm">
                        {resume.label}
                      </span>
                      {resume.isPrimary && (
                        <Badge
                          variant="secondary"
                          className="gap-1 text-xs"
                        >
                          <Star className="h-3 w-3" />
                          Primary
                        </Badge>
                      )}
                      {resume.scoreDetails?.total !== undefined && (
                        <span className="text-xs text-muted-foreground">
                          Score: {resume.scoreDetails.total}/100
                        </span>
                      )}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}
          </div>

          {/* actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button
              onClick={handleApply}
              disabled={isPending || !effectiveSelection || resumes.length === 0}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting…
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Submit Application
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ApplyModal;