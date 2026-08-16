'use client';

/**
 * Candidate exam-result page. This is the destination for the "View Result"
 * button in the result-release email and the exam-result notification — a
 * PERSISTENT view of a submitted attempt (score, verdict, pass/fail) plus a
 * certificate download when the candidate passed and results are released.
 *
 * Deliberately standalone (like the exam runner) so it opens cleanly from an
 * email link without the dashboard chrome. Unauthenticated visitors are bounced
 * to /login by ApiService on the 401.
 */
import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ApiService from '@/services/ApiService';

interface ExamResult {
  attempt_id: number;
  exam_id: number;
  exam_title: string;
  result_status: string; // released | pending | withheld
  released: boolean;
  score: number | null;
  total: number | null;
  percent: number | null;
  passing_score: number;
  verdict: 'pass' | 'fail' | null;
  passed: boolean | null;
  submitted_at: string | null;
  certificate_available: boolean;
  flags: number;
}

export default function ExamResultPage() {
  const params = useParams();
  const router = useRouter();
  const examId = Number(params?.examId);

  const [result, setResult] = useState<ExamResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [certBusy, setCertBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = (await ApiService.getMyExamResult(examId)) as ExamResult;
      setResult(res);
    } catch (e: any) {
      const status = e?.status || e?.response?.status;
      setError(
        status === 404
          ? 'No submitted attempt was found for this exam under your account.'
          : e?.message || 'Could not load your result.'
      );
    } finally {
      setLoading(false);
    }
  }, [examId]);

  useEffect(() => {
    if (Number.isFinite(examId)) load();
    else {
      setError('Invalid exam link.');
      setLoading(false);
    }
  }, [examId, load]);

  const openCertificate = async (which: 'download' | 'share') => {
    if (!result) return;
    setCertBusy(true);
    try {
      const r: any = await ApiService.getExamCertificate(result.attempt_id);
      window.open(which === 'share' ? r.share_url : r.certificate_url, '_blank');
    } catch (e: any) {
      const status = e?.status || e?.response?.status;
      alert(
        status === 403
          ? 'Your certificate becomes available once L&D releases your results.'
          : e?.message || 'Certificate is not available yet.'
      );
    } finally {
      setCertBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-surface-dim)] flex items-center justify-center p-4 sm:p-8 font-plus-jakarta">
      <div className="w-full max-w-lg bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] rounded-3xl p-8 sm:p-10 text-center">
        {loading ? (
          <div className="py-16 text-[var(--color-on-surface-variant)] font-bold uppercase tracking-widest text-xs">
            Loading your result…
          </div>
        ) : error ? (
          <>
            <div className="text-2xl font-black text-[var(--color-on-surface)] mb-3">Result unavailable</div>
            <p className="text-sm text-[var(--color-on-surface-variant)] mb-8">{error}</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-5 py-3 rounded-2xl bg-[var(--color-surface-container-high)] text-sm font-bold text-[var(--color-on-surface)] border border-[var(--color-outline-variant)]"
            >
              Back to dashboard
            </button>
          </>
        ) : result ? (
          <>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-on-surface-variant)] mb-2">
              Exam Result
            </p>
            <h1 className="text-xl sm:text-2xl font-black text-[var(--color-on-surface)] mb-6">{result.exam_title}</h1>

            {!result.released ? (
              <div className="py-8">
                <div className="text-lg font-black text-[var(--color-warning)] mb-2">
                  {result.result_status === 'withheld' ? 'Result withheld' : 'Result pending'}
                </div>
                <p className="text-sm text-[var(--color-on-surface-variant)]">
                  {result.result_status === 'withheld'
                    ? 'Your L&D team has withheld this result. Please contact them for details.'
                    : 'Your responses were recorded. Results will appear here once your L&D team releases them.'}
                </p>
              </div>
            ) : (
              <>
                <div
                  className={`text-5xl font-black mb-1 ${
                    result.passed ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'
                  }`}
                >
                  {result.percent}%
                </div>
                <div
                  className={`inline-block px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-4 ${
                    result.passed
                      ? 'bg-[var(--color-success)]/15 text-[var(--color-success)]'
                      : 'bg-[var(--color-danger)]/15 text-[var(--color-danger)]'
                  }`}
                >
                  {result.passed ? '✓ Passed' : '✗ Not passed'}
                </div>
                <p className="text-sm text-[var(--color-on-surface-variant)] mb-1">
                  Score {result.score} / {result.total} · passing mark {result.passing_score}%
                </p>
                {result.flags > 0 && (
                  <p className="text-xs text-[var(--color-warning)] mb-1">{result.flags} integrity flag(s) recorded</p>
                )}
                {result.submitted_at && (
                  <p className="text-[11px] text-[var(--color-on-surface-variant)] mb-6">
                    Submitted {new Date(result.submitted_at).toLocaleString()}
                  </p>
                )}

                {result.certificate_available ? (
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-4">
                    <button
                      disabled={certBusy}
                      onClick={() => openCertificate('download')}
                      className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[var(--color-brand-primary)] text-white text-sm font-black disabled:opacity-60"
                    >
                      {certBusy ? 'Preparing…' : '🎓 Download Certificate'}
                    </button>
                    <button
                      disabled={certBusy}
                      onClick={() => openCertificate('share')}
                      className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[var(--color-surface-container-high)] text-sm font-bold text-[var(--color-on-surface)] border border-[var(--color-outline-variant)] disabled:opacity-60"
                    >
                      Share to LinkedIn
                    </button>
                  </div>
                ) : result.passed ? (
                  <p className="text-xs text-[var(--color-on-surface-variant)] mt-4">
                    A certificate isn’t enabled for this exam.
                  </p>
                ) : null}
              </>
            )}

            <button
              onClick={() => router.push('/dashboard')}
              className="mt-8 text-xs font-bold text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] transition-colors"
            >
              ← Back to dashboard
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
