'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ApiService from '@/services/ApiService';

interface Attempt {
  id: number;
  user_id: number;
  user_name?: string | null;
  user_email?: string | null;
  status: string;
  score: number | null;
  total: number | null;
  passed: boolean | null;
  verdict?: 'pass' | 'fail' | null;
  result_status?: 'pending' | 'released' | 'withheld';
  released_at?: string | null;
  flags: number;
  submitted_at: string | null;
}

interface ExamStats {
  title: string;
  participation: { invited: number; attempted: number; in_progress: number; completion_rate: number };
  scores: { pass_rate: number; average: number; median: number; highest: number; lowest: number; distribution: { range: string; count: number }[] };
  timing: { average_minutes: number; duration_minutes: number };
  questions: { question_id: number; question: string; answered: number; correct: number; correct_pct: number | null; manual_graded?: boolean }[];
  proctoring: { candidates_flagged: number; total_flags: number; avg_flags_per_candidate: number };
}

interface ProctorSnapshot { id: number; media_url: string; at: string | null; }
interface ProctorFlag { id: number; event_type: string; detail: string | null; at: string | null; }
interface ProctorVideo { id: number; media_url: string; at: string | null; }

function ProctorDetail({ attemptId }: { attemptId: number }) {
  const [data, setData] = useState<{ snapshots: ProctorSnapshot[]; flags: ProctorFlag[]; videos: ProctorVideo[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [vIdx, setVIdx] = useState(0);
  useEffect(() => {
    ApiService.getProctorEvents(attemptId)
      .then((r) => {
        // Only surface webcam events that actually have media — a timestamp
        // with no real media_url must not render a broken player/thumbnail.
        const hasMedia = (x: { media_url?: string }) => !!(x.media_url && x.media_url.trim());
        setData({
          snapshots: (r.snapshots || []).filter(hasMedia),
          flags: r.flags || [],
          videos: (r.video_chunks || []).filter(hasMedia),
        });
      })
      .catch(() => setData({ snapshots: [], flags: [], videos: [] }))
      .finally(() => setLoading(false));
  }, [attemptId]);

  if (loading) return <div className="px-4 py-3 text-[var(--color-on-surface-variant)] text-xs">Loading proctor data…</div>;
  if (!data) return null;
  const fmt = (s: string | null) => (s ? new Date(s).toLocaleTimeString() : '—');
  return (
    <div className="px-4 py-4 bg-[var(--color-surface-dim)]/60 border-b border-[var(--color-outline-variant)]/50 space-y-4">
      {data.videos.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-widest text-[var(--color-on-surface-variant)] mb-2">Webcam recording ({data.videos.length} segment{data.videos.length > 1 ? 's' : ''})</div>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            key={data.videos[vIdx]?.id}
            src={data.videos[vIdx]?.media_url}
            controls
            autoPlay
            onEnded={() => setVIdx((i) => (i + 1 < data.videos.length ? i + 1 : i))}
            className="w-full max-w-md rounded-lg border border-[var(--color-outline-variant)] bg-black"
          />
          <div className="flex gap-1 mt-2 flex-wrap">
            {data.videos.map((v, i) => (
              <button key={v.id} onClick={() => setVIdx(i)}
                className={`text-[10px] px-2 py-1 rounded ${i === vIdx ? 'bg-[var(--color-success)] text-[var(--color-surface-dim)]' : 'bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-bright)]'}`}>
                {fmt(v.at)}
              </button>
            ))}
          </div>
        </div>
      )}
      <div>
        <div className="text-xs uppercase tracking-widest text-[var(--color-on-surface-variant)] mb-2">Webcam snapshots ({data.snapshots.length})</div>
        {data.snapshots.length === 0 ? (
          <div className="text-[var(--color-on-surface-variant)] text-xs">No snapshots captured.</div>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {data.snapshots.map((s) => (
              <a key={s.id} href={s.media_url} target="_blank" rel="noopener" className="flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.media_url} alt={`snapshot ${fmt(s.at)}`} title={fmt(s.at)}
                  className="w-24 h-18 object-cover rounded-md border border-[var(--color-outline-variant)]" />
              </a>
            ))}
          </div>
        )}
      </div>
      <div>
        <div className="text-xs uppercase tracking-widest text-[var(--color-on-surface-variant)] mb-2">Flag timeline ({data.flags.length})</div>
        {data.flags.length === 0 ? (
          <div className="text-[var(--color-success)]/70 text-xs">No integrity flags.</div>
        ) : (
          <ul className="space-y-1">
            {data.flags.map((f) => (
              <li key={f.id} className="flex items-center gap-3 text-xs">
                <span className="text-[var(--color-on-surface-variant)] font-mono w-20">{fmt(f.at)}</span>
                <span className="text-[var(--color-warning)] font-semibold">{f.event_type.replace(/_/g, ' ')}</span>
                {f.detail && <span className="text-[var(--color-on-surface-variant)] truncate">{f.detail}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function ProctorReviewPage() {
  const params = useParams();
  const examId = Number(Array.isArray(params.id) ? params.id[0] : params.id);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [stats, setStats] = useState<ExamStats | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);

  const reload = () => {
    ApiService.examAttemptsForReview(examId)
      .then((r) => setAttempts(r.attempts || []))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    reload();
    ApiService.examStats(examId).then((s) => setStats(s)).catch(() => setStats(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId]);

  const toggle = (id: number) =>
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const doRelease = async () => {
    if (selected.size === 0) return;
    setBusy(true);
    try {
      const res: any = await ApiService.releaseExamResults(examId, [...selected]);
      alert(`Released ${res.released} result(s); ${res.certificates_issued} certificate(s) issued.`);
      setSelected(new Set()); reload();
    } catch (e: any) { setError(e?.message || 'Release failed'); } finally { setBusy(false); }
  };
  const doMark = async (verdict: 'pass' | 'fail' | 'withhold') => {
    if (selected.size === 0) return;
    setBusy(true);
    try {
      await ApiService.markExamResults(examId, [...selected], verdict);
      setSelected(new Set()); reload();
    } catch (e: any) { setError(e?.message || 'Action failed'); } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-[var(--color-surface-dim)] text-[var(--color-on-surface)] p-6 md:p-10">
      <div className="max-w-4xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black">Proctor review</h1>
            <p className="text-[var(--color-on-surface-variant)] text-sm">Exam #{examId} · attempts &amp; integrity flags</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                try {
                  const blob = await ApiService.exportExamResults(examId);
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url; a.download = `exam_${examId}_results.csv`; a.click();
                  URL.revokeObjectURL(url);
                } catch { setError('Export failed'); }
              }}
              className="px-4 py-2 rounded-lg bg-[var(--color-success)] hover:bg-[var(--color-success)] text-sm font-bold"
            >
              Export CSV
            </button>
            <a href="/exams" className="px-4 py-2 rounded-lg bg-[var(--color-surface-container-high)] hover:bg-[var(--color-surface-bright)] text-sm">← Exams</a>
          </div>
        </header>

        {error && <div className="rounded-lg bg-[var(--color-danger)]/10 text-[var(--color-danger)] p-4 text-sm mb-4">{error}</div>}

        {stats && (
          <section className="mb-6 space-y-4">
            {/* KPI tiles */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Attempted', value: `${stats.participation.attempted}/${stats.participation.invited || '—'}`, sub: `${stats.participation.completion_rate}% completion` },
                { label: 'Pass rate', value: `${stats.scores.pass_rate}%`, sub: `avg ${stats.scores.average}% · med ${stats.scores.median}%` },
                { label: 'Score range', value: `${stats.scores.lowest}–${stats.scores.highest}%`, sub: 'low – high' },
                { label: 'Avg time', value: `${stats.timing.average_minutes}m`, sub: `of ${stats.timing.duration_minutes}m` },
              ].map((k) => (
                <div key={k.label} className="rounded-xl bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] p-4">
                  <div className="text-[10px] uppercase tracking-widest text-[var(--color-on-surface-variant)]">{k.label}</div>
                  <div className="text-xl font-black mt-1">{k.value}</div>
                  <div className="text-[11px] text-[var(--color-on-surface-variant)]">{k.sub}</div>
                </div>
              ))}
            </div>

            {/* Score distribution */}
            <div className="rounded-xl bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] p-4">
              <div className="text-xs uppercase tracking-widest text-[var(--color-on-surface-variant)] mb-3">Score distribution</div>
              <div className="flex items-end gap-2 h-28">
                {stats.scores.distribution.map((b) => {
                  const max = Math.max(1, ...stats.scores.distribution.map((x) => x.count));
                  return (
                    <div key={b.range} className="flex-1 flex flex-col items-center justify-end gap-1">
                      <div className="w-full bg-[var(--color-success)]/70 rounded-t" style={{ height: `${(b.count / max) * 100}%` }} title={`${b.count}`} />
                      <div className="text-[10px] text-[var(--color-on-surface-variant)]">{b.range}</div>
                      <div className="text-[10px] text-[var(--color-on-surface-variant)] font-bold">{b.count}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Question difficulty + proctoring summary */}
            <div className="grid md:grid-cols-2 gap-3">
              <div className="rounded-xl bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] p-4">
                <div className="text-xs uppercase tracking-widest text-[var(--color-on-surface-variant)] mb-2">Question difficulty (correct %)</div>
                <ul className="space-y-1.5 max-h-48 overflow-y-auto">
                  {stats.questions.map((q, i) => {
                    const pct = q.correct_pct;
                    const manual = q.manual_graded || pct === null;
                    return (
                      <li key={q.question_id} className="flex items-center gap-2 text-xs">
                        <span className="text-[var(--color-on-surface-variant)] w-6">Q{i + 1}</span>
                        <div className="flex-1 bg-[var(--color-surface-container-high)] rounded h-2 overflow-hidden">
                          {!manual && <div className={`h-full ${(pct ?? 0) >= 60 ? 'bg-[var(--color-success)]' : (pct ?? 0) >= 30 ? 'bg-[var(--color-warning)]' : 'bg-[var(--color-danger)]'}`} style={{ width: `${pct ?? 0}%` }} />}
                        </div>
                        <span className="w-14 text-right text-[var(--color-on-surface-variant)]">{manual ? 'manual' : `${pct}%`}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div className="rounded-xl bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] p-4">
                <div className="text-xs uppercase tracking-widest text-[var(--color-on-surface-variant)] mb-2">Proctoring integrity</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-[var(--color-on-surface-variant)]">Candidates flagged</span><span className="font-bold">{stats.proctoring.candidates_flagged}</span></div>
                  <div className="flex justify-between"><span className="text-[var(--color-on-surface-variant)]">Total flags</span><span className="font-bold">{stats.proctoring.total_flags}</span></div>
                  <div className="flex justify-between"><span className="text-[var(--color-on-surface-variant)]">Avg flags / candidate</span><span className="font-bold">{stats.proctoring.avg_flags_per_candidate}</span></div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Mettl-style release toolbar */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-xs text-[var(--color-on-surface-variant)] mr-1">{selected.size} selected</span>
          <button disabled={busy || selected.size === 0} onClick={doRelease}
            className="px-3 py-1.5 rounded-lg bg-[var(--color-success)] hover:bg-[var(--color-success)] text-xs font-bold disabled:opacity-40">
            Release results {selected.size ? `(${selected.size})` : ''}
          </button>
          <button disabled={busy || selected.size === 0} onClick={() => doMark('pass')}
            className="px-3 py-1.5 rounded-lg bg-[var(--color-surface-container-high)] hover:bg-[var(--color-success)]/30 border border-[var(--color-outline-variant)] text-xs font-bold disabled:opacity-40">Force Pass</button>
          <button disabled={busy || selected.size === 0} onClick={() => doMark('fail')}
            className="px-3 py-1.5 rounded-lg bg-[var(--color-surface-container-high)] hover:bg-[var(--color-danger)]/30 border border-[var(--color-outline-variant)] text-xs font-bold disabled:opacity-40">Force Fail</button>
          <button disabled={busy || selected.size === 0} onClick={() => doMark('withhold')}
            className="px-3 py-1.5 rounded-lg bg-[var(--color-surface-container-high)] hover:bg-[var(--color-surface-bright)] border border-[var(--color-outline-variant)] text-xs font-bold disabled:opacity-40">Withhold</button>
        </div>

        <div className="rounded-xl bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] overflow-x-auto">
          <div className="min-w-[620px]">
          <div className="grid grid-cols-[32px_1fr_1fr_1fr_1fr_1fr] gap-2 px-4 py-3 text-xs uppercase tracking-widest text-[var(--color-on-surface-variant)] border-b border-[var(--color-outline-variant)]">
            <span></span><span>User</span><span>Status</span><span>Score</span><span>Result</span><span>Flags</span>
          </div>
          {loading ? <div className="p-4 text-[var(--color-on-surface-variant)] text-sm">Loading…</div> : attempts.length === 0 ? (
            <div className="p-4 text-[var(--color-on-surface-variant)] text-sm">No attempts yet.</div>
          ) : attempts.map((a) => {
            const verdict = a.verdict ?? (a.passed == null ? null : a.passed ? 'pass' : 'fail');
            const rs = a.result_status || 'pending';
            return (
            <div key={a.id} className="border-b border-[var(--color-outline-variant)]/50">
              <div className="grid grid-cols-[32px_1fr_1fr_1fr_1fr_1fr] gap-2 px-4 py-2.5 text-sm items-center hover:bg-[var(--color-surface-container-high)]/40 transition-colors">
                <input type="checkbox" checked={selected.has(a.id)} onChange={() => toggle(a.id)}
                  disabled={a.status === 'in_progress'} className="accent-[var(--color-success)]" />
                <button onClick={() => setExpanded(expanded === a.id ? null : a.id)} className="min-w-0 text-left">
                  <span className="block truncate font-semibold">{a.user_name || `User ${a.user_id}`}</span>
                  {a.user_email && <span className="block truncate text-xs text-[var(--color-on-surface-variant)]">{a.user_email}</span>}
                </button>
                <span className="text-[var(--color-on-surface-variant)]">{a.status}</span>
                <span>{a.score != null ? `${a.score}/${a.total}` : '—'}</span>
                <span className="flex flex-col">
                  <span className={verdict === 'pass' ? 'text-[var(--color-success)]' : verdict === 'fail' ? 'text-[var(--color-danger)]' : 'text-[var(--color-on-surface-variant)]'}>
                    {verdict == null ? '—' : verdict === 'pass' ? 'Pass' : 'Fail'}
                  </span>
                  <span className={`text-[10px] ${rs === 'released' ? 'text-[var(--color-success)]/70' : rs === 'withheld' ? 'text-[var(--color-warning)]/70' : 'text-[var(--color-on-surface-variant)]'}`}>{rs}</span>
                </span>
                <button onClick={() => setExpanded(expanded === a.id ? null : a.id)}
                  className={`text-left ${a.flags > 0 ? 'text-[var(--color-warning)] font-bold' : 'text-[var(--color-on-surface-variant)]'}`}>
                  {a.flags > 0 ? `⚠ ${a.flags}` : '0'} <span className="text-[var(--color-on-surface-variant)]">{expanded === a.id ? '▲' : '▼'}</span>
                </button>
              </div>
              {expanded === a.id && <ProctorDetail attemptId={a.id} />}
            </div>
            );
          })}
          </div>
        </div>
        <p className="text-center text-[var(--color-on-surface-variant)] text-xs mt-6">Powered by GrindBuddy</p>
      </div>
    </div>
  );
}
