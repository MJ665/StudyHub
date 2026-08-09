'use client';
import { Download, X } from 'lucide-react';

export default function KTPdfPreviewModal({ attachment, onClose }: { attachment: any, onClose: () => void }) {
  if (!attachment || attachment.file_type !== 'application/pdf') return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--color-surface-dim)]/90 backdrop-blur-sm p-8">
      <div className="w-full max-w-5xl h-[85vh] bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] rounded-[2.5rem] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-outline-variant)]">
          <h3 className="font-bold text-[var(--color-on-surface)]">{attachment.filename}</h3>
          <div className="flex gap-2">
            <a href={attachment.download_url} download target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)]">
              <Download size={16} /> Download
            </a>
            <button onClick={onClose} className="text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] p-2">
              <X size={16} />
            </button>
          </div>
        </div>
        <iframe
          src={attachment.download_url}
          className="flex-1 w-full bg-[var(--color-surface-container-high)]"
          title={attachment.filename}
        />
      </div>
    </div>
  );
}