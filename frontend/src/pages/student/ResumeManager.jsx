import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Star, Trash2, Eye, BarChart2, Upload, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import PageHeader from '@/components/ui/PageHeader';
import ScoreBadge from '@/components/ui/ScoreBadge';
import PDFPreviewModal from '@/components/ui/PDFPreviewModal';
import ResumeScoreModal from '@/components/ui/ResumeScoreModal';
import ResumeUploadModal from '@/components/ui/ResumeUploadModal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import { resumeAPI } from '@/api/resume.api';
import { showSuccess, showError } from '@/lib/toast';
import { cn } from '@/lib/utils';

const MAX_RESUMES = 5;

export default function ResumeManager() {
  const queryClient = useQueryClient();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [preview, setPreview] = useState({ open: false, id: null, label: '' });
  const [scoreModal, setScoreModal] = useState({ open: false, id: null, label: '' });
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null });
  const [editingLabel, setEditingLabel] = useState({ id: null, value: '' });

  // fetch
  const { data: resumes = [], isLoading } = useQuery({
    queryKey: ['myResumes'],
    queryFn: async () => {
      const res = await resumeAPI.getMyResumes();
      return res.data.resumes;
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['myResumes'] });

  // upload
  const uploadMutation = useMutation({
    mutationFn: resumeAPI.upload,
    onSuccess: () => {
      invalidate();
      showSuccess('Resume uploaded successfully');
      setUploadOpen(false);
    },
    onError: (err) => showError(err.response?.data?.message || 'Upload failed'),
  });

  // delete
  const deleteMutation = useMutation({
    mutationFn: resumeAPI.deleteResume,
    onSuccess: () => {
      invalidate();
      showSuccess('Resume deleted');
      setDeleteConfirm({ open: false, id: null });
    },
    onError: (err) => showError(err.response?.data?.message || 'Delete failed'),
  });

  // set primary
  const primaryMutation = useMutation({
    mutationFn: resumeAPI.setPrimary,
    onSuccess: () => { invalidate(); showSuccess('Primary resume updated'); },
    onError: (err) => showError(err.response?.data?.message || 'Failed'),
  });

  // update label
  const labelMutation = useMutation({
    mutationFn: ({ id, label }) => resumeAPI.updateLabel(id, label),
    onSuccess: () => {
      invalidate();
      setEditingLabel({ id: null, value: '' });
    },
    onError: (err) => showError(err.response?.data?.message || 'Failed'),
  });

  const saveLabel = (id) => {
    if (!editingLabel.value.trim()) return;
    labelMutation.mutate({ id, label: editingLabel.value.trim() });
  };

  if (isLoading) return <Spinner className="mt-20" />;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="Resume Manager"
        subtitle={`${resumes.length}/${MAX_RESUMES} resumes uploaded`}
        actions={
          <Button
            onClick={() => setUploadOpen(true)}
            disabled={resumes.length >= MAX_RESUMES}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Resume
          </Button>
        }
      />

      {resumes.length === 0 && (
        <EmptyState
          icon={FileText}
          title="No resumes yet"
          description="Upload your first resume to apply for placement drives"
          action={
            <Button onClick={() => setUploadOpen(true)}>
              <Upload className="h-4 w-4 mr-2" /> Upload Resume
            </Button>
          }
        />
      )}

      <div className="space-y-3">
        {resumes.map((resume) => (
          <Card key={resume._id} className={cn(resume.isPrimary && 'border-primary')}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start justify-between gap-3">

                {/* left — icon + info */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    {/* label — editable */}
                    {editingLabel.id === resume._id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editingLabel.value}
                          onChange={(e) => setEditingLabel((s) => ({ ...s, value: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveLabel(resume._id);
                            if (e.key === 'Escape') setEditingLabel({ id: null, value: '' });
                          }}
                          className="h-7 text-sm"
                          autoFocus
                        />
                        <Button size="sm" onClick={() => saveLabel(resume._id)} disabled={labelMutation.isPending}>
                          Save
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingLabel({ id: null, value: '' })}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{resume.label}</p>
                        {resume.isPrimary && (
                          <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium shrink-0">
                            Primary
                          </span>
                        )}
                        <button
                          onClick={() => setEditingLabel({ id: resume._id, value: resume.label })}
                          className="text-muted-foreground hover:text-foreground shrink-0"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-2 flex-wrap">
                      <ScoreBadge score={resume.score} grade={resume.grade} />
                      <span className="text-xs text-muted-foreground">
                        {resume.fileSize ? `${(resume.fileSize / 1024).toFixed(1)} KB` : ''}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(resume.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* right — actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Preview"
                    onClick={() => setPreview({ open: true, id: resume._id, label: resume.label })}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="View Score"
                    onClick={() => setScoreModal({ open: true, id: resume._id, label: resume.label })}
                  >
                    <BarChart2 className="h-4 w-4" />
                  </Button>
                  {!resume.isPrimary && (
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Set as Primary"
                      onClick={() => primaryMutation.mutate(resume._id)}
                      disabled={primaryMutation.isPending}
                    >
                      <Star className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Delete"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleteConfirm({ open: true, id: resume._id })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modals */}
      <ResumeUploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUpload={(formData) => uploadMutation.mutate(formData)}
        loading={uploadMutation.isPending}
      />

      <PDFPreviewModal
        open={preview.open}
        onClose={() => setPreview({ open: false, id: null, label: '' })}
        previewUrl={preview.id ? resumeAPI.getPreviewUrl(preview.id) : null}
        title={preview.label}
      />

      <ResumeScoreModal
        open={scoreModal.open}
        onClose={() => setScoreModal({ open: false, id: null, label: '' })}
        resumeId={scoreModal.id}
        resumeLabel={scoreModal.label}
      />

      <ConfirmDialog
        open={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, id: null })}
        onConfirm={() => deleteMutation.mutate(deleteConfirm.id)}
        loading={deleteMutation.isPending}
        title="Delete Resume"
        description="This will permanently delete the resume from storage. This cannot be undone."
        confirmLabel="Delete"
      />
    </div>
  );
}