import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Clock, 
  Target, 
  ShieldCheck, 
  AlertCircle, 
  Calendar, 
  BrainCircuit, 
  Code,
  ChevronRight,
  Lock
} from 'lucide-react';

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

interface Props {
  assignment: Assignment;
  onClose: () => void;
  onStart: (assignment: Assignment) => void;
}

export default function AssignmentDetailModal({ assignment, onClose, onStart }: Props) {
  const isOverdue = assignment.due_date ? new Date(assignment.due_date) < new Date() : false;
  const canAttempt = !assignment.is_completed && (!isOverdue || !assignment.lock_after_due);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-[var(--color-surface-dim)]/80 backdrop-blur-md"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-2xl bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] rounded-[3rem] shadow-2xl overflow-hidden"
      >
        {/* Header Decoration */}
        <div className={`h-2 w-full ${
          assignment.is_completed ? 'bg-[var(--color-success)]' : 
          isOverdue ? 'bg-[var(--color-danger)]' : 'bg-[var(--color-brand-primary-container)]'
        }`} />

        <div className="p-10">
          <div className="flex justify-between items-start mb-8">
            <div className="flex items-center gap-4">
              <div className={`p-4 rounded-2xl ${
                assignment.assignment_type === 'quiz' ? 'bg-[var(--color-brand-primary-container)]/10 text-[var(--color-brand-primary)]' : 'bg-[var(--color-brand-primary-container)]/10 text-[var(--color-brand-primary)]'
              }`}>
                {assignment.assignment_type === 'quiz' ? <BrainCircuit size={28} /> : <Code size={28} />}
              </div>
              <div>
                <h2 className="text-3xl font-black text-[var(--color-on-surface)] mb-1 tracking-tight">{assignment.bank_name}</h2>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                    Directive Protocol
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                    assignment.is_completed ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]' : 
                    isOverdue ? 'bg-[var(--color-danger)]/10 text-[var(--color-danger)]' : 'bg-[var(--color-brand-primary-container)]/10 text-[var(--color-brand-primary)]'
                  }`}>
                    {assignment.is_completed ? 'Success' : isOverdue ? 'Delayed' : 'Pending'}
                  </span>
                </div>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-[var(--color-surface-container-high)] rounded-full text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] transition-all"
            >
              <X size={24} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="p-5 bg-[var(--color-surface-dim)]/50 rounded-3xl border border-[var(--color-outline-variant)]">
              <div className="flex items-center gap-2 text-[var(--color-on-surface-variant)] mb-2">
                <Calendar size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">Deadline</span>
              </div>
              <p className={`text-sm font-bold ${isOverdue ? 'text-[var(--color-danger)]' : 'text-[var(--color-on-surface)]'}`}>
                {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : 'Indefinite'}
              </p>
            </div>
            
            <div className="p-5 bg-[var(--color-surface-dim)]/50 rounded-3xl border border-[var(--color-outline-variant)]">
              <div className="flex items-center gap-2 text-[var(--color-on-surface-variant)] mb-2">
                <ShieldCheck size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">Passing Threshold</span>
              </div>
              <p className="text-sm font-bold text-[var(--color-on-surface)]">
                {assignment.passing_score_percent ? `${assignment.passing_score_percent}%` : 'Diagnostic Only'}
              </p>
            </div>

            <div className="p-5 bg-[var(--color-surface-dim)]/50 rounded-3xl border border-[var(--color-outline-variant)]">
              <div className="flex items-center gap-2 text-[var(--color-on-surface-variant)] mb-2">
                <Target size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">Attempts Rem.</span>
              </div>
              <p className="text-sm font-bold text-[var(--color-on-surface)]">
                {assignment.max_attempts ? `${assignment.max_attempts - assignment.attempts_used} / ${assignment.max_attempts}` : 'Infinite'}
              </p>
            </div>
          </div>

          <div className="space-y-6 mb-12">
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--color-on-surface-variant)] mb-3 flex items-center gap-2">
                <AlertCircle size={12} /> Tactical Instructions
              </h4>
              <div className="bg-[var(--color-surface-dim)]/30 p-6 rounded-[2rem] border border-[var(--color-outline-variant)] text-[var(--color-on-surface-variant)] text-sm leading-relaxed font-medium">
                {assignment.instructions || "No specific instructions provided. Execute standard operational procedures to complete this learning mandate."}
              </div>
            </div>

            {assignment.lock_after_due && (
              <div className="flex items-center gap-3 p-4 bg-[var(--color-danger)]/5 border border-[var(--color-danger)]/10 rounded-2xl">
                <Lock size={16} className="text-[var(--color-danger)]" />
                <p className="text-xs font-bold text-[var(--color-danger)]/80 uppercase tracking-widest">
                  Hard Deadline: Access will be terminated immediately after expiration.
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="flex-1 py-4 bg-[var(--color-surface-container-high)] hover:bg-[var(--color-surface-bright)] text-[var(--color-on-surface-variant)] rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] transition-all"
            >
              Back to Registry
            </button>
            {assignment.is_completed ? (
              <div className="flex-1 py-4 bg-[var(--color-success)]/20 text-[var(--color-success)] rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-2 border border-[var(--color-success)]/20">
                Protocol Satisfied <ShieldCheck size={14} />
              </div>
            ) : !canAttempt ? (
              <div className="flex-1 py-4 bg-[var(--color-danger)]/20 text-[var(--color-danger)] rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-2 border border-[var(--color-danger)]/20">
                Access Terminated <Lock size={14} />
              </div>
            ) : (
              <button
                onClick={() => onStart(assignment)}
                className="flex-1 py-4 bg-[var(--color-brand-primary-container)] hover:bg-[var(--color-brand-primary-container)] text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] transition-all shadow-xl shadow-[var(--color-brand-primary)]/20 flex items-center justify-center gap-2 group"
              >
                Initiate Engagement <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
