'use client';

import { useRouter } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { useSessionStore } from '@/stores/sessionStore';

export default function CodingResultPage() {
  const router = useRouter();
  const { quiz } = useSessionStore();
  const score = (quiz.result as { score?: number } | null)?.score;

  return (
    <div className="min-h-screen bg-[var(--color-surface-dim)] flex items-center justify-center p-8">
      <div className="bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] rounded-[2.5rem] p-10 max-w-lg w-full text-center">
        <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6 text-emerald-400">
          <CheckCircle2 size={32} />
        </div>
        <h3 className="text-3xl font-black text-[var(--color-on-surface)] mb-2">Code Accepted!</h3>
        <p className="text-[var(--color-on-surface-variant)] mb-8">
          Your solution passed the AI rubric with a score of{' '}
          <span className="text-[var(--color-on-surface)] font-bold">{score ?? '—'}%</span>
        </p>
        <button
          onClick={() => router.push('/dashboard')}
          className="w-full py-4 bg-[var(--color-brand-primary-container)] hover:bg-indigo-500 text-[var(--color-on-surface)] rounded-2xl font-black uppercase tracking-widest transition-all"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );
}
