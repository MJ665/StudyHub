import React, { useState, useEffect, useTransition, useCallback } from 'react';
import { ChevronRight, ChevronLeft, Trophy, Download, BrainCircuit, Loader2, BookOpen, Search, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ApiService from '../../services/ApiService';
import { renderQuestionText } from '../../utils/renderQuestionText';
import { useToast } from '../ui/Toast';
import { Skeleton, SkeletonStatGrid, SkeletonTable, SkeletonCard } from '../ui/Skeleton';

// Helper: download a CSV using the JWT token (avoids 401 from plain anchor tags)
async function downloadCSV(url: string, filename: string) {
  const token = localStorage.getItem('study_token');
  const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Export failed: ${res.status} ${res.statusText}`);
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(objectUrl);
}

export default function Leaderboard({ bank: initialBank, user, onBack, onViewProfile }: any) {
  const { toast } = useToast();
  // The leaderboard is viewable for ANY bank in the org, not only one carried
  // in from a just-taken quiz. When arrived at without a bank (e.g. the sidebar
  // link), we show a picker of the org's banks instead of crashing on bank.id.
  const [bank, setBank] = useState<any>(initialBank);
  const [pickerBanks, setPickerBanks] = useState<any[] | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [stats, setStats] = useState({ avg: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [expandedAttempt, setExpandedAttempt] = useState<number | null>(null);
  
  // VII: Fuzzy student search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDebounce, setSearchDebounce] = useState('');
  
  // Export state
  const [exportLoading, setExportLoading] = useState<Record<string, boolean>>({});

  // AI States
  const [aiResponses, setAiResponses] = useState<Record<string, any>>({});
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});
  const [aiQueries, setAiQueries] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  
  // Admin: mark as reviewed (X: Admin L&D feature)
  const [reviewLoading, setReviewLoading] = useState<Record<number, boolean>>({});

  const fetchLeaderboard = useCallback((search?: string) => {
    if (!bank?.id) return;
    setLoading(true);
    ApiService.getLeaderboard(bank.id, search)
      .then((res: any) => {
        setLeaderboard(Array.isArray(res?.leaderboard) ? res.leaderboard : []);
        setQuestions(Array.isArray(res?.questions) ? res.questions : []);
        setStats({ avg: res.group_average, total: res.total_attempts });
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [bank?.id]);

  useEffect(() => { if (bank?.id) fetchLeaderboard(); else setLoading(false); }, [fetchLeaderboard, bank?.id]);

  // No bank in context → load the org's banks (across the user's courses) for a picker.
  useEffect(() => {
    if (bank?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const courses = await ApiService.getCourses(user?.group_id ?? 0);
        const all: any[] = [];
        for (const c of (Array.isArray(courses) ? courses : [])) {
          const res: any = await ApiService.getBanks(c.id, 1, 50);
          const items = Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : []);
          items.forEach((b: any) => all.push({ ...b, course_name: c.name }));
        }
        if (!cancelled) setPickerBanks(all);
      } catch (e) { if (!cancelled) setPickerBanks([]); }
    })();
    return () => { cancelled = true; };
  }, [bank?.id, user?.group_id]);

  // VII: Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      setSearchDebounce(searchQuery);
    }, 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    if (searchDebounce !== undefined) {
      fetchLeaderboard(searchDebounce || undefined);
    }
  }, [searchDebounce, fetchLeaderboard]);

  const handleExportCSV = async (type: 'standard' | 'deep') => {
    const key = type;
    setExportLoading(prev => ({ ...prev, [key]: true }));
    try {
      const filename = `${bank.name}-${type}-export.csv`;
      await downloadCSV(`/api/export/banks/${bank.id}/${type}`, filename);
      if (toast) toast.success(`${type === 'deep' ? 'Deep' : 'Standard'} CSV downloaded!`);
    } catch (err: any) {
      if (toast) toast.error(`Export failed: ${err.message}`);
    } finally {
      setExportLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleAskAI = (attemptId: number, questionId: number) => {
    const key = `${attemptId}-${questionId}`;
    if (aiLoading[key]) return; // Extra safety guard

    const query = aiQueries[key] || "Analyze my logic and explain why I was wrong or right in detail.";
    
    startTransition(async () => {
      setAiLoading(prev => ({ ...prev, [key]: true }));
      try {
        const res = await ApiService.askAI(attemptId, questionId, query);
        // /ai/ask nests the reply under `data` ({ai_generated, data:{response}}).
        // Flatten so the render (aiData.response / is_out_of_context / from_cache) resolves.
        setAiResponses(prev => ({ ...prev, [key]: { ...(res?.data || {}), ...res } }));
        
        // Strategic Cooldown: Prevent spamming even if request is fast
        setTimeout(() => {
          setAiLoading(prev => ({ ...prev, [key]: false }));
        }, 2000);
      } catch (err: any) {
        // Surface 429 StudyBuddy quota errors with a friendly message
        const msg = err.message || '';
        const isQuota = msg.includes('429') || msg.toLowerCase().includes('quota');
        const displayMsg = isQuota
          ? '⚠️ StudyBuddy API quota exceeded. The free-tier limit has been reached. Please try again in a few minutes or upgrade your API plan.'
          : `Error: ${msg}`;
        setAiResponses(prev => ({ ...prev, [key]: { response: displayMsg, is_out_of_context: false } }));
        setAiLoading(prev => ({ ...prev, [key]: false }));
      }
    });
  };

  // X: Admin mark as reviewed toggle
  const handleMarkReviewed = async (attemptId: number, currentState: boolean) => {
    setReviewLoading(prev => ({ ...prev, [attemptId]: true }));
    try {
      await ApiService.markAttemptReviewed(attemptId, !currentState);
      setLeaderboard(prev => prev.map(a => a.id === attemptId ? { ...a, is_reviewed: !currentState } : a));
      if (toast) toast.success(`Attempt ${!currentState ? 'marked' : 'unmarked'} as reviewed.`);
    } catch (err: any) {
      if (toast) toast.error('Failed to update review status.');
    } finally {
      setReviewLoading(prev => ({ ...prev, [attemptId]: false }));
    }
  };

  // ── No bank selected → bank picker (leaderboard is org-wide, viewable by all) ──
  if (!bank?.id) {
    return (
      <div className="min-h-screen bg-[var(--color-surface-dim)] text-[var(--color-on-surface)] p-4 sm:p-6">
        <div className="max-w-3xl mx-auto">
          <button onClick={onBack} className="text-xs text-[var(--color-on-surface-variant)] uppercase tracking-widest font-bold mb-6 hover:text-[var(--color-on-surface)]">← Back</button>
          <h1 className="text-2xl sm:text-3xl font-black text-[var(--color-on-surface)] mb-1">Leaderboards</h1>
          <p className="text-sm text-[var(--color-on-surface-variant)] mb-6">Pick a question bank to see how everyone in your organization is doing.</p>
          {pickerBanks === null ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} lines={1} />)}
            </div>
          ) : pickerBanks.length === 0 ? (
            <div className="text-center py-16 text-[var(--color-on-surface-variant)] text-sm">No question banks are available yet.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {pickerBanks.map((b) => (
                <button
                  key={b.id}
                  onClick={() => { setLoading(true); setBank(b); }}
                  className="text-left p-4 rounded-2xl bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] hover:border-[var(--color-brand-primary)]/50 hover:bg-[var(--color-surface-container-high)]/60 transition-all"
                >
                  <p className="font-bold text-[var(--color-on-surface)] truncate">{b.name}</p>
                  <p className="text-[11px] text-[var(--color-on-surface-variant)] mt-1 truncate">{b.course_name || 'Bank'} · {b.difficulty || 'Mixed'}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (loading && leaderboard.length === 0) return (
    <div className="min-h-screen bg-[var(--color-surface-dim)] text-[var(--color-on-surface)] p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-9 w-64" />
        <SkeletonStatGrid count={3} />
        <SkeletonTable rows={8} cols={4} />
      </div>
    </div>
  );

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="min-h-screen bg-[var(--color-surface-dim)] text-[var(--color-on-surface)] p-6 overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-2 text-xs text-[var(--color-on-surface-variant)] uppercase tracking-widest font-bold mb-8">
          <span className="hover:text-[var(--color-brand-primary)] cursor-pointer transition-colors" onClick={onBack}>Dashboard</span>
          <ChevronRight size={12} />
          <span className="text-[var(--color-on-surface-variant)]">{bank.name}</span>
          <ChevronRight size={12} />
          <span className="text-[var(--color-brand-primary)]">Leaderboard</span>
        </div>
        <button onClick={onBack} className="flex items-center gap-2 text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] mb-8 transition-colors" aria-label="Back to dashboard">
          <ChevronLeft size={20} /> Back to Dashboard
        </button>

        <div className="bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] rounded-3xl overflow-hidden shadow-2xl">
          {/* ─── SECTION E: Restructured Header ──────────────────────── */}
          <div className="p-8 border-b border-[var(--color-outline-variant)]">
            {/* Row 1: Title + Export buttons */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold text-[var(--color-on-surface)] mb-1">{bank.name}</h2>
                <p className="text-[var(--color-on-surface-variant)] text-sm">
                  {bank.chapter ? `${bank.chapter} · ` : ''}Leaderboard & Peer Review
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => handleExportCSV('standard')}
                  disabled={exportLoading['standard']}
                  className="flex items-center justify-center gap-2 bg-[var(--color-surface-container-high)] hover:bg-[var(--color-surface-bright)] text-[var(--color-on-surface-variant)] px-4 py-2 rounded-xl text-xs font-bold transition-colors w-full disabled:opacity-50"
                >
                  {exportLoading['standard'] ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Standard CSV
                </button>
                {user.role === 'Admin' && (
                  <button
                    onClick={() => handleExportCSV('deep')}
                    disabled={exportLoading['deep']}
                    className="flex items-center justify-center gap-2 bg-[var(--color-brand-primary-container)]/20 hover:bg-[var(--color-brand-primary-container)]/40 text-[var(--color-brand-primary)] border border-[var(--color-brand-primary)]/30 px-4 py-2 rounded-xl text-xs font-bold transition-colors w-full shadow-lg shadow-[var(--color-brand-primary)]/10 disabled:opacity-50"
                  >
                    {exportLoading['deep'] ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Deep Export
                  </button>
                )}
              </div>
            </div>

            {/* Row 2: 4-column stat boxes — PRD Section E */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="bg-[var(--color-surface-container-high)]/60 rounded-2xl p-5 text-center border border-[var(--color-outline-variant)]">
                <p className="text-[10px] text-[var(--color-on-surface-variant)] uppercase tracking-widest font-bold mb-1">
                  Total Runs
                </p>
                <p className="text-3xl font-black text-[var(--color-on-surface)]">{stats.total}</p>
              </div>
              <div className="bg-[var(--color-surface-container-high)]/60 rounded-2xl p-5 text-center border border-[var(--color-outline-variant)]">
                <p className="text-[10px] text-[var(--color-on-surface-variant)] uppercase tracking-widest font-bold mb-1">
                  Group Avg
                </p>
                <p className="text-3xl font-black text-[var(--color-brand-primary)]">{stats.avg}</p>
              </div>
              <div className="bg-[var(--color-surface-container-high)]/60 rounded-2xl p-5 text-center border border-[var(--color-outline-variant)]">
                <p className="text-[10px] text-[var(--color-on-surface-variant)] uppercase tracking-widest font-bold mb-1">
                  Top Score
                </p>
                <p className="text-3xl font-black text-[var(--color-success)]">
                  {leaderboard[0]?.score ?? '–'}/{leaderboard[0]?.total ?? '–'}
                </p>
              </div>
              <div className="bg-[var(--color-surface-container-high)]/60 rounded-2xl p-5 text-center border border-[var(--color-outline-variant)]">
                <p className="text-[10px] text-[var(--color-on-surface-variant)] uppercase tracking-widest font-bold mb-1">
                  Completion
                </p>
                <p className="text-3xl font-black text-[var(--color-warning)]">
                  {stats.total > 0 ? `${Math.round((leaderboard.length / Math.max(stats.total, 1)) * 100)}%` : '–'}
                </p>
              </div>
            </div>

            {/* Row 3: Search bar */}
            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-on-surface-variant)]" />
              <input
                type="text"
                placeholder="Search students by name..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                aria-label="Search students"
                className="w-full bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)] rounded-xl pl-12 pr-4 py-3 text-sm text-[var(--color-on-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)] transition-all"
              />
              {loading && <Loader2 size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-brand-primary)] animate-spin" />}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[var(--color-surface-container-high)]/50 text-[var(--color-on-surface-variant)] text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-bold">Rank</th>
                  <th className="px-6 py-4 font-bold">Student</th>
                  <th className="px-6 py-4 font-bold">Score</th>
                  <th className="px-6 py-4 font-bold">Time</th>
                  <th className="px-6 py-4 font-bold">Date</th>
                  {user.role === 'Admin' && <th className="px-6 py-4 font-bold text-center">Reviewed</th>}
                  <th className="px-6 py-4 font-bold text-center">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-outline-variant)]">
                {leaderboard.map((attempt: any, idx: number) => (
                  <React.Fragment key={attempt.id}>
                    <tr className={`hover:bg-[var(--color-surface-container-high)]/30 transition-colors ${attempt.user_name === user.full_name ? 'bg-[var(--color-brand-primary-container)]/5' : ''} ${attempt.is_reviewed ? 'border-l-2 border-l-[var(--color-success)]/50' : ''}`}>
                      <td className="px-6 py-5">
                        {idx < 3 ? (
                          <span className="text-2xl">{medals[idx]}</span>
                        ) : (
                          <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)]">{idx + 1}</div>
                        )}
                      </td>
                      <td className="px-6 py-5 font-bold text-[var(--color-on-surface)]">
                        <div 
                          className="flex items-center gap-2 cursor-pointer hover:text-[var(--color-brand-primary)] transition-colors"
                          onClick={() => attempt.user_slug && onViewProfile(attempt.user_slug)}
                        >
                          {attempt.user_photo ? (
                            <img src={attempt.user_photo} alt="" className="w-6 h-6 rounded-full object-cover border border-[var(--color-outline-variant)]" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-[var(--color-brand-primary-container)] flex items-center justify-center text-[10px] font-black">
                              {attempt.user_name[0].toUpperCase()}
                            </div>
                          )}
                          {attempt.user_name}
                          {attempt.user_name === user.full_name && <span className="text-[10px] bg-[var(--color-brand-primary-container)] text-white px-2 py-0.5 rounded-full uppercase">You</span>}
                          {attempt.is_anonymous && <span className="text-[10px] bg-[var(--color-brand-primary-container)]/20 text-[var(--color-brand-primary)] border border-[var(--color-brand-primary)]/20 px-2 py-0.5 rounded-full uppercase">Anon</span>}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-lg font-bold text-[var(--color-on-surface)]">{attempt.score}</span>
                        <span className="text-[var(--color-on-surface-variant)]"> / {attempt.total}</span>
                        <div className="text-xs text-[var(--color-on-surface-variant)] mt-0.5">{attempt.total > 0 ? Math.round((attempt.score / attempt.total) * 100) : 0}%</div>
                      </td>
                      <td className="px-6 py-5 text-[var(--color-on-surface-variant)] font-mono">
                        {Math.floor(attempt.time_taken / 60)}m {attempt.time_taken % 60}s
                      </td>
                      <td className="px-6 py-5 text-[var(--color-on-surface-variant)] text-sm">
                        {new Date(attempt.attempted_at).toLocaleDateString()}
                      </td>
                      {/* X: Admin mark as reviewed */}
                      {user.role === 'Admin' && (
                        <td className="px-6 py-5 text-center">
                          <button
                            onClick={() => handleMarkReviewed(attempt.id, attempt.is_reviewed)}
                            disabled={reviewLoading[attempt.id]}
                            aria-label={attempt.is_reviewed ? 'Unmark as reviewed' : 'Mark as reviewed'}
                            className={`p-2 rounded-xl transition-all ${attempt.is_reviewed ? 'bg-[var(--color-success)]/20 text-[var(--color-success)] border border-[var(--color-success)]/30' : 'bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] border border-[var(--color-outline-variant)] hover:text-[var(--color-on-surface-variant)]'}`}
                          >
                            {reviewLoading[attempt.id] ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                          </button>
                        </td>
                      )}
                      <td className="px-6 py-5 text-center">
                        <button
                          onClick={() => setExpandedAttempt(expandedAttempt === idx ? null : idx)}
                          aria-expanded={expandedAttempt === idx}
                          className="text-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)] bg-[var(--color-brand-primary-container)]/10 hover:bg-[var(--color-brand-primary-container)]/20 px-4 py-1.5 rounded-lg text-xs uppercase tracking-widest font-bold transition-colors"
                        >
                          {expandedAttempt === idx ? 'Hide' : 'Review'}
                        </button>
                      </td>
                    </tr>

                    {/* Expanded AI Review Rows */}
                    <AnimatePresence>
                      {expandedAttempt === idx && attempt.descriptive_answers && (
                        <motion.tr
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="bg-[var(--color-surface-dim)]/80"
                        >
                          <td colSpan={user.role === 'Admin' ? 7 : 6} className="px-8 py-8">
                            <div className="space-y-6 max-w-5xl mx-auto">
                              <p className="text-sm font-bold text-[var(--color-on-surface-variant)] border-b border-[var(--color-outline-variant)] pb-4 uppercase tracking-widest">
                                Peer Review Center — <span className="text-[var(--color-on-surface)]">{attempt.user_name}</span>
                              </p>
                              {(attempt.descriptive_answers || []).map((item: any) => {
                                const key = `${attempt.id}-${item.question_id}`;
                                const aiData = aiResponses[key];
                                return (
                                  <div key={item.question_id} className={`p-6 rounded-2xl border ${item.is_correct ? 'bg-[var(--color-success)]/10 border-[var(--color-success)]/20' : 'bg-[var(--color-danger)]/10 border-[var(--color-danger)]/20'}`}>
                                    {/* SECTION F: Inline code rendering in peer review */}
                                    <h4 className="text-base text-[var(--color-on-surface)] mb-4 font-bold leading-relaxed">
                                      {renderQuestionText(item.question_text)}
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                      <div className="bg-[var(--color-surface-container)]/50 p-4 rounded-xl border border-[var(--color-outline-variant)]">
                                        <p className="text-xs text-[var(--color-on-surface-variant)] uppercase tracking-wider font-bold mb-2">Their Answer</p>
                                        <div className={`text-base font-bold ${item.is_correct ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
                                          {renderQuestionText(item.user_answer || 'Skipped')}
                                        </div>
                                      </div>
                                      <div className="bg-[var(--color-surface-container)]/50 p-4 rounded-xl border border-[var(--color-outline-variant)]">
                                        <p className="text-xs text-[var(--color-on-surface-variant)] uppercase tracking-wider font-bold mb-2">Correct Answer</p>
                                        <div className="text-base font-bold text-[var(--color-success)]">
                                          {renderQuestionText(item.correct_answer)}
                                        </div>
                                      </div>
                                    </div>

                                    {item.note && (
                                      <div className="bg-[var(--color-brand-primary-container)]/10 border border-[var(--color-brand-primary)]/20 p-4 rounded-xl mb-4">
                                        <p className="text-xs text-[var(--color-brand-primary)] uppercase tracking-wider font-bold mb-2 flex items-center gap-2"><BookOpen size={14} /> Peer's Notes</p>
                                        <p className="text-sm text-[var(--color-on-surface-variant)] italic">"{item.note}"</p>
                                      </div>
                                    )}

                                    {/* AI Review Section */}
                                    <div className="mt-6 pt-6 border-t border-[var(--color-outline-variant)]/50">
                                      <div className="flex flex-col sm:flex-row gap-3">
                                        <input
                                          type="text"
                                          placeholder="Ask AI about this answer (e.g., 'Why is my logic wrong?')"
                                          className="flex-1 bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] rounded-xl px-4 py-2 text-sm text-[var(--color-on-surface)] focus:ring-2 focus:ring-[var(--color-brand-primary)] focus:outline-none"
                                          value={aiQueries[key] || ''}
                                          onChange={e => setAiQueries(prev => ({ ...prev, [key]: e.target.value }))}
                                          onKeyDown={e => e.key === 'Enter' && handleAskAI(attempt.id, item.question_id)}
                                          aria-label="AI query input"
                                        />
                                        <button
                                          onClick={() => handleAskAI(attempt.id, item.question_id)}
                                          disabled={aiLoading[key]}
                                          aria-label="Ask StudyBuddy AI"
                                          className="bg-[var(--color-brand-primary-container)]/20 hover:bg-[var(--color-brand-primary-container)]/40 text-[var(--color-brand-primary)] border border-[var(--color-brand-primary)]/30 px-6 py-2 rounded-xl text-sm font-bold flex justify-center items-center gap-2 transition-all"
                                        >
                                          {aiLoading[key] ? <Loader2 size={16} className="animate-spin" /> : <BrainCircuit size={16} />}
                                          Ask StudyBuddy AI
                                        </button>
                                      </div>

                                      <AnimatePresence>
                                        {aiData && (
                                          <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className={`mt-4 p-4 rounded-xl border ${
                                              aiData.is_out_of_context
                                                ? 'bg-[var(--color-warning)]/10 border-[var(--color-warning)]/30'
                                                : aiData.from_cache
                                                ? 'bg-[var(--color-surface-container)] border-[var(--color-success)]/20'
                                                : 'bg-[var(--color-surface-container)] border-[var(--color-brand-primary)]/30'
                                            }`}
                                          >
                                            <div className="flex items-center gap-2 mb-2 text-xs uppercase tracking-wider font-bold">
                                              {aiData.is_out_of_context ? (
                                                <><AlertCircle size={14} className="text-[var(--color-warning)]" /><span className="text-[var(--color-warning)]">Out of Context</span></>
                                              ) : (
                                                <><BrainCircuit size={14} className="text-[var(--color-brand-primary)]" />
                                                <span className="text-[var(--color-brand-primary)]">StudyBuddy AI Analysis</span>
                                                {aiData.from_cache && <span className="text-[var(--color-success)] ml-2">(Cached)</span>}</>
                                              )}
                                            </div>
                                            {aiData.is_out_of_context ? (
                                              <p className="text-sm text-[var(--color-warning)]/80">This question is outside the context of the quiz question. Please ask something related to the quiz topic.</p>
                                            ) : (
                                              <p className="text-sm text-[var(--color-on-surface-variant)] leading-relaxed whitespace-pre-wrap">{aiData.response}</p>
                                            )}
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        </motion.tr>
                      )}
                    </AnimatePresence>
                  </React.Fragment>
                ))}
                {leaderboard.length === 0 && (
                  <tr><td colSpan={7} className="px-8 py-20 text-center text-[var(--color-on-surface-variant)]">
                    {searchQuery ? `No students found matching "${searchQuery}."` : "No attempts yet. Be the first to take this quiz!"}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
