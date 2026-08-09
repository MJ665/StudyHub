'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import {
  BrainCircuit,
  ChevronRight,
  Clock,
  RotateCcw,
  Target,
  Trophy,
} from 'lucide-react';
import { useAssessmentNav } from '@/lib/useAssessmentNav';
import { useSessionStore } from '@/stores/sessionStore';

/** Assessment result screen — moved out of the old app/page.tsx state machine. */
export default function AssessmentResultPage() {
  const router = useRouter();
  const { quiz } = useSessionStore();
  const { startBankQuiz } = useAssessmentNav();
  const result = quiz.result as {
    score: number;
    total: number;
    weighted_score?: number;
    total_weight?: number;
    timeTaken: number;
    breakdown?: Array<{
      question_text: string;
      user_answer?: string;
      correct_answer?: string;
      is_correct: boolean;
    }>;
  } | null;

  useEffect(() => {
    if (!result) router.replace('/dashboard');
  }, [result, router]);

  if (!result) return null;
  const bank = quiz.bank as { name?: string; id: number } | null;
  const accuracy = result.total > 0 ? Math.round((result.score / result.total) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="min-h-screen bg-[var(--color-surface-dim)] text-[var(--color-on-surface)] flex items-center justify-center p-6"
    >
      <div className="w-full max-w-2xl">
        <div className="bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] rounded-3xl p-6 md:p-10 shadow-2xl text-center mb-8 relative overflow-hidden">
          <div
            className={`absolute inset-0 opacity-5 pointer-events-none ${
              accuracy >= 70
                ? 'bg-gradient-to-br from-[var(--color-success)] to-[var(--color-success)]'
                : accuracy >= 40
                  ? 'bg-gradient-to-br from-[var(--color-warning)] to-[var(--color-warning)]'
                  : 'bg-gradient-to-br from-[var(--color-danger)] to-[var(--color-danger)]'
            }`}
          />

          <div
            className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl font-black border-4 ${
              accuracy >= 70
                ? 'border-[var(--color-success)] bg-[var(--color-success)]/20 text-[var(--color-success)]'
                : accuracy >= 40
                  ? 'border-[var(--color-warning)] bg-[var(--color-warning)]/20 text-[var(--color-warning)]'
                  : 'border-[var(--color-danger)] bg-[var(--color-danger)]/20 text-[var(--color-danger)]'
            }`}
          >
            {accuracy}%
          </div>

          <h2 className="text-3xl font-bold text-[var(--color-on-surface)] mb-2">Quiz Complete!</h2>
          <p className="text-[var(--color-on-surface-variant)] mb-8">{bank?.name || 'Assessment'}</p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            <div className="bg-[var(--color-surface-container-high)]/50 p-4 rounded-2xl border border-[var(--color-outline-variant)]">
              <Trophy size={18} className="text-[var(--color-brand-primary)] mx-auto mb-2" />
              <p className="text-xl font-bold text-[var(--color-on-surface)]">
                {result.score}/{result.total}
              </p>
              <p className="text-[10px] text-[var(--color-on-surface-variant)] uppercase tracking-wider mt-1">Raw Score</p>
            </div>
            <div className="bg-[var(--color-surface-container-high)]/50 p-4 rounded-2xl border border-[var(--color-outline-variant)]">
              <BrainCircuit size={18} className="text-[var(--color-brand-primary)] mx-auto mb-2" />
              <p className="text-xl font-bold text-[var(--color-on-surface)]">
                {result.weighted_score?.toFixed(1) || '0.0'}/{result.total_weight?.toFixed(1) || '0.0'}
              </p>
              <p className="text-[10px] text-[var(--color-on-surface-variant)] uppercase tracking-wider mt-1">Weighted</p>
            </div>
            <div className="bg-[var(--color-surface-container-high)]/50 p-4 rounded-2xl border border-[var(--color-outline-variant)]">
              <Target size={18} className="text-[var(--color-brand-primary)] mx-auto mb-2" />
              <p className="text-xl font-bold text-[var(--color-on-surface)]">{accuracy}%</p>
              <p className="text-[10px] text-[var(--color-on-surface-variant)] uppercase tracking-wider mt-1">Accuracy</p>
            </div>
            <div className="bg-[var(--color-surface-container-high)]/50 p-4 rounded-2xl border border-[var(--color-outline-variant)]">
              <Clock size={18} className="text-[var(--color-brand-primary)] mx-auto mb-2" />
              <p className="text-xl font-bold text-[var(--color-on-surface)]">
                {Math.floor(result.timeTaken / 60)}m {result.timeTaken % 60}s
              </p>
              <p className="text-[10px] text-[var(--color-on-surface-variant)] uppercase tracking-wider mt-1">Time</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => bank && startBankQuiz(bank, quiz.questions.length)}
              className="flex-1 flex items-center justify-center gap-2 bg-[var(--color-surface-container-high)] hover:bg-[var(--color-surface-bright)] text-[var(--color-on-surface)] py-3 rounded-xl font-bold transition-all border border-[var(--color-outline-variant)]"
            >
              <RotateCcw size={18} /> Retake
            </button>
            <button
              onClick={() => router.push('/leaderboard')}
              className="flex-1 flex items-center justify-center gap-2 bg-[var(--color-brand-primary-container)] hover:bg-[var(--color-brand-primary-container)] text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-[var(--color-brand-primary)]/30"
            >
              View Leaderboard <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {result.breakdown && result.breakdown.length > 0 && (
          <div className="bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] rounded-3xl p-6 shadow-xl">
            <h3 className="font-bold text-[var(--color-on-surface)] mb-4 text-lg">Answer Breakdown</h3>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {result.breakdown.map((item, i) => (
                <div
                  key={i}
                  className={`p-4 rounded-xl border text-sm ${
                    item.is_correct
                      ? 'bg-[var(--color-success)]/10 border-[var(--color-success)]/20'
                      : 'bg-[var(--color-danger)]/10 border-[var(--color-danger)]/20'
                  }`}
                >
                  <p className="text-[var(--color-on-surface-variant)] font-medium mb-2">
                    {i + 1}. {item.question_text}
                  </p>
                  <div className="flex gap-4 flex-wrap mb-2">
                    <span
                      className={`text-xs font-bold px-2 py-1 rounded ${
                        item.is_correct
                          ? 'bg-[var(--color-success)]/30 text-[var(--color-success)]'
                          : 'bg-[var(--color-danger)]/30 text-[var(--color-danger)]'
                      }`}
                    >
                      Your: {item.user_answer || 'Skipped'}
                    </span>
                    {!item.is_correct && (
                      <span className="text-xs font-bold px-2 py-1 rounded bg-[var(--color-success)]/30 text-[var(--color-success)]">
                        Correct: {item.correct_answer}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
