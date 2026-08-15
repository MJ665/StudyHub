/**
 * QuestionDiscussions.tsx
 * High-fidelity discussion interface for peer-to-peer learning.
 * Features threaded replies, mentor pinning, and real-time synthesis.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageSquare, Send, X, CornerDownRight, ThumbsUp,
  Flag, Pin, ShieldCheck, Loader2, Sparkles, User, Clock, Ban
} from 'lucide-react';
import ApiService from '../../services/ApiService';
import { useToast } from '../ui/Toast';

interface Discussion {
  id: number;
  user_id: number;
  user_name: string;
  content: string;
  upvotes: number;
  is_pinned: boolean;
  created_at: string;
  replies: Discussion[];
}

interface QuestionDiscussionsProps {
  questionId: number;
  onClose: () => void;
}

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam' },
  { value: 'harassment', label: 'Harassment or abuse' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'other', label: 'Other' }
];

export default function QuestionDiscussions({ questionId, onClose }: QuestionDiscussionsProps) {
  const { toast } = useToast();
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [reportingComment, setReportingComment] = useState<number | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  const fetchDiscussions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await ApiService.getDiscussions(questionId);
      setDiscussions(data);
    } catch (err: any) {
      toast('error', 'Failed to synchronize discussions');
    } finally {
      setLoading(false);
    }
  }, [questionId, toast]);

  useEffect(() => {
    fetchDiscussions();
    // Get current user ID
    const getCurrentUser = async () => {
      try {
        const me = await ApiService.getMe();
        setCurrentUserId(me.id);
      } catch (err: any) {
        // Silently fail if we can't get current user
      }
    };
    getCurrentUser();
  }, [fetchDiscussions]);

  const handleReportComment = async () => {
    if (!reportingComment || !reportReason) {
      toast('error', 'Please select a reason');
      return;
    }

    try {
      await ApiService.reportDiscussion(reportingComment, {
        issue_type: reportReason,
        description: reportDescription
      });
      toast('success', 'Reported — thanks, our team will review');
      setReportingComment(null);
      setReportReason('');
      setReportDescription('');
    } catch (err: any) {
      toast('error', 'Failed to report discussion');
    }
  };

  const handleBlockUser = async (userId: number, userName: string) => {
    if (!window.confirm(`Block ${userName}? Their posts will be hidden from your discussions.`)) {
      return;
    }

    try {
      await ApiService.blockUser(userId);
      toast('success', `${userName} has been blocked`);
      fetchDiscussions();
    } catch (err: any) {
      toast('error', 'Failed to block user');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    setSubmitting(true);
    try {
      await ApiService.addDiscussion(questionId, comment, replyTo || undefined);
      setComment('');
      setReplyTo(null);
      fetchDiscussions();
      toast('success', 'Logic contribution published');
    } catch (err: any) {
      toast('error', 'Publication failure');
    } finally {
      setSubmitting(false);
    }
  };

  const CommentCard = ({ d, isReply = false }: { d: Discussion, isReply?: boolean, key?: any }) => {
    const isOwnComment = currentUserId === d.user_id;

    return (
      <div className={`group relative ${isReply ? 'ml-8 mt-4' : 'mt-6'}`}>
        {isReply && (
          <div className="absolute -left-6 top-4 w-4 h-4 border-l-2 border-b-2 border-[var(--color-outline-variant)] rounded-bl-lg" />
        )}

        <div className={`p-5 rounded-2xl border transition-all duration-300 ${d.is_pinned
            ? 'bg-[var(--color-brand-primary-container)]/10 border-[var(--color-brand-primary)]/30 shadow-[0_0_20px_rgba(99,102,241,0.1)]'
            : 'bg-[var(--color-surface-container)]/50 border-[var(--color-outline-variant)] hover:border-[var(--color-outline-variant)]'
          }`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)] flex items-center justify-center text-xs font-black text-[var(--color-on-surface-variant)]">
                {d.user_name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-[var(--color-on-surface)]">{d.user_name}</span>
                  {d.is_pinned && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-[var(--color-brand-primary-container)]/20 text-[var(--color-brand-primary)] text-[10px] font-black uppercase tracking-widest rounded-full">
                      <Pin size={10} /> Explanation
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-bold text-[var(--color-on-surface-variant)] uppercase tracking-widest">
                  {new Date(d.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
              <button className="p-1.5 hover:bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] rounded-lg transition-all">
                <ThumbsUp size={14} />
              </button>
              <button
                onClick={() => {
                  setReplyTo(d.id);
                  document.getElementById('discussion-input')?.focus();
                }}
                className="p-1.5 hover:bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] rounded-lg transition-all"
              >
                <CornerDownRight size={14} />
              </button>
              {!isOwnComment && (
                <button
                  onClick={() => handleBlockUser(d.user_id, d.user_name)}
                  className="p-1.5 hover:bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] hover:text-[var(--color-danger)] rounded-lg transition-all"
                  title="Block this user"
                >
                  <Ban size={14} />
                </button>
              )}
              <button
                onClick={() => setReportingComment(d.id)}
                className="p-1.5 hover:bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] hover:text-[var(--color-danger)] rounded-lg transition-all"
                title="Report this comment"
              >
                <Flag size={14} />
              </button>
            </div>
          </div>

          <p className="text-[var(--color-on-surface-variant)] text-sm leading-relaxed whitespace-pre-wrap">
            {d.content}
          </p>
        </div>

        {d.replies?.map(reply => (
          <CommentCard key={reply.id} d={reply} isReply />
        ))}
      </div>
    );
  };

  const ReportModal = () => (
    <AnimatePresence>
      {reportingComment && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] flex items-center justify-center p-4"
        >
          <div
            className="absolute inset-0 bg-[var(--color-surface-dim)]/80 backdrop-blur-md"
            onClick={() => setReportingComment(null)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] rounded-[2.5rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/30 rounded-2xl flex items-center justify-center">
                <Flag className="text-[var(--color-danger)]" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-[var(--color-on-surface)]">Report Comment</h3>
                <p className="text-[10px] font-black text-[var(--color-on-surface-variant)] uppercase tracking-widest mt-1">Help us keep discussions safe</p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <label className="text-[10px] font-black text-[var(--color-on-surface-variant)] uppercase tracking-widest block">Reason</label>
              <div className="space-y-2">
                {REPORT_REASONS.map(reason => (
                  <button
                    key={reason.value}
                    onClick={() => setReportReason(reason.value)}
                    className={`w-full p-4 rounded-xl text-left border transition-all ${
                      reportReason === reason.value
                        ? 'bg-[var(--color-danger)]/10 border-[var(--color-danger)]/30 text-[var(--color-on-surface)]'
                        : 'bg-[var(--color-surface-container-high)] border-[var(--color-outline-variant)] text-[var(--color-on-surface-variant)] hover:border-[var(--color-outline-variant)]'
                    }`}
                  >
                    <span className="text-sm font-black">{reason.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {reportReason === 'other' && (
              <div className="mb-6">
                <label className="text-[10px] font-black text-[var(--color-on-surface-variant)] uppercase tracking-widest block mb-2">Additional details (optional)</label>
                <textarea
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="Tell us more..."
                  className="w-full bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)] rounded-xl p-3 text-sm text-[var(--color-on-surface)] placeholder:text-[var(--color-on-surface-variant)] focus:outline-none focus:ring-2 focus:ring-[var(--color-danger)] resize-none"
                  rows={3}
                />
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setReportingComment(null)}
                className="flex-1 py-3 bg-[var(--color-surface-container-high)] hover:bg-[var(--color-surface-bright)] text-[var(--color-on-surface)] border border-[var(--color-outline-variant)] rounded-xl font-black text-xs uppercase tracking-widest transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleReportComment}
                disabled={!reportReason}
                className="flex-1 py-3 bg-[var(--color-danger)]/10 hover:bg-[var(--color-danger)] text-[var(--color-danger)] hover:text-white border border-[var(--color-danger)]/30 hover:border-[var(--color-danger)] rounded-xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50"
              >
                Report
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <ReportModal />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-[var(--color-surface-dim)]/80 backdrop-blur-md"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-2xl h-[80vh] bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] rounded-[2.5rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-8 border-b border-[var(--color-outline-variant)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[var(--color-brand-primary-container)]/20 border border-[var(--color-brand-primary)]/30 rounded-2xl flex items-center justify-center">
              <MessageSquare className="text-[var(--color-brand-primary)]" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-[var(--color-on-surface)] tracking-tight">Peer Discussions</h2>
              <p className="text-[10px] font-black text-[var(--color-on-surface-variant)] uppercase tracking-widest mt-1">Collaborative Reasoning & Synthesis</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 bg-[var(--color-surface-container-high)] hover:bg-[var(--color-surface-bright)] text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] rounded-xl transition-all border border-[var(--color-outline-variant)]">
            <X size={20} />
          </button>
        </div>

        {/* Discussions List */}
        <div className="flex-1 overflow-y-auto p-8 scrollbar-thin scrollbar-thumb-white/10">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="text-[var(--color-brand-primary)] animate-spin" size={32} />
              <p className="text-xs font-black text-[var(--color-on-surface-variant)] uppercase tracking-widest animate-pulse">Synchronizing Neural Links...</p>
            </div>
          ) : discussions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-6">
              <div className="w-20 h-20 bg-[var(--color-surface-container-high)]/50 rounded-[2rem] flex items-center justify-center">
                <Sparkles size={40} className="text-[var(--color-on-surface-variant)]" />
              </div>
              <div>
                <h3 className="text-lg font-black text-[var(--color-on-surface)] mb-2 uppercase tracking-tight">The Floor is Yours</h3>
                <p className="text-[var(--color-on-surface-variant)] text-sm max-w-xs mx-auto leading-relaxed">No logic explained yet. Be the first to start the pedagogical synthesis for this question.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 pb-8">
              {discussions.map(d => (
                <CommentCard key={d.id} d={d} />
              ))}
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-8 bg-[var(--color-surface-container)]/50 border-t border-[var(--color-outline-variant)] shrink-0">
          {replyTo && (
            <div className="flex items-center justify-between bg-[var(--color-brand-primary-container)]/10 border border-[var(--color-brand-primary)]/20 px-4 py-2 rounded-xl mb-4">
              <div className="flex items-center gap-2">
                <CornerDownRight size={14} className="text-[var(--color-brand-primary)]" />
                <span className="text-[10px] font-black text-[var(--color-brand-primary)] uppercase tracking-widest">Replying to thread</span>
              </div>
              <button onClick={() => setReplyTo(null)} className="text-[var(--color-brand-primary)] hover:text-[var(--color-on-surface)] transition-all">
                <X size={14} />
              </button>
            </div>
          )}
          <form onSubmit={handleSubmit} className="relative">
            <textarea
              id="discussion-input"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Explain your reasoning or ask a question..."
              className="w-full bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)] rounded-2xl p-5 pr-20 text-sm text-[var(--color-on-surface)] placeholder:text-[var(--color-on-surface-variant)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)] transition-all resize-none min-h-[100px]"
            />
            <button
              type="submit"
              disabled={submitting || !comment.trim()}
              className="absolute bottom-4 right-4 p-4 bg-[var(--color-brand-primary-container)] hover:bg-[var(--color-brand-primary-container)] text-[var(--color-surface-bright)] rounded-xl shadow-xl shadow-[var(--color-brand-primary)]/20 transition-all disabled:opacity-50 disabled:grayscale"
            >
              {submitting ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
            </button>
          </form>
          <p className="mt-4 text-[9px] font-bold text-[var(--color-on-surface-variant)] uppercase tracking-widest text-center">
            Helpful, high-fidelity logic explanations improve your Consistency Index.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
