import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, Loader2, ExternalLink } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// required worker setup for react-pdf v7+
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function PDFPreviewModal({ open, onClose, previewUrl, title }) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const handleLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setPageNumber(1);
    setLoading(false);
    setError(false);
  };

  const handleLoadError = () => {
    setLoading(false);
    setError(true);
  };

  const handleClose = () => {
    setPageNumber(1);
    setNumPages(null);
    setLoading(true);
    setError(false);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={title || 'Resume Preview'}
      className="max-w-2xl w-full"
    >
      <div className="mt-2 space-y-3">
        {/* open in new tab */}
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" asChild>
            <a href={previewUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4 mr-1" />
              Open in new tab
            </a>
          </Button>
        </div>

        <div className="border rounded-md overflow-auto flex justify-center bg-muted/30 min-h-125 items-center">
          {loading && !error && (
            <div className="absolute flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading PDF...
            </div>
          )}
          {error && (
            <div className="text-center text-muted-foreground py-10">
              <p>Could not load PDF preview.</p>
              <Button variant="link" asChild className="mt-2">
                <a href={previewUrl} target="_blank" rel="noreferrer">
                  Open directly instead
                </a>
              </Button>
            </div>
          )}
          {!error && (
            <Document
              file={previewUrl}
              onLoadSuccess={handleLoadSuccess}
              onLoadError={handleLoadError}
              loading=""
            >
              <Page
                pageNumber={pageNumber}
                width={560}
                renderTextLayer={true}
                renderAnnotationLayer={true}
              />
            </Document>
          )}
        </div>

        {/* page controls */}
        {numPages && numPages > 1 && (
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
              disabled={pageNumber <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {pageNumber} of {numPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
              disabled={pageNumber >= numPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}