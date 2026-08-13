'use client';

import { useState } from 'react';
import RichContent from '../../common/RichContent';
import CodeEditor from '../CodeEditor';

export interface QCard {
  id: number;
  question: string;
  question_type: string; // mcq_single | mcq_multi | true_false | short_answer | essay | coding | config
  options?: string[];
  content_format?: string; // text | latex | markdown
  media_urls?: string[] | null;
  points?: number;
  initial_code?: string;
  language?: string;
  config_schema?: string; // JSON schema for config type
}

interface Props {
  q: QCard;
  index: number;
  value: string | string[];
  onChange: (value: string | string[]) => void;
}

const TYPE_ACCENT: Record<string, string> = {
  mcq_single: 'border-l-sky-500',
  mcq_multi: 'border-l-[var(--color-brand-primary)]',
  true_false: 'border-l-teal-500',
  short_answer: 'border-l-[var(--color-warning)]',
  essay: 'border-l-[var(--color-brand-primary)]',
  coding: 'border-l-[var(--color-success)]',
  config: 'border-l-[var(--color-brand-primary)]',
};

const TYPE_LABEL: Record<string, string> = {
  mcq_single: 'Single choice',
  mcq_multi: 'Multiple choice',
  true_false: 'True / False',
  short_answer: 'Short answer',
  essay: 'Essay',
  coding: 'Coding',
  config: 'Configuration',
};

export default function QuestionCard({ q, index, value, onChange }: Props) {
  const fmt = q.content_format || 'text';
  const isMulti = q.question_type === 'mcq_multi';
  const [showCodeEditor, setShowCodeEditor] = useState(false);

  // Normalize value: coerce single-element array to string for single-choice types
  // This ensures proper radio selection and comparison (value === opt) works correctly.
  let normalizedValue: string | string[];
  if (isMulti) {
    // For mcq_multi, keep it as an array
    normalizedValue = Array.isArray(value) ? value : value ? [value] : [];
  } else {
    // For mcq_single, true_false, short_answer, essay, coding, and config, coerce to string
    if (Array.isArray(value)) {
      normalizedValue = value.length === 1 ? value[0] : '';
    } else {
      normalizedValue = value || '';
    }
  }

  const selected: string[] = Array.isArray(normalizedValue) ? normalizedValue : normalizedValue ? [normalizedValue] : [];

  const toggleMulti = (opt: string) => {
    const set = new Set(selected);
    if (set.has(opt)) set.delete(opt);
    else set.add(opt);
    onChange(Array.from(set));
  };

  const optList = q.question_type === 'true_false' ? ['True', 'False'] : q.options || [];

  return (
    <div className={`rounded-xl bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] border-l-4 ${TYPE_ACCENT[q.question_type] || 'border-l-[var(--color-outline-variant)]'} p-5 mb-5`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[var(--color-on-surface-variant)] text-xs font-bold">Q{index + 1}</span>
        <span className="text-[10px] uppercase tracking-widest text-[var(--color-on-surface-variant)] bg-[var(--color-surface-container-high)] px-2 py-0.5 rounded-full">
          {TYPE_LABEL[q.question_type] || q.question_type} · {q.points ?? 1} pt
        </span>
      </div>

      <div className="text-[var(--color-on-surface)] mb-4 leading-relaxed break-words overflow-x-auto">
        <RichContent content={q.question} format={fmt} mediaUrls={q.media_urls} />
      </div>

      {(q.question_type === 'short_answer') && (
        <input
          className="w-full rounded-lg bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)] px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--color-warning)]"
          placeholder="Type your brief answer…"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {(q.question_type === 'essay') && (
        <textarea
          className="w-full rounded-lg bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)] px-4 py-3 text-sm min-h-[140px] focus:outline-none focus:border-[var(--color-brand-primary)]"
          placeholder="Write your answer…"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {(q.question_type === 'mcq_single' || q.question_type === 'true_false' || isMulti) && (
        <div className="space-y-2">
          {optList.map((opt) => {
            const checked = isMulti ? selected.includes(opt) : normalizedValue === opt;
            return (
              <label
                key={opt}
                className={`flex items-start gap-3 rounded-lg border px-4 py-2.5 cursor-pointer transition ${
                  checked ? 'border-[var(--color-success)] bg-[var(--color-success)]/10' : 'border-[var(--color-outline-variant)] hover:border-[var(--color-outline-variant)]'
                }`}
              >
                <input
                  type={isMulti ? 'checkbox' : 'radio'}
                  name={`q-${q.id}`}
                  checked={checked}
                  onChange={() => (isMulti ? toggleMulti(opt) : onChange(opt))}
                  className="accent-[var(--color-success)] shrink-0 mt-0.5"
                />
                <span className="text-sm text-[var(--color-on-surface)] min-w-0 break-words">
                  <RichContent content={opt} format={fmt} />
                </span>
              </label>
            );
          })}
        </div>
      )}

      {q.question_type === 'coding' && (
        <div className="rounded-lg bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)] overflow-hidden">
          {!showCodeEditor ? (
            <div className="p-4">
              <button
                onClick={() => setShowCodeEditor(true)}
                className="w-full px-4 py-3 rounded-lg bg-[var(--color-success)] hover:bg-[var(--color-success)] text-white font-bold text-sm"
              >
                Open code editor
              </button>
              {typeof normalizedValue === 'string' && normalizedValue && (
                <div className="mt-3 p-3 rounded-lg bg-[var(--color-surface-container)] font-mono text-xs text-[var(--color-on-surface-variant)] max-h-40 overflow-auto whitespace-pre-wrap break-words">
                  {normalizedValue.substring(0, 200)}
                  {normalizedValue.length > 200 ? '...' : ''}
                </div>
              )}
            </div>
          ) : (
            <div className="min-h-96">
              <CodeEditor
                question={{
                  ...q,
                  id: q.id,
                  title: q.question,
                  description: q.question,
                  initial_code: typeof normalizedValue === 'string' ? normalizedValue : q.initial_code || '',
                  language: q.language || 'python',
                }}
                onFinish={(code: string) => {
                  onChange(code);
                  setShowCodeEditor(false);
                }}
              />
            </div>
          )}
        </div>
      )}

      {q.question_type === 'config' && (
        <textarea
          className="w-full rounded-lg bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)] px-4 py-3 text-sm min-h-[180px] font-mono focus:outline-none focus:border-[var(--color-brand-primary)]"
          placeholder="Enter configuration JSON..."
          value={typeof normalizedValue === 'string' ? normalizedValue : ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
