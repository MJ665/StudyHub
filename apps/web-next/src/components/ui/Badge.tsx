'use client';

import React from 'react';

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

const TONES: Record<Tone, string> = {
  neutral: 'bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] border-[var(--color-outline-variant)]',
  accent: 'bg-[var(--color-brand-primary)]/15 text-[var(--color-brand-primary)] border-[var(--color-brand-primary)]/30',
  success: 'bg-[var(--color-success)]/10 text-[var(--color-success)] border-[var(--color-success)]/20',
  warning: 'bg-[var(--color-warning)]/10 text-[var(--color-warning)] border-[var(--color-warning)]/20',
  danger: 'bg-[var(--color-danger)]/10 text-[var(--color-danger)] border-[var(--color-danger)]/20',
};

/** Token-based status badge/chip. */
export default function Badge({ tone = 'neutral', className = '', children }: { tone?: Tone; className?: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border text-[10px] font-black uppercase tracking-widest ${TONES[tone]} ${className}`}>
      {children}
    </span>
  );
}
