'use client';

import React, { useState } from 'react';
import { Flag, Loader2, X } from 'lucide-react';
import { useToast } from '../ui/Toast';

type ReportKind = 'kt_document' | 'coding_question';

interface ReportButtonProps {
  kind: ReportKind;
  targetId: string | number;
  /** Optional label override for the trigger button. */
  label?: string;
  className?: string;
}

const ISSUE_TYPES = [
  { value: 'inaccurate', label: 'Inaccurate / wrong' },
  { value: 'outdated', label: 'Outdated' },
  { value: 'unclear', label: 'Unclear / incomplete' },
  { value: 'inappropriate', label: 'Inappropriate' },
  { value: 'other', label: 'Other' },
];

/**
 * A small, self-contained "Report" trigger + modal that files a moderation
 * report for a KT document or coding question. Surfaces in the L&D unified
 * moderation view.
 */
export default function ReportButton({ kind, targetId, label = 'Report', className = '' }: ReportButtonProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [issueType, setIssueType] = useState('inaccurate');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try {
      const ApiService = (await import('../../services/ApiService')).default;
      if (kind === 'kt_document') {
        await ApiService.reportKTDocument(String(targetId), issueType, description);
      } else {
        await ApiService.reportCodingQuestion(Number(targetId), issueType, description);
      }
      toast('success', 'Report submitted. Thank you — an admin will review it.');
      setOpen(false);
      setDescription('');
    } catch (err: any) {
      toast('error', err?.message || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className || 'inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-rose-400 transition-colors'}
      >
        <Flag size={14} /> {label}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => !submitting && setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-rose-400">
                <Flag size={16} />
                <span className="font-black uppercase tracking-widest text-[10px]">Report Content</span>
              </div>
              <button onClick={() => !submitting && setOpen(false)} className="text-slate-500 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Issue type</label>
            <select
              value={issueType}
              onChange={(e) => setIssueType(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-sm text-white mb-4 outline-none focus:ring-1 focus:ring-rose-500/50"
            >
              {ISSUE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>

            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="What's wrong with this content?"
              className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-sm text-white mb-5 outline-none focus:ring-1 focus:ring-rose-500/50 resize-none"
            />

            <div className="flex justify-end gap-2">
              <button disabled={submitting} onClick={() => setOpen(false)} className="px-4 py-2 text-slate-400 hover:text-white text-xs font-bold">Cancel</button>
              <button
                disabled={submitting || !description.trim()}
                onClick={submit}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold disabled:opacity-50 inline-flex items-center gap-2"
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <Flag size={14} />} Submit report
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
