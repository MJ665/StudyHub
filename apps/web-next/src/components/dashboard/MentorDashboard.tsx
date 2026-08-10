import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  ChevronRight, 
  MessageSquare, 
  CheckCircle2, 
  Clock, 
  Search, 
  Filter,
  TrendingUp,
  Award,
  BookOpen,
  PieChart as PieChartIcon,
  UserCheck,
  Plus,
  Code,
  Code2,
  Trophy,
  X,
  Loader2,
  Sparkles,
  Brain,
  RefreshCw,
  LayoutDashboard
} from 'lucide-react';
import ApiService, { AIResponseEnvelope } from '../../services/ApiService';
import { useToast } from '../ui/Toast';
import AssignmentCreationModal from './AssignmentCreationModal';
import CodingQuestionModal from './CodingQuestionModal';
import BankCreationModal from './BankCreationModal';
import UserIntelPanel from './UserIntelPanel';
import MemberAssignmentHistory from '../mentor/MemberAssignmentHistory';
import MentorOverviewTab from './mentor/MentorOverviewTab';
import MentorStudentsTab from './mentor/MentorStudentsTab';

export default function MentorDashboard({ 
  user, 
  onBack,
  onViewPremium
}: { 
  user: any, 
  onBack: () => void,
  onViewPremium?: (slugOrId: string | number) => void
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [groupStats, setGroupStats] = useState<any>(null);
  const [mentorStats, setMentorStats] = useState<any>(null);
  const [recentAttempts, setRecentAttempts] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [showCodingModal, setShowCodingModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [showAtlasModal, setShowAtlasModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [activeMainTab, setActiveMainTab] = useState<'DASHBOARD' | 'STUDENTS'>('DASHBOARD');
  const [courses, setCourses] = useState<any[]>([]);
  const [showReviewModal, setShowReviewModal] = useState<any>(null); // { id, type, user_name, score, total }
  const [groupAiSummary, setGroupAiSummary] = useState<string>('');
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [selectedStudentHistory, setSelectedStudentHistory] = useState<any>(null);
  const [ktInbox, setKtInbox] = useState<any[]>([]); // KT docs awaiting my review

  useEffect(() => {
    fetchGroups();
    fetchPendingReviews();
  }, []);

  useEffect(() => {
    if (selectedGroupId) {
      fetchGroupDetails(selectedGroupId);
    }
  }, [selectedGroupId]);

  const fetchPendingReviews = async () => {
    try {
      // Unified inbox (Phase 6): assessment reviews + KT docs in one call.
      const inbox = await ApiService.getUnifiedMentorInbox();
      setRecentAttempts(inbox.assessment || []);
      setKtInbox(inbox.kt_documents || []);
    } catch {
      // Fallback to the assessment-only queue if the inbox is unavailable.
      try {
        const pending = await ApiService.getPendingReviews();
        setRecentAttempts(pending);
      } catch (err) {
        console.error('Failed to fetch pending reviews', err);
      }
    }
  };

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const mentorGroups = await ApiService.getMentorGroups();
      setGroups(mentorGroups);
      if (mentorGroups.length > 0) setSelectedGroupId(mentorGroups[0].id);
      
      // Fetch courses for modals
      const coursesRes = await ApiService.getCourses(user.group_id);
      setCourses(coursesRes);
    } catch (err: any) {
      toast('error', `Failed to load mentor groups: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroupDetails = async (id: number, force: boolean = false) => {
    try {
      // Get health stats for participation/accuracy
      const health = await ApiService.getGroupHealth(id);
      setGroupStats(health);
      
      // Get mentor-specific analytics (performers, velocity, topics)
      const stats = await ApiService.getGroupStats(id);
      setMentorStats(stats);

      // Get students
      const studentList = await ApiService.getGroupStudents(id);
      setStudents(studentList);

      // Get AI Summary
      setLoadingSummary(true);
      try {
        const summaryRes = await ApiService.getGroupAiSummary(id, force) as AIResponseEnvelope;
        setGroupAiSummary(summaryRes.data?.summary || (summaryRes as any).summary);
      } catch (e) {
        setGroupAiSummary('AI analysis unavailable for this group.');
      } finally {
        setLoadingSummary(false);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  if (loading && groups.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-primary"></div>
      </div>
    );
  }

  // Context handed to the extracted tab components (5b decomposition).
  const mentorCtx = { loading, groups, selectedGroupId, setSelectedGroupId, groupStats,
    mentorStats, recentAttempts, students, searchQuery, setSearchQuery,
    showAssignmentModal, setShowAssignmentModal, showCodingModal,
    setShowCodingModal, showBankModal, setShowBankModal, showAtlasModal,
    setShowAtlasModal, selectedStudent, setSelectedStudent, activeMainTab,
    setActiveMainTab, courses, showReviewModal, setShowReviewModal,
    groupAiSummary, loadingSummary, selectedStudentHistory,
    setSelectedStudentHistory, ktInbox, fetchPendingReviews, fetchGroups,
    fetchGroupDetails, user, onBack, onViewPremium, toast };

  return (
    <div className="flex-1 overflow-y-auto px-8 py-10">
      <header className="mb-10 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-[var(--color-brand-primary)] mb-2">
            <UserCheck size={20} />
            <span className="font-black uppercase tracking-[0.2em] text-xs">Mentor Command Center</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-[var(--color-on-surface)]">Mentorship Hub</h1>
        </div>
        
        <div className="flex gap-4">
          <button 
            onClick={() => setShowBankModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] rounded-2xl font-black border border-[var(--color-outline-variant)] hover:bg-[var(--color-surface-bright)] transition-all"
          >
            <BookOpen size={18} />
            <span>New Bank</span>
          </button>

          <button 
            onClick={() => setShowCodingModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-[var(--color-brand-primary-container)]/10 text-[var(--color-brand-primary)] rounded-2xl font-black border border-[var(--color-brand-primary)]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Code size={18} />
            <span>New Coding Lab</span>
          </button>
          
          <button 
            onClick={() => setShowAssignmentModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-brand-primary text-surface-dim rounded-2xl font-black shadow-xl shadow-brand-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Plus size={18} />
            <span>New Assignment</span>
          </button>
          
          {onBack && (
            <button 
              onClick={onBack}
              className="flex items-center gap-2 px-6 py-3 bg-[var(--color-surface-container-high)] hover:bg-[var(--color-surface-bright)] text-[var(--color-on-surface-variant)] rounded-2xl font-bold transition-all border border-[var(--color-outline-variant)] active:scale-95"
            >
              <BookOpen size={18} />
              <span>Exit Mentor Mode</span>
            </button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* ─── Assigned Groups Sidebar ──────────────────────── */}
        <div className="lg:col-span-1 space-y-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-on-surface-variant)] mb-2">My Assigned Groups</p>
          {groups.map(group => (
            <button
              key={group.id}
              onClick={() => setSelectedGroupId(group.id)}
              className={`w-full p-4 rounded-2xl border text-left transition-all ${
                selectedGroupId === group.id 
                  ? 'bg-[var(--color-brand-primary-container)] border-[var(--color-brand-primary)] text-[var(--color-on-surface)] shadow-lg shadow-[var(--color-brand-primary)]/20' 
                  : 'bg-surface-container border-surface-bright text-[var(--color-on-surface-variant)] hover:border-[var(--color-brand-primary)]/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold">{group.name}</span>
                <ChevronRight size={16} className={selectedGroupId === group.id ? 'opacity-100' : 'opacity-0'} />
              </div>
              <p className={`text-[10px] uppercase font-black tracking-widest mt-1 ${selectedGroupId === group.id ? 'text-[var(--color-brand-primary)]' : 'text-[var(--color-on-surface-variant)]'}`}>
                {group.batch_name || 'Active Batch'}
              </p>
            </button>
          ))}
          
          <div className="mt-8 p-6 bg-surface-container rounded-3xl border border-surface-bright">
             <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[var(--color-warning)]/10 flex items-center justify-center text-[var(--color-warning)]">
                  <Award size={20} />
                </div>
                <p className="text-sm font-black text-[var(--color-on-surface)]">Top Performers</p>
             </div>
             <div className="space-y-4">
                {(mentorStats?.top_performers || []).map((p: any) => (
                  <div key={p.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <div className="w-6 h-6 rounded-full bg-[var(--color-surface-container-high)] flex items-center justify-center text-[10px] font-bold text-[var(--color-on-surface-variant)]">{p.name.charAt(0)}</div>
                       <span className="text-xs text-[var(--color-on-surface-variant)] font-medium">{p.name}</span>
                    </div>
                    <span className="text-xs font-black text-[var(--color-success)]">{p.score}</span>
                  </div>
                ))}
                {(!mentorStats?.top_performers || mentorStats.top_performers.length === 0) && (
                  <p className="text-[10px] text-[var(--color-on-surface-variant)] italic">No data yet</p>
                )}
             </div>
          </div>
        </div>

        {/* ─── Main Content Panel ──────────────────────────── */}
        <div className="lg:col-span-3 space-y-6">
            <div className="flex gap-1 p-1 bg-surface-container rounded-2xl border border-surface-bright w-fit mb-4">
               <button 
                 onClick={() => setActiveMainTab('DASHBOARD')}
                 className={`px-6 py-2.5 rounded-xl font-black text-xs transition-all ${activeMainTab === 'DASHBOARD' ? 'bg-[var(--color-surface-container)] text-[var(--color-brand-primary)] border border-[var(--color-outline-variant)] shadow-xl' : 'text-[var(--color-on-surface-variant)]'}`}
               >DASHBOARD</button>
               <button 
                 onClick={() => setActiveMainTab('STUDENTS')}
                 className={`px-6 py-2.5 rounded-xl font-black text-xs transition-all ${activeMainTab === 'STUDENTS' ? 'bg-[var(--color-surface-container)] text-[var(--color-brand-primary)] border border-[var(--color-outline-variant)] shadow-xl' : 'text-[var(--color-on-surface-variant)]'}`}
               >STUDENTS</button>
            </div>

            {/* AI Group Insight Banner */}
            <div className="bg-gradient-to-br from-[var(--color-brand-primary-container)]/60 via-[var(--color-surface-container)]/60 to-[var(--color-surface-dim)]/40 p-10 rounded-[3rem] border border-[var(--color-outline-variant)] relative overflow-hidden mb-8 shadow-2xl group">
               <div className="absolute -top-10 -right-10 w-64 h-64 bg-[var(--color-brand-primary-container)]/10 blur-[80px] pointer-events-none group-hover:bg-[var(--color-brand-primary-container)]/20 transition-all duration-1000" />
               <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3 text-[var(--color-brand-primary)]">
                    <Brain className="animate-pulse" size={24} />
                    <span className="text-[11px] font-black uppercase tracking-[0.4em]">Pedagogical Intelligence Pulse</span>
                  </div>
                  <button 
                    disabled={loadingSummary}
                    onClick={() => selectedGroupId && fetchGroupDetails(selectedGroupId, true)}
                    className="p-3 bg-[var(--color-surface-container-high)] hover:bg-[var(--color-surface-bright)] text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] rounded-2xl border border-[var(--color-outline-variant)] transition-all disabled:opacity-30 active:scale-95"
                    title="Recalibrate AI Vectors"
                  >
                    <RefreshCw size={18} className={loadingSummary ? 'animate-spin' : ''} />
                  </button>
               </div>
               
               {loadingSummary ? (
                 <div className="space-y-4">
                    <div className="h-4 bg-[var(--color-surface-container-high)] rounded-full w-3/4 animate-pulse" />
                    <div className="h-4 bg-[var(--color-surface-container-high)] rounded-full w-full animate-pulse" />
                    <div className="h-4 bg-[var(--color-surface-container-high)] rounded-full w-1/2 animate-pulse" />
                    <p className="text-[var(--color-on-surface-variant)] text-[10px] font-black uppercase tracking-widest mt-6 flex items-center gap-2">
                       <Loader2 size={12} className="animate-spin" /> Analyzing Group Performance Vectors...
                    </p>
                 </div>
               ) : (
                 <div className="relative z-10">
                    <p className="text-xl font-medium text-[var(--color-on-surface)] leading-relaxed max-w-4xl italic mb-6">
                       "{groupAiSummary || 'Direct pedagogical intervention markers will appear here after student activity is detected.'}"
                    </p>
                    <div className="flex flex-wrap gap-4">
                       <div className="px-4 py-2 bg-[var(--color-brand-primary-container)]/10 border border-[var(--color-brand-primary)]/20 rounded-xl flex items-center gap-2">
                          <Sparkles size={14} className="text-[var(--color-brand-primary)]" />
                          <span className="text-[10px] font-black text-[var(--color-brand-primary)] uppercase tracking-widest">AI Synthesis Active</span>
                       </div>
                       <div className="px-4 py-2 bg-[var(--color-success)]/10 border border-[var(--color-success)]/20 rounded-xl flex items-center gap-2">
                          <TrendingUp size={14} className="text-[var(--color-success)]" />
                          <span className="text-[10px] font-black text-[var(--color-success)] uppercase tracking-widest">Growth Vectors Mapped</span>
                       </div>
                    </div>
                 </div>
               )}
            </div>

            {activeMainTab === 'DASHBOARD' && <MentorOverviewTab ctx={mentorCtx} />}

            {activeMainTab === 'STUDENTS' && <MentorStudentsTab ctx={mentorCtx} />}
         </div>
      </div>

      <AnimatePresence>
        {showAtlasModal && selectedStudent && (
          <UserIntelPanel 
            userId={selectedStudent.id}
            onClose={() => setShowAtlasModal(false)}
            onViewPremium={onViewPremium}
          />
        )}
        {showAssignmentModal && (
          <AssignmentCreationModal 
            user={user}
            onClose={() => setShowAssignmentModal(false)}
            onCreated={() => {
              setShowAssignmentModal(false);
              fetchGroups();
            }}
          />
        )}
        {showCodingModal && (
          <CodingQuestionModal 
            user={user}
            courses={courses}
            onClose={() => setShowCodingModal(false)}
            onCreated={() => {
              setShowCodingModal(false);
            }}
          />
        )}
        {showBankModal && (
          <BankCreationModal 
            user={user}
            courses={courses}
            onClose={() => setShowBankModal(false)}
            onCreated={() => {
              setShowBankModal(false);
              fetchGroups();
            }}
          />
        )}
        {showReviewModal && (
          <ReviewModal 
            attempt={showReviewModal}
            onClose={() => setShowReviewModal(null)}
            onReviewed={() => {
              setShowReviewModal(null);
              fetchPendingReviews();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ReviewModal({ attempt, onClose, onReviewed }: { attempt: any, onClose: () => void, onReviewed: () => void }) {
  const { toast } = useToast();
  const [comment, setComment] = useState('');
  const [overrideScore, setOverrideScore] = useState(attempt.score);
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async () => {
    setProcessing(true);
    try {
      await ApiService.reviewAttempt({
        attempt_id: attempt.id,
        attempt_type: attempt.type,
        mentor_comment: comment,
        override_score: overrideScore !== attempt.score ? overrideScore : undefined,
        is_reviewed: true
      });
      toast('success', 'Artifact recalibrated and archived.');
      onReviewed();
    } catch (err: any) {
      toast('error', err.message || 'Failed to submit review');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[var(--color-surface-dim)]/80 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
        className="w-full max-w-3xl bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] rounded-[3rem] shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh]"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[var(--color-brand-primary-container)] to-brand-primary" />
        
        <header className="p-8 pb-4 flex justify-between items-center shrink-0">
           <div>
              <h3 className="text-2xl font-black text-[var(--color-on-surface)]">Manual Recalibration</h3>
              <p className="text-[10px] text-[var(--color-brand-primary)] font-black uppercase tracking-[0.3em] mt-1">{attempt.type} Review / {attempt.user_name}</p>
           </div>
           <button onClick={onClose} className="p-3 bg-[var(--color-surface-container-high)] hover:bg-[var(--color-surface-bright)] rounded-2xl transition-all">
              <X size={20} className="text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]" />
           </button>
        </header>

        <div className="flex-1 overflow-y-auto p-8 pt-4 space-y-8 scrollbar-thin scrollbar-thumb-white/10">
          {/* Submission Details */}
          <div className="space-y-6">
            {attempt.type === 'coding' ? (
              <div className="space-y-4">
                <div className="bg-[var(--color-surface-dim)]/50 rounded-3xl border border-[var(--color-outline-variant)] overflow-hidden">
                  <div className="px-6 py-3 bg-[var(--color-surface-container-high)] border-b border-[var(--color-outline-variant)] flex items-center justify-between">
                    <span className="text-[10px] font-black text-[var(--color-on-surface-variant)] uppercase tracking-widest">Source Code Submission ({attempt.language})</span>
                    <Code2 size={14} className="text-[var(--color-brand-primary)]" />
                  </div>
                  <pre className="p-6 text-xs font-mono text-[var(--color-brand-primary)] overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-96">
                    {attempt.submitted_code}
                  </pre>
                </div>

                {attempt.ai_feedback && (
                  <div className="bg-[var(--color-brand-primary-container)]/5 rounded-3xl border border-[var(--color-brand-primary)]/10 p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles size={16} className="text-[var(--color-brand-primary)]" />
                      <span className="text-[10px] font-black text-[var(--color-brand-primary)] uppercase tracking-widest">AI Pedagogical Analysis</span>
                    </div>
                    <p className="text-sm text-[var(--color-on-surface-variant)] leading-relaxed italic">
                      {attempt.ai_feedback}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <span className="text-[10px] font-black text-[var(--color-on-surface-variant)] uppercase tracking-widest">Assessment Detail Registry</span>
                  <span className="text-[10px] font-black text-[var(--color-brand-primary)] uppercase tracking-widest">Base Accuracy: {attempt.score}/{attempt.total}</span>
                </div>
                
                <div className="space-y-3">
                  {attempt.descriptive_answers?.map((ans: any, idx: number) => (
                    <div key={idx} className={`p-6 rounded-3xl border ${ans.is_correct ? 'bg-[var(--color-success)]/5 border-[var(--color-success)]/10' : 'bg-[var(--color-danger)]/5 border-[var(--color-danger)]/10'}`}>
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <p className="text-sm font-bold text-[var(--color-on-surface)] leading-relaxed">{idx + 1}. {ans.question_text}</p>
                        {ans.is_correct ? (
                          <div className="w-6 h-6 rounded-full bg-[var(--color-success)]/20 flex items-center justify-center shrink-0">
                            <Trophy size={12} className="text-[var(--color-success)]" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-[var(--color-danger)]/20 flex items-center justify-center shrink-0">
                            <X size={12} className="text-[var(--color-danger)]" />
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-black/20 rounded-2xl">
                          <p className="text-[9px] font-black text-[var(--color-on-surface-variant)] uppercase tracking-widest mb-1">Student Answer</p>
                          <p className={`text-sm font-black ${ans.is_correct ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>{ans.user_answer || 'No Answer'}</p>
                        </div>
                        {!ans.is_correct && (
                          <div className="p-4 bg-black/20 rounded-2xl">
                            <p className="text-[9px] font-black text-[var(--color-on-surface-variant)] uppercase tracking-widest mb-1">Correct Reference</p>
                            <p className="text-sm font-black text-[var(--color-on-surface-variant)]">{ans.correct_answer}</p>
                          </div>
                        )}
                      </div>
                      {ans.note && (
                        <div className="mt-4 pt-4 border-t border-[var(--color-outline-variant)]">
                          <p className="text-[9px] font-black text-[var(--color-on-surface-variant)] uppercase tracking-widest mb-1">User Reflection</p>
                          <p className="text-xs text-[var(--color-on-surface-variant)] italic font-medium leading-relaxed">"{ans.note}"</p>
                        </div>
                      )}
                    </div>
                  ))}
                  {(!attempt.descriptive_answers || attempt.descriptive_answers.length === 0) && (
                    <div className="py-20 text-center bg-[var(--color-surface-container-high)] rounded-[2rem] border border-dashed border-[var(--color-outline-variant)]">
                      <p className="text-[var(--color-on-surface-variant)] text-xs font-black uppercase tracking-widest">No detailed answer registry found</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6 pt-8 border-t border-[var(--color-outline-variant)]">
             <div className="p-6 bg-[var(--color-surface-dim)]/50 rounded-3xl border border-[var(--color-outline-variant)]">
                <div className="flex justify-between items-center mb-4">
                   <p className="text-[10px] font-black uppercase text-[var(--color-on-surface-variant)] tracking-widest">Suggested Score Recalibration</p>
                   <span className="px-3 py-1 bg-[var(--color-surface-container-high)] rounded-lg text-xs font-black text-[var(--color-on-surface)]">{attempt.score} / {attempt.total}</span>
                </div>
                <div className="flex items-center gap-4">
                   <p className="text-xs font-bold text-[var(--color-on-surface-variant)]">Override:</p>
                   <input 
                     type="number" 
                     min="0" 
                     max={attempt.total}
                     value={overrideScore}
                     onChange={e => setOverrideScore(parseFloat(e.target.value))}
                     className="flex-1 bg-[var(--color-surface-dim)] border border-[var(--color-outline-variant)] rounded-xl px-4 py-2 text-[var(--color-on-surface)] font-black text-center outline-none focus:ring-1 focus:ring-[var(--color-brand-primary)]"
                   />
                </div>
             </div>

             <div>
                <label className="block text-[10px] font-black uppercase text-[var(--color-on-surface-variant)] mb-3 tracking-widest">Mentor Pedagogical Feedback</label>
                <textarea 
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Direct feedback to student regarding their performance, strategy, or conceptual alignment..."
                  className="w-full h-32 bg-[var(--color-surface-dim)]/50 border border-[var(--color-outline-variant)] rounded-3xl p-6 text-[var(--color-on-surface)] text-sm resize-none outline-none focus:ring-1 focus:ring-[var(--color-brand-primary)] transition-all"
                />
             </div>

             <button 
               disabled={processing}
               onClick={handleSubmit}
               className="w-full py-5 bg-[var(--color-brand-primary-container)] text-white rounded-[2rem] font-black uppercase tracking-widest shadow-xl shadow-[var(--color-brand-primary)]/30 flex items-center justify-center gap-3 active:scale-[0.98] transition-all disabled:opacity-50"
             >
                {processing ? <Loader2 className="animate-spin" /> : <div className="flex items-center gap-2"><Trophy size={18} /> Archive & Verify Submission</div>}
             </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

