import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ClipboardList, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  ChevronRight, 
  AlertCircle,
  BrainCircuit,
  Code,
  Lock,
  ArrowLeft,
  Loader2
} from 'lucide-react';
import ApiService from '../../services/ApiService';
import AssignmentDetailModal from './AssignmentDetailModal';

interface Assignment {
  assignment_id: number;
  bank_id: number | null;
  coding_question_id: number | null;
  assignment_type: 'quiz' | 'coding';
  bank_name: string;
  due_date: string;
  instructions: string;
  is_completed: boolean;
  status: 'not_started' | 'in_progress' | 'passed' | 'failed' | 'completed';
  score: number | null;
  attempts_used: number;
  max_attempts: number | null;
  passing_score_percent: number | null;
  lock_after_due: boolean;
}

interface AssignmentsViewProps {
  user: any;
  onStartQuiz: (bank: any, maxQuestions: number) => void;
  onStartCoding: (question: any) => void;
  onBack: () => void;
}

export default function AssignmentsView({ user, onStartQuiz, onStartCoding, onBack }: AssignmentsViewProps) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('active');
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      const data = await ApiService.getMyAssignments();
      setAssignments(data);
    } catch (err) {
      console.error("Failed to load assignments", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredAssignments = assignments.filter(a => {
    if (filter === 'all') return true;
    if (filter === 'active') return !a.is_completed;
    if (filter === 'completed') return a.is_completed;
    return true;
  });

  const isOverdue = (date: string) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  const handleStartAssignment = (asgn: Assignment) => {
    setSelectedAssignment(null);
    if (asgn.assignment_type === 'quiz') {
      onStartQuiz({ id: asgn.bank_id, name: asgn.bank_name }, 50);
    } else {
      onStartCoding({ id: asgn.coding_question_id, title: asgn.bank_name });
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-surface-dim)] p-8 font-plus-jakarta">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-12">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-6">
             <button onClick={onBack} className="p-3 bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] rounded-2xl text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] transition-all">
                <ArrowLeft size={20} />
             </button>
             <div>
               <h1 className="text-4xl font-black text-[var(--color-on-surface)] mb-2 tracking-tight flex items-center gap-4">
                 <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-[var(--color-brand-primary)]">
                   <ClipboardList size={32} />
                 </div>
                 Mandatory Assignments
               </h1>
               <p className="text-[var(--color-on-surface-variant)] font-bold uppercase tracking-[0.2em] text-[10px]">Strategic Learning Directives & Compliance</p>
             </div>
          </div>
          
          <div className="flex bg-[var(--color-surface-container)]/50 p-1 rounded-2xl border border-[var(--color-outline-variant)]">
            {(['active', 'completed', 'all'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  filter === f 
                    ? 'bg-[var(--color-brand-primary-container)] text-[var(--color-on-surface)] shadow-lg shadow-indigo-600/20' 
                    : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface-variant)]'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <Loader2 className="animate-spin text-indigo-500" size={48} />
            <p className="text-[var(--color-on-surface-variant)] font-black uppercase tracking-widest text-xs">Synchronizing Directives...</p>
          </div>
        ) : filteredAssignments.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[var(--color-surface-container)]/30 border border-dashed border-[var(--color-outline-variant)] rounded-[3rem] p-24 text-center"
          >
            <div className="w-20 h-20 bg-[var(--color-surface-container-high)]/50 rounded-full flex items-center justify-center mx-auto mb-6 text-[var(--color-on-surface-variant)]">
               <CheckCircle2 size={40} />
            </div>
            <h3 className="text-2xl font-black text-[var(--color-on-surface)] mb-2">Registry Clear</h3>
            <p className="text-[var(--color-on-surface-variant)] font-medium">No pending assignments found in your current sector.</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredAssignments.map((asgn, idx) => {
                const overdue = isOverdue(asgn.due_date);
                const canAttempt = !asgn.is_completed && (!overdue || !asgn.lock_after_due);

                return (
                  <motion.div
                    key={asgn.assignment_id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => setSelectedAssignment(asgn)}
                    className={`group bg-[var(--color-surface-container)]/40 backdrop-blur-xl border ${
                      asgn.is_completed ? 'border-emerald-500/20' : overdue ? 'border-rose-500/20' : 'border-[var(--color-outline-variant)]'
                    } rounded-[2.5rem] p-8 hover:bg-[var(--color-surface-container)]/60 transition-all relative overflow-hidden cursor-pointer shadow-2xl`}
                  >
                    {/* Status Badge */}
                    <div className="flex justify-between items-start mb-6">
                      <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${
                        asgn.is_completed ? 'bg-emerald-500/10 text-emerald-400' :
                        overdue ? 'bg-rose-500/10 text-rose-400' : 'bg-indigo-500/10 text-[var(--color-brand-primary)]'
                      }`}>
                        {asgn.is_completed ? <CheckCircle2 size={12} /> : overdue ? <AlertCircle size={12} /> : <Clock size={12} />}
                        {asgn.is_completed ? 'Completed' : overdue ? 'Overdue' : 'Active'}
                      </div>
                      
                      <div className="flex gap-2">
                         <div className="p-2 bg-[var(--color-surface-dim)] rounded-xl text-[var(--color-on-surface-variant)]">
                            {asgn.assignment_type === 'quiz' ? <BrainCircuit size={16} /> : <Code size={16} />}
                         </div>
                      </div>
                    </div>

                    <h3 className="text-xl font-black text-[var(--color-on-surface)] mb-2 group-hover:text-[var(--color-brand-primary)] transition-colors line-clamp-1">{asgn.bank_name}</h3>
                    <p className="text-[var(--color-on-surface-variant)] text-sm mb-6 line-clamp-2 font-medium leading-relaxed">{asgn.instructions || "No specific instructions provided for this directive."}</p>

                    <div className="grid grid-cols-2 gap-4 mb-8">
                       <div className="bg-[var(--color-surface-dim)]/50 p-4 rounded-2xl border border-[var(--color-outline-variant)]">
                          <p className="text-[10px] text-[var(--color-on-surface-variant)] font-black uppercase tracking-widest mb-1">Due Date</p>
                          <p className={`text-xs font-bold ${overdue ? 'text-rose-400' : 'text-[var(--color-on-surface-variant)]'}`}>
                             {asgn.due_date ? new Date(asgn.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'No Deadline'}
                          </p>
                       </div>
                       <div className="bg-[var(--color-surface-dim)]/50 p-4 rounded-2xl border border-[var(--color-outline-variant)]">
                          <p className="text-[10px] text-[var(--color-on-surface-variant)] font-black uppercase tracking-widest mb-1">Attempts</p>
                          <p className="text-xs font-bold text-[var(--color-on-surface-variant)]">
                             {asgn.attempts_used} / {asgn.max_attempts || '∞'}
                          </p>
                       </div>
                    </div>

                    {asgn.is_completed ? (
                      <div className="flex items-center justify-between p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                         <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-black text-xs">
                               {asgn.score}%
                            </div>
                            <p className="text-xs font-bold text-emerald-500/80 uppercase tracking-widest">Protocol Passed</p>
                         </div>
                         <CheckCircle2 size={20} className="text-emerald-500" />
                      </div>
                    ) : !canAttempt ? (
                      <div className="flex items-center gap-3 p-4 bg-rose-500/5 border border-rose-500/10 rounded-2xl text-rose-500">
                         <Lock size={18} />
                         <p className="text-xs font-black uppercase tracking-widest">Access Locked (Overdue)</p>
                      </div>
                    ) : (
                      <button 
                        className="w-full py-4 bg-[var(--color-brand-primary-container)] hover:bg-indigo-500 text-[var(--color-on-surface)] rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] transition-all shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-2"
                      >
                         Open Detailed View <ChevronRight size={14} />
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedAssignment && (
          <AssignmentDetailModal 
            assignment={selectedAssignment}
            onClose={() => setSelectedAssignment(null)}
            onStart={handleStartAssignment}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
