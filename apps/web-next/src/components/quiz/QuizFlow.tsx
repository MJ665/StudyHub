import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import QuestionCard from './cards/QuestionCard';
import { 
  ChevronRight, 
  ChevronLeft, 
  Timer, 
  CheckCircle2, 
  AlertTriangle, 
  MessageSquare, 
  X, 
  Bookmark, 
  Save, 
  Info,
  LogOut,
  ChevronUp
} from 'lucide-react';
import { RichText } from '../common/RichText';
import CodeEditor from './CodeEditor';
import ApiService from '../../services/ApiService';
import QuestionDiscussions from './QuestionDiscussions';

const BEEP_WARNING_SECONDS = 5;

// Utility: play a short warning beep
function playBeep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.type = 'square';
    oscillator.frequency.value = 880;
    gainNode.gain.value = 0.3;
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.15);
  } catch (e) { /* ignore */ }
}

import { ConfirmationModal } from '../ui/ConfirmationModal';

export default function QuizFlow({ bank, questions: rawQuestions, onFinish, onCancel, user }: any) {
  // Bank-level "shuffle answer options": randomize each question's option order
  // once per attempt (stable across renders via useMemo). Answers are compared
  // by text, so grading is unaffected. Question order is untouched here.
  const questions = React.useMemo(() => {
    if (!bank?.shuffle_options) return rawQuestions;
    return (rawQuestions || []).map((q: any) => {
      if (!Array.isArray(q.options) || q.options.length < 2) return q;
      const opts = [...q.options];
      for (let i = opts.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [opts[i], opts[j]] = [opts[j], opts[i]];
      }
      return { ...q, options: opts };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawQuestions, bank?.shuffle_options]);
  const DRAFT_KEY = `quiz_draft_${bank.id}_${user?.id || 'anon'}`;
  
  const loadDraft = () => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return { answers: {}, notes: {}, currentIdx: 0, bookmarks: [] };
  };

  const initialDraft = loadDraft();
  const [currentIdx, setCurrentIdx] = useState(initialDraft.currentIdx || 0);
  const [answers, setAnswers] = useState<Record<number, string | string[]>>(initialDraft.answers || {});
  const [notes, setNotes] = useState<Record<number, string>>(initialDraft.notes || {});
  const [timeLeft, setTimeLeft] = useState(bank.time_per_question);
  const [quizStartTime] = useState<number>(Date.now());
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [direction, setDirection] = useState(1);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showDiscussions, setShowDiscussions] = useState(false);
  const [bookmarks, setBookmarks] = useState<number[]>(initialDraft.bookmarks || []); // Now question IDs
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  
  // Report State
  const [reportReason, setReportReason] = useState('typo');
  const [reportComment, setReportComment] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);

  // Modal State
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [navOpen, setNavOpen] = useState(false); // mobile question-navigator sheet

  const currentQ = questions[currentIdx];
  const answeredCount = Object.keys(answers).length;

  // Sync bookmark status when question changes
  useEffect(() => {
    if (currentQ) {
      ApiService.getBookmarkStatus(currentQ.id)
        .then(res => setIsBookmarked(res.is_bookmarked))
        .catch(() => setIsBookmarked(bookmarks.includes(currentQ.id)));
    }
  }, [currentIdx, currentQ]);

  // Auto-save draft
  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ answers, notes, currentIdx, bookmarks }));
    setLastSaved(Date.now());
  }, [answers, notes, currentIdx, bookmarks, DRAFT_KEY]);

  // Timer Logic
  useEffect(() => {
    let timer: any;
    if (bank.show_timer && timeLeft > 0) {
      if (timeLeft === BEEP_WARNING_SECONDS) playBeep();
      timer = setInterval(() => setTimeLeft((prev: number) => prev - 1), 1000);
    } else if (timeLeft === 0 && bank.show_timer) {
      handleNext();
    }
    return () => clearInterval(timer);
  }, [timeLeft, bank.show_timer, currentIdx]);

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setDirection(1);
      setCurrentIdx((prev: number) => prev + 1);
      setTimeLeft(bank.time_per_question);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const unanswered = questions.filter((_: any, i: number) => {
        const a = answers[i];
        return a === undefined || a === '' || (Array.isArray(a) && a.length === 0);
      }).length;
      if (unanswered > 0) setConfirmSubmit(true);
      else finishQuiz();
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      setDirection(-1);
      setCurrentIdx((prev: number) => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const finishQuiz = async () => {
    setIsSubmitting(true);
    const timeTaken = Math.floor((Date.now() - quizStartTime) / 1000);
    localStorage.removeItem(DRAFT_KEY);
    try {
      const question_ids = questions.map((q: any) => q.id);
      // Multi-select answers are encoded as a JSON-array string so user_answers
      // stays List[str]; the backend decodes them before grading.
      const user_answers = questions.map((_: any, i: number) => {
        const a = answers[i];
        return Array.isArray(a) ? JSON.stringify(a) : (a || "");
      });
      const user_notes = questions.map((_: any, i: number) => notes[i] || "");

      const submitResult = await ApiService.submitAttempt({
        bank_id: bank.id,
        user_name: user?.full_name || "Anonymous",
        time_taken: timeTaken,
        question_ids,
        user_answers,
        user_notes,
        is_anonymous: isAnonymous
      });
      onFinish({ timeTaken, answers, notes, isAnonymous, submitResult });
    } catch (err: any) {
      console.error("Failed to submit attempt:", err);
      alert(`Submission failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitReport = async () => {
    if (!currentQ) return;
    setReportSubmitting(true);
    try {
      await ApiService.reportQuestion(currentQ.id, {
        issue_type: reportReason,
        description: reportComment
      });
      setShowReportModal(false);
      setReportComment('');
      // Using a custom modal or simple alert for now as per user preference if not specified
      alert('Thank you. Your report has been submitted for review.');
    } catch (err) {
      alert('Failed to submit report.');
    } finally {
      setReportSubmitting(false);
    }
  };

  const toggleBookmark = async () => {
    if (!currentQ) return;
    try {
      const res = await ApiService.toggleBookmark(currentQ.id);
      setIsBookmarked(res.is_bookmarked);
      if (res.is_bookmarked) {
        setBookmarks(prev => prev.includes(currentQ.id) ? prev : [...prev, currentQ.id]);
      } else {
        setBookmarks(prev => prev.filter(id => id !== currentQ.id));
      }
    } catch (err) {
      console.error("Bookmark toggle failed", err);
    }
  };

  if (!currentQ) return null;

  return (
    <div className="min-h-screen bg-[var(--color-surface-dim)] text-[var(--color-on-surface)] flex flex-col">
      <ConfirmationModal 
        isOpen={confirmLeave} 
        title="Protocol Termination?" 
        message="Your current progress is cached as a draft, but leaving now will pause the active assessment timer. Proceed?"
        confirmText="Leave Assessment"
        onConfirm={onCancel}
        onCancel={() => setConfirmLeave(false)}
        type="danger"
      />

      <ConfirmationModal 
        isOpen={confirmSubmit} 
        title="Incomplete Submission" 
        message={`You have ${questions.length - answeredCount} unanswered sectors. Do you wish to finalize your submission?`}
        confirmText="Finalize Submission"
        onConfirm={finishQuiz}
        onCancel={() => setConfirmSubmit(false)}
      />

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-[var(--color-surface-container-high)]">
        <motion.div 
          initial={{ width: 0 }} 
          animate={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }} 
          className="h-full bg-gradient-brand"
        />
      </div>

      {/* MOBILE: question navigator trigger (desktop uses the left sidebar) */}
      <div className="lg:hidden flex items-center justify-between px-4 py-2 border-b border-[var(--color-outline-variant)] bg-[var(--color-surface-container)]">
        <span className="text-xs font-bold text-[var(--color-on-surface-variant)]">Question {currentIdx + 1} of {questions.length}</span>
        <button
          onClick={() => setNavOpen(true)}
          className="text-xs font-black text-brand-primary flex items-center gap-1"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>grid_view</span>
          Jump ({answeredCount}/{questions.length})
        </button>
      </div>

      {/* MOBILE: question navigator sheet */}
      {navOpen && (
        <div className="lg:hidden fixed inset-0 z-[70]" onClick={() => setNavOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="absolute bottom-0 inset-x-0 max-h-[70vh] overflow-y-auto rounded-t-3xl bg-[var(--color-surface-container-low)] border-t border-[var(--color-surface-bright)] p-4 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-[var(--color-surface-container-high)] rounded-full mx-auto mb-4" />
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--color-on-surface-variant)]">Navigator</h3>
              <span className="text-[10px] font-black text-brand-primary">{answeredCount}/{questions.length}</span>
            </div>
            <div className="grid grid-cols-6 gap-2.5">
              {questions.map((_: any, i: number) => (
                <button
                  key={i}
                  onClick={() => { setDirection(i > currentIdx ? 1 : -1); setCurrentIdx(i); setNavOpen(false); }}
                  className={`h-11 rounded-xl text-[10px] font-black transition-all flex items-center justify-center relative border ${
                    i === currentIdx
                      ? 'bg-brand-primary border-brand-primary text-[var(--color-surface-dim)] shadow-lg z-10'
                      : answers[i]
                        ? 'bg-brand-primary/5 border-brand-primary/20 text-brand-primary'
                        : 'bg-[var(--color-surface-dim)] border-[var(--color-outline-variant)] text-[var(--color-on-surface-variant)]'
                  }`}
                >
                  {i + 1}
                  {bookmarks.includes(questions[i]?.id) && (
                    <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[var(--color-warning)] rounded-full border-2 border-[var(--color-surface-container-low)]" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto w-full px-4 md:px-6 py-6 md:py-10 flex-1 flex gap-8">
        {/* LEFT SIDEBAR: Question Navigation */}
        <aside className="hidden lg:flex flex-col w-72 shrink-0 gap-6">
          <div className="bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] rounded-[2.5rem] p-8 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-brand-primary animate-pulse" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--color-on-surface-variant)]">Navigator</h3>
              </div>
              <span className="text-[10px] font-black text-brand-primary">{answeredCount}/{questions.length}</span>
            </div>

            <div className="grid grid-cols-4 gap-3 overflow-y-auto max-h-[50vh] pr-2 custom-scrollbar">
              {questions.map((_: any, i: number) => (
                <button
                  key={i}
                  onClick={() => { setDirection(i > currentIdx ? 1 : -1); setCurrentIdx(i); }}
                  className={`
                    h-12 rounded-xl text-[10px] font-black transition-all flex items-center justify-center relative border
                    ${i === currentIdx 
                      ? 'bg-brand-primary border-brand-primary text-[var(--color-on-surface-variant)] shadow-xl shadow-brand-primary/20 scale-110 z-10' 
                      : answers[i] 
                        ? 'bg-brand-primary/5 border-brand-primary/20 text-brand-primary' 
                        : 'bg-[var(--color-surface-dim)] border-[var(--color-outline-variant)] text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-high)]'}
                  `}
                >
                  {i + 1}
                  {bookmarks.includes(questions[i]?.id) && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-[var(--color-warning)] rounded-full border-2 border-[var(--color-outline-variant)]" />
                  )}
                </button>
              ))}
            </div>

            <div className="mt-auto pt-8 border-t border-[var(--color-outline-variant)] space-y-4">
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                <span>Completion Status</span>
                <span>{Math.round((answeredCount / questions.length) * 100)}%</span>
              </div>
              <div className="h-1.5 bg-[var(--color-surface-dim)] rounded-full overflow-hidden">
                <motion.div animate={{ width: `${(answeredCount / questions.length) * 100}%` }} className="h-full bg-brand-primary" />
              </div>
            </div>
          </div>

          <div className="bg-[var(--color-surface-container)]/40 border border-[var(--color-outline-variant)] p-6 rounded-[2rem] flex flex-col gap-4">
             <div className="flex items-center gap-3 text-[var(--color-on-surface-variant)]">
                <Info size={16} />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Operational Guide</span>
             </div>
             <p className="text-[11px] leading-relaxed text-[var(--color-on-surface-variant)] font-bold">
                Telemetry is synchronized in real-time. You can terminate the session and resume from any station.
             </p>
             <button onClick={() => setConfirmLeave(true)} className="mt-4 flex items-center justify-center gap-2 py-3 bg-[var(--color-surface-container-high)] hover:bg-[var(--color-danger)]/10 text-[var(--color-on-surface-variant)] hover:text-[var(--color-danger)] rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
               <LogOut size={14} /> Terminate Protocol
             </button>
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 flex flex-col">
          <div className="flex items-center justify-between gap-4 flex-wrap mb-6 md:mb-10">
            <div>
              <div className="flex items-center gap-2 text-brand-primary mb-1">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em]">Data Sector {currentIdx + 1}</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-[var(--color-on-surface)]">Assessment Query</h2>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
              {bank.show_timer && (
                <div className={`flex items-center gap-4 px-6 py-3 rounded-2xl border transition-all ${
                  timeLeft <= 10 ? 'bg-[var(--color-danger)]/10 border-[var(--color-danger)]/50 text-[var(--color-danger)] animate-pulse' : 'bg-[var(--color-surface-container)] border-[var(--color-outline-variant)] text-brand-primary'
                }`}>
                  <Timer size={20} />
                  <span className="text-xl font-black font-mono">
                    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              )}
              
              <div className="flex items-center gap-2 p-1 bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] rounded-2xl">
                 <button onClick={toggleBookmark} className={`p-3 rounded-xl transition-all ${isBookmarked ? 'bg-[var(--color-warning)]/10 text-[var(--color-warning)]' : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]'}`}>
                   <Bookmark size={20} fill={isBookmarked ? "currentColor" : "none"} />
                 </button>
                 <button onClick={() => setShowDiscussions(true)} className="p-3 rounded-xl text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] transition-all">
                   <MessageSquare size={20} />
                 </button>
                 <button onClick={() => setShowReportModal(true)} className="p-3 rounded-xl text-[var(--color-on-surface-variant)] hover:text-[var(--color-danger)] transition-all">
                   <AlertTriangle size={20} />
                 </button>
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentIdx}
              initial={{ x: direction * 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: direction * -50, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] rounded-3xl md:rounded-[3rem] p-5 md:p-12 shadow-2xl flex-1 flex flex-col"
            >
              <div className="text-lg md:text-xl font-bold text-[var(--color-on-surface)] leading-relaxed mb-6 md:mb-12 break-words overflow-x-auto">
                <RichText text={currentQ.question} />
              </div>

              {currentQ.has_code ? (
                <div className="flex-1 min-h-[400px]">
                  <CodeEditor 
                    question={currentQ} 
                    onFinish={(res: any) => {
                      setAnswers({ ...answers, [currentIdx]: "COMPLETED" });
                      handleNext();
                    }} 
                  />
                </div>
              ) : ['mcq_multi', 'true_false', 'short_answer', 'essay'].includes(currentQ.question_type) ? (
                <QuestionCard
                  q={currentQ}
                  index={currentIdx}
                  value={answers[currentIdx] ?? (currentQ.question_type === 'mcq_multi' ? [] : '')}
                  onChange={(v) => setAnswers({ ...answers, [currentIdx]: v })}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentQ.options.map((opt: string, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => setAnswers({ ...answers, [currentIdx]: opt })}
                      className={`p-4 md:p-6 rounded-3xl border-2 text-left transition-all flex items-center gap-4 md:gap-6 group ${
                        answers[currentIdx] === opt
                          ? 'bg-brand-primary/10 border-brand-primary text-[var(--color-on-surface)]'
                          : 'bg-[var(--color-surface-dim)] border-[var(--color-outline-variant)] text-[var(--color-on-surface-variant)] hover:border-[var(--color-outline-variant)] hover:bg-[var(--color-surface-container-high)]'
                      }`}
                    >
                      <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center font-black text-sm transition-all ${
                        answers[currentIdx] === opt ? 'bg-brand-primary text-[var(--color-surface-dim)]' : 'bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)] group-hover:text-[var(--color-on-surface)]'
                      }`}>
                        {String.fromCharCode(65 + idx)}
                      </div>
                      <span className="font-bold min-w-0 break-words">{opt}</span>
                    </button>
                  ))}
                </div>
              )}

              {bank.allow_descriptive && (
                <div className="mt-12">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-on-surface-variant)]">Reasoning Artifact</label>
                    <span className="text-[10px] font-black text-[var(--color-on-surface-variant)]">{notes[currentIdx]?.length || 0}/1000</span>
                  </div>
                  <textarea 
                    value={notes[currentIdx] || ''}
                    onChange={(e) => setNotes({...notes, [currentIdx]: e.target.value})}
                    placeholder="Describe your logical deduction for peer validation..."
                    className="w-full bg-[var(--color-surface-dim)] border border-[var(--color-outline-variant)] rounded-2xl p-6 text-sm text-[var(--color-on-surface)] outline-none focus:ring-1 focus:ring-brand-primary/50 transition-all resize-none h-32"
                  />
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="flex justify-between items-center mt-10">
            <button
              onClick={handlePrev}
              disabled={currentIdx === 0}
              className="flex items-center gap-3 px-8 py-4 bg-[var(--color-surface-container-high)] hover:bg-[var(--color-surface-bright)] text-[var(--color-on-surface)] rounded-2xl font-black uppercase tracking-widest text-[10px] disabled:opacity-0 transition-all"
            >
              <ChevronLeft size={16} /> Back Sector
            </button>
            <button
              onClick={handleNext}
              disabled={isSubmitting}
              className={`flex items-center gap-3 px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-xl ${
                currentIdx === questions.length - 1 
                  ? 'bg-[var(--color-success)] hover:bg-[var(--color-success)] text-[var(--color-surface-dim)] shadow-[var(--color-success)]/20' 
                  : 'bg-brand-primary hover:bg-brand-primary/90 text-[var(--color-surface-dim)] shadow-brand-primary/20'
              }`}
            >
              {currentIdx === questions.length - 1 ? 'Finalize Protocol' : 'Advance Sector'}
              <ChevronRight size={16} />
            </button>
          </div>
        </main>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showDiscussions && currentQ && (
          <QuestionDiscussions questionId={currentQ.id} onClose={() => setShowDiscussions(false)} />
        )}
        {showReportModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowReportModal(false)} className="absolute inset-0 bg-[var(--color-surface-dim)]/80 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] p-10 rounded-[3rem] max-w-lg w-full shadow-2xl">
              <h3 className="text-2xl font-black text-[var(--color-on-surface)] mb-6">Report Telemetry Anomaly</h3>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-3">
                  {['wrong_answer', 'typo', 'unclear', 'duplicate', 'other'].map(r => (
                    <button key={r} onClick={() => setReportReason(r)} className={`p-4 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all ${reportReason === r ? 'bg-[var(--color-danger)]/20 border-[var(--color-danger)] text-[var(--color-danger)]' : 'bg-[var(--color-surface-dim)] border-[var(--color-outline-variant)] text-[var(--color-on-surface-variant)]'}`}>
                      {r.replace('_', ' ')}
                    </button>
                  ))}
                </div>
                <textarea value={reportComment} onChange={e => setReportComment(e.target.value)} className="w-full bg-[var(--color-surface-dim)] border border-[var(--color-outline-variant)] rounded-2xl p-6 text-[var(--color-on-surface)] text-sm outline-none h-32 resize-none" placeholder="Describe the anomaly..." />
                <button onClick={submitReport} disabled={reportSubmitting} className="w-full py-5 bg-[var(--color-danger)] text-[var(--color-on-surface)] rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-[var(--color-danger)]/20">
                  {reportSubmitting ? 'Syncing...' : 'Submit Report'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
