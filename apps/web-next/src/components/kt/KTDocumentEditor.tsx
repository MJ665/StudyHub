'use client';

import React, { useState } from 'react';
import { Edit3, Eye, Save, Loader2, Send } from 'lucide-react';
import Editor from '@monaco-editor/react';
import ApiService from '@/services/ApiService';
import { toast } from 'react-hot-toast';
import EnterpriseMarkdownPreview from './EnterpriseMarkdownPreview';

export default function KTDocumentEditor({ doc, onSave, onCancel }: { doc: any, onSave: (d: any) => void, onCancel: () => void }) {
  const [formData, setFormData] = useState({
    title: doc.title,
    body_markdown: doc.body_markdown,
    problem_statement: doc.problem_statement || '',
    outcome: doc.outcome || '',
    conclusion: doc.conclusion || '',
    lessons_learned: doc.lessons_learned || [],
    open_questions: doc.open_questions || [],
    tags: doc.tags || [],
    sprint: doc.sprint || '',
    milestone: doc.milestone || '',
    change_summary: '',
  });
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const status = (doc.status || 'DRAFT').toString().toUpperCase();
  const canSubmit = status === 'DRAFT' || status === 'REJECTED';

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await ApiService.request(`/kt/documents/${doc.id}`, {
        method: 'PATCH',
        body: JSON.stringify(formData)
      });
      toast.success('Document saved successfully');
      onSave(updated);
    } catch (err: any) {
      toast.error(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleFinalize = async () => {
    setSubmitting(true);
    try {
      // Persist the latest edits first, then submit for mentor review. The
      // backend assigns the doc's mentor (or falls back to any mentor in scope)
      // so it lands in a review inbox.
      await ApiService.request(`/kt/documents/${doc.id}`, {
        method: 'PATCH',
        body: JSON.stringify(formData)
      });
      const updated = await ApiService.submitKTDocument(doc.id, doc.mentor_id ? { mentor_id: doc.mentor_id } : {});
      toast.success('Submitted for review — a mentor has been notified.');
      onSave(updated || { ...doc, status: 'SUBMITTED' });
    } catch (err: any) {
      toast.error(err.message || 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Edit header bar */}
      <div className="flex items-center justify-between p-4 bg-[var(--color-warning)]/20 border border-[var(--color-warning)]/30 rounded-2xl">
        <div className="flex items-center gap-3">
          <Edit3 size={16} className="text-[var(--color-warning)]" />
          <span className="text-[var(--color-warning)] font-bold text-sm">Editing Mode</span>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Change summary (e.g. Fixed deployment steps)..."
            className="bg-[var(--color-surface-dim)] border border-[var(--color-outline-variant)] rounded-xl px-4 py-2 text-sm text-[var(--color-on-surface)] w-72 focus:outline-none focus:ring-2 focus:ring-[var(--color-warning)]/50"
            value={formData.change_summary}
            onChange={e => setFormData({...formData, change_summary: e.target.value})}
          />
          <button onClick={() => setPreviewMode(!previewMode)} className="text-[var(--color-on-surface-variant)] flex items-center gap-2 hover:text-[var(--color-on-surface)] px-3">
            {previewMode ? <Edit3 size={14} /> : <Eye size={14} />}
            {previewMode ? 'Edit' : 'Preview'}
          </button>
          <button onClick={onCancel} className="text-[var(--color-on-surface-variant)] px-3">Cancel</button>
          <button onClick={handleSave} disabled={saving || submitting} className="bg-[var(--color-brand-primary-container)] px-4 py-2 rounded-xl text-white flex items-center gap-2">
            {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
            Save Changes
          </button>
          {canSubmit && (
            <button onClick={handleFinalize} disabled={saving || submitting} className="bg-[var(--color-success)] hover:bg-[var(--color-success)] px-4 py-2 rounded-xl text-[var(--color-on-surface)] flex items-center gap-2 font-bold">
              {submitting ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
              Finalize &amp; Submit for review
            </button>
          )}
        </div>
      </div>
      
      {/* Title edit */}
      <input
        type="text"
        value={formData.title}
        onChange={e => setFormData({...formData, title: e.target.value})}
        className="text-3xl font-black bg-transparent border-b border-[var(--color-outline-variant)] pb-2 text-[var(--color-on-surface)] focus:outline-none focus:border-[var(--color-brand-primary)] w-full"
      />
      
      {/* Monaco Editor for body + live markdown preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[600px]">
        <div className={previewMode ? 'hidden lg:block' : 'block col-span-2'}>
          <Editor
            height="600px"
            defaultLanguage="markdown"
            theme="vs-dark"
            value={formData.body_markdown}
            onChange={val => setFormData({...formData, body_markdown: val || ''})}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              fontFamily: 'JetBrains Mono, monospace',
              wordWrap: 'on',
              lineNumbers: 'on',
              padding: { top: 20 },
            }}
          />
        </div>
        {previewMode && (
          <div className="block col-span-1 max-h-[600px] overflow-y-auto custom-scrollbar bg-[var(--color-surface-dim)] border border-[var(--color-outline-variant)] rounded-2xl p-6">
            {formData.body_markdown?.trim()
              ? <EnterpriseMarkdownPreview content={formData.body_markdown} showToc={false} />
              : <p className="text-[var(--color-on-surface-variant)] text-sm italic">Nothing to preview yet — start writing in the editor.</p>}
          </div>
        )}
      </div>
      
      {/* Structured fields edit */}
      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="text-xs font-black uppercase tracking-wider text-[var(--color-on-surface-variant)] mb-2 block">Problem Statement</label>
          <textarea
            value={formData.problem_statement}
            onChange={e => setFormData({...formData, problem_statement: e.target.value})}
            rows={4}
            className="w-full bg-[var(--color-surface-dim)] border border-[var(--color-outline-variant)] rounded-xl p-4 text-[var(--color-on-surface)] text-sm flex-1"
          />
        </div>
        <div>
          <label className="text-xs font-black uppercase tracking-wider text-[var(--color-on-surface-variant)] mb-2 block">Outcome & Results</label>
          <textarea
            value={formData.outcome}
            onChange={e => setFormData({...formData, outcome: e.target.value})}
            rows={4}
            className="w-full bg-[var(--color-surface-dim)] border border-[var(--color-outline-variant)] rounded-xl p-4 text-[var(--color-on-surface)] text-sm flex-1"
          />
        </div>
      </div>
    </div>
  );
}
