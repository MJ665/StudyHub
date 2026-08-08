'use client';

/**
 * Live JSON question builder — the single canonical authoring surface.
 * Two panes, bidirectionally synced: a friendly form (left) and the raw
 * canonical JSON in a Monaco editor (right). Editing either updates the other;
 * invalid JSON shows an inline error without wiping the form.
 *
 * Emits the canonical question array via onChange. Supports all question types,
 * per-field content_format (text/markdown/latex/code), image upload + paste-URL
 * (→ media_urls), and a live rich preview.
 */
import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Plus, Trash2, Image as ImageIcon, Loader2, Eye, Code2 } from 'lucide-react';
import ApiService from '../../services/ApiService';
import RichContent from '../common/RichContent';
import { useToast } from '../ui/Toast';

const QTYPES = ['mcq_single', 'mcq_multi', 'true_false', 'short_answer', 'essay', 'coding', 'config'] as const;
const FORMATS = ['text', 'markdown', 'latex', 'code'] as const;

function blank() {
  return {
    question: '', question_type: 'mcq_single', content_format: 'text',
    options: ['', ''], answer: '', correct_options: [], points: 1,
    difficulty: 'Medium', media_urls: [] as string[], explanation: '',
  };
}

export default function QuestionBuilder({ questions, onChange }: { questions: any[]; onChange: (q: any[]) => void }) {
  const { toast } = useToast();
  const [jsonText, setJsonText] = useState(() => JSON.stringify(questions?.length ? questions : [blank()], null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const [previewIdx, setPreviewIdx] = useState<number | null>(0);

  const list: any[] = questions?.length ? questions : [];

  // Builder → both (form edits regenerate the JSON pane).
  const commit = (qs: any[]) => { onChange(qs); setJsonText(JSON.stringify(qs, null, 2)); setJsonError(null); };
  const addQ = () => commit([...list, blank()]);
  const removeQ = (i: number) => commit(list.filter((_, idx) => idx !== i));
  const patchQ = (i: number, patch: any) => commit(list.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  const patchOpt = (i: number, oi: number, val: string) =>
    patchQ(i, { options: (list[i].options || []).map((o: string, k: number) => (k === oi ? val : o)) });
  const addOpt = (i: number) => patchQ(i, { options: [...(list[i].options || []), ''] });
  const removeOpt = (i: number, oi: number) => patchQ(i, { options: (list[i].options || []).filter((_: string, k: number) => k !== oi) });

  // JSON → questions (keep the text as typed; only push valid parses).
  const onJson = (text?: string) => {
    const t = text ?? '';
    setJsonText(t);
    try {
      const parsed = JSON.parse(t);
      const arr = Array.isArray(parsed) ? parsed : parsed.questions;
      if (!Array.isArray(arr)) throw new Error('Expected a JSON array of questions (or { questions: [...] }).');
      setJsonError(null);
      onChange(arr);
    } catch (e: any) {
      setJsonError(e.message || 'Invalid JSON');
    }
  };

  const uploadImage = async (i: number, file: File) => {
    setUploadingIdx(i);
    try {
      const url = await ApiService.uploadContentImage(file);
      patchQ(i, { media_urls: [...(list[i].media_urls || []), url] });
      toast('success', 'Image added');
    } catch (e: any) {
      toast('error', e?.message || 'Image upload failed');
    } finally {
      setUploadingIdx(null);
    }
  };

  const input = 'w-full bg-[var(--color-surface-dim)] border border-[var(--color-outline-variant)] rounded-lg px-3 py-2 text-sm text-[var(--color-on-surface)] outline-none focus:ring-1 focus:ring-indigo-500/50';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[520px]">
      {/* Builder pane */}
      <div className="space-y-4 max-h-[560px] overflow-y-auto pr-1 custom-scrollbar">
        {list.length === 0 && (
          <div className="text-sm text-[var(--color-on-surface-variant)]">No questions yet.</div>
        )}
        {list.map((q, i) => (
          <div key={i} className="bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-on-surface-variant)]">Q{i + 1}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setPreviewIdx(previewIdx === i ? null : i)} title="Preview" className="text-[var(--color-on-surface-variant)] hover:text-[var(--color-brand-primary)]"><Eye size={14} /></button>
                <button onClick={() => removeQ(i)} title="Remove" className="text-[var(--color-on-surface-variant)] hover:text-rose-400"><Trash2 size={14} /></button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <select className={input} value={q.question_type || 'mcq_single'} onChange={(e) => patchQ(i, { question_type: e.target.value })}>
                {QTYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <select className={input} value={q.content_format || 'text'} onChange={(e) => patchQ(i, { content_format: e.target.value })}>
                {FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>

            <textarea className={input} rows={2} placeholder="Question stem…" value={q.question || ''} onChange={(e) => patchQ(i, { question: e.target.value })} />

            {['mcq_single', 'mcq_multi', 'true_false'].includes(q.question_type) && (
              <div className="space-y-2">
                {(q.options || []).map((opt: string, oi: number) => (
                  <div key={oi} className="flex items-center gap-2">
                    <input className={input} placeholder={`Option ${oi + 1}`} value={opt} onChange={(e) => patchOpt(i, oi, e.target.value)} />
                    {q.question_type === 'mcq_multi' ? (
                      <input type="checkbox" title="Correct" checked={(q.correct_options || []).includes(oi)}
                        onChange={(e) => patchQ(i, { correct_options: e.target.checked ? [...(q.correct_options || []), oi] : (q.correct_options || []).filter((x: number) => x !== oi) })} />
                    ) : (
                      <input type="radio" name={`ans-${i}`} title="Correct" checked={q.answer === opt} onChange={() => patchQ(i, { answer: opt })} />
                    )}
                    <button onClick={() => removeOpt(i, oi)} className="text-[var(--color-on-surface-variant)] hover:text-rose-400"><Trash2 size={12} /></button>
                  </div>
                ))}
                <button onClick={() => addOpt(i)} className="text-[11px] font-bold text-[var(--color-brand-primary)] hover:text-indigo-300 flex items-center gap-1"><Plus size={12} /> Add option</button>
              </div>
            )}

            {['short_answer', 'essay', 'coding'].includes(q.question_type) && (
              <textarea className={input} rows={2} placeholder="Model answer (for AI grading)" value={q.model_answer || ''} onChange={(e) => patchQ(i, { model_answer: e.target.value })} />
            )}

            <div className="flex items-center gap-3 flex-wrap">
              <input type="number" className="w-20 bg-[var(--color-surface-dim)] border border-[var(--color-outline-variant)] rounded-lg px-2 py-1.5 text-sm text-[var(--color-on-surface)]" value={q.points ?? 1} min={1} onChange={(e) => patchQ(i, { points: Number(e.target.value) || 1 })} title="Points" />
              <label className="text-[11px] text-[var(--color-on-surface-variant)] flex items-center gap-1.5 cursor-pointer hover:text-[var(--color-brand-primary)]">
                {uploadingIdx === i ? <Loader2 size={13} className="animate-spin" /> : <ImageIcon size={13} />} Upload image
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(i, f); }} />
              </label>
              <button onClick={() => { const u = prompt('Paste image URL'); if (u) patchQ(i, { media_urls: [...(q.media_urls || []), u] }); }}
                className="text-[11px] text-[var(--color-on-surface-variant)] hover:text-[var(--color-brand-primary)]">+ Paste image URL</button>
              {(q.media_urls || []).length > 0 && <span className="text-[10px] text-[var(--color-on-surface-variant)]">{q.media_urls.length} image(s)</span>}
            </div>

            {previewIdx === i && (
              <div className="mt-2 border-t border-[var(--color-outline-variant)] pt-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-on-surface-variant)] mb-2">Preview</p>
                <RichContent content={q.question} format={q.content_format} mediaUrls={q.media_urls} />
              </div>
            )}
          </div>
        ))}
        <button onClick={addQ} className="w-full py-2.5 rounded-xl bg-[var(--color-brand-primary-container)] hover:bg-indigo-500 text-[var(--color-on-surface)] text-sm font-bold flex items-center justify-center gap-2"><Plus size={16} /> Add question</button>
      </div>

      {/* Raw JSON pane */}
      <div className="flex flex-col">
        <div className="flex items-center gap-2 mb-2 text-[var(--color-on-surface-variant)] text-[11px] font-black uppercase tracking-widest"><Code2 size={13} /> Raw JSON</div>
        <div className="flex-1 rounded-xl overflow-hidden border border-[var(--color-outline-variant)] min-h-[440px]">
          <Editor
            height="440px"
            defaultLanguage="json"
            theme="vs-dark"
            value={jsonText}
            onChange={onJson}
            options={{ minimap: { enabled: false }, fontSize: 12, wordWrap: 'on', lineNumbers: 'on', scrollBeyondLastLine: false }}
          />
        </div>
        {jsonError && <p className="text-xs text-rose-400 mt-2">⚠ {jsonError}</p>}
      </div>
    </div>
  );
}
