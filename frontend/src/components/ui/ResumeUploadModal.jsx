import { useState, useRef } from 'react';
import { Loader2, UploadCloud, FileText } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export default function ResumeUploadModal({ open, onClose, onUpload, loading }) {
  const [file, setFile] = useState(null);
  const [label, setLabel] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef();

  const handleFile = (f) => {
    if (!f) return;
    if (f.type !== 'application/pdf') {
      alert('Only PDF files are allowed');
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      alert('File size must be under 5MB');
      return;
    }
    setFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleSubmit = () => {
    if (!file) return;
    const formData = new FormData();
    formData.append('resume', file);
    formData.append('label', label || 'Resume');
    formData.append('isPrimary', isPrimary);
    onUpload(formData);
  };

  const handleClose = () => {
    setFile(null);
    setLabel('');
    setIsPrimary(false);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Upload Resume" description="PDF only · Max 5MB · Max 5 resumes">
      <div className="space-y-4 mt-2">
        {/* drop zone */}
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={cn(
            'border-2 border-dashed rounded-md p-8 text-center cursor-pointer transition-colors',
            dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/30 hover:border-primary/50'
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => handleFile(e.target.files[0])}
          />
          {file ? (
            <div className="flex flex-col items-center gap-2 text-green-600">
              <FileText className="h-10 w-10" />
              <p className="text-sm font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <UploadCloud className="h-10 w-10" />
              <p className="text-sm">Drag & drop or click to select PDF</p>
            </div>
          )}
        </div>

        <div className="space-y-1">
          <Label>Label (optional)</Label>
          <Input
            placeholder="e.g. General Resume, SDE Focus"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>

        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={isPrimary}
            onChange={(e) => setIsPrimary(e.target.checked)}
            className="rounded"
          />
          Set as primary resume
        </label>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!file || loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Upload
          </Button>
        </div>
      </div>
    </Modal>
  );
}