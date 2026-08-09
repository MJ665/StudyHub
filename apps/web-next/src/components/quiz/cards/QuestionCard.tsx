'use client';

import RichContent from '../../common/RichContent';

export interface QCard {
  id: number;
  question: string;
  question_type: string; // mcq_single | mcq_multi | true_false | short_answer | essay
  options?: string[];
  content_format?: string; // text | latex | markdown
  media_urls?: string[] | null;
  points?: number;
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
};

const TYPE_LABEL: Record<string, string> = {
  mcq_single: 'Single choice',
  mcq_multi: 'Multiple choice',
  true_false: 'True / False',
  short_answer: 'Short answer',
  essay: 'Essay',
};

export default function QuestionCard({ q, index, value, onChange }: Props) {
  const fmt = q.content_format || 'text';
  const isMulti = q.question_type === 'mcq_multi';
  const selected: string[] = Array.isArray(value) ? value : value ? [value] : [];

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
            const checked = isMulti ? selected.includes(opt) : value === opt;
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
    </div>
  );
}
