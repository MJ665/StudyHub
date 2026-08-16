import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertTriangle,
  CheckCircle2,
  Search,
  Filter,
  ExternalLink,
  MessageSquare,
  Clock,
  User,
  MoreVertical,
  Edit3,
  Trash2,
  Loader2,
  Lock,
  Unlock
} from 'lucide-react';
import ApiService from '../../services/ApiService';
import { useToast } from '../ui/Toast';

export default function QuestionReportUI() {
  const { toast } = useToast();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [showQuarantineModal, setShowQuarantineModal] = useState<any>(null);
  const [quarantineReason, setQuarantineReason] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await ApiService.getAllReports();
      setReports(Array.isArray(res) ? res : []);
    } catch (err: any) {
      toast('error', `Failed to load reports: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (report: any, status: string) => {
    try {
      if (report.report_source === 'content') {
        await ApiService.resolveContentReport(report.id);
      } else {
        await ApiService.resolveQuestionReport(report.id);
      }
      toast('success', `Report marked as ${status}`);
      fetchReports();
    } catch (err: any) {
      toast('error', `Action failed: ${err.message}`);
    }
  };

  const handleQuarantine = async () => {
    if (!showQuarantineModal || !quarantineReason.trim()) {
      toast('error', 'Please provide a quarantine reason');
      return;
    }

    setProcessing(true);
    try {
      await ApiService.quarantineContent(
        showQuarantineModal.content_type,
        showQuarantineModal.content_id,
        quarantineReason
      );
      toast('success', `Content quarantined: ${showQuarantineModal.content_title}`);
      setShowQuarantineModal(null);
      setQuarantineReason('');
      fetchReports();
    } catch (err: any) {
      toast('error', `Quarantine failed: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (report: any) => {
    setProcessing(true);
    try {
      if (report.content_type === 'bank') {
        await ApiService.deleteBank(Number(report.content_id));
      } else if (report.content_type === 'coding_question') {
        await ApiService.deleteCodingQuestion(Number(report.content_id));
      } else if (report.content_type === 'kt_document') {
        await ApiService.deleteKTDocument(String(report.content_id));
      } else if (report.content_type === 'question') {
        await ApiService.deleteQuestion(Number(report.content_id));
      }
      toast('success', `Content deleted: ${report.content_title}`);
      setDeleteConfirm(null);
      fetchReports();
    } catch (err: any) {
      toast('error', `Delete failed: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const TYPE_LABEL: Record<string, string> = {
    question: 'MCQ Question',
    kt_document: 'KT Document',
    coding_question: 'Coding Question',
  };
  const TYPE_COLOR: Record<string, string> = {
    question: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    kt_document: 'bg-[var(--color-brand-primary-container)]/10 text-[var(--color-brand-primary)] border-[var(--color-brand-primary)]/20',
    coding_question: 'bg-[var(--color-warning)]/10 text-[var(--color-warning)] border-[var(--color-warning)]/20',
  };

  // ── Inline edit of the reported question ──
  const [editing, setEditing] = useState<any>(null);
  const [editText, setEditText] = useState('');
  const [editOptions, setEditOptions] = useState('');
  const [editAnswer, setEditAnswer] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const openEdit = (report: any) => {
    setEditing(report);
    setEditText(report.content_title || '');
    setEditOptions(Array.isArray(report.question_options) ? report.question_options.join('\n') : '');
    setEditAnswer(report.question_answer || '');
  };

  const saveEdit = async (resolveAfter: boolean) => {
    const questionId = editing?.content_id ? parseInt(editing.content_id, 10) : NaN;
    if (!questionId || Number.isNaN(questionId)) return;
    setSavingEdit(true);
    try {
      const options = editOptions.split('\n').map(o => o.trim()).filter(Boolean);
      await ApiService.updateQuestion(questionId, {
        question: editText,
        ...(options.length ? { options } : {}),
        ...(editAnswer ? { answer: editAnswer } : {}),
      });
      if (resolveAfter && editing.status === 'pending') {
        await ApiService.resolveQuestionReport(editing.id);
      }
      toast('success', resolveAfter ? 'Question updated & report resolved' : 'Question updated');
      setEditing(null);
      fetchReports();
    } catch (err: any) {
      toast('error', `Update failed: ${err.message}`);
    } finally {
      setSavingEdit(false);
    }
  };

  const filteredReports = reports.filter(r => {
    const matchesFilter = filter === 'all' || r.status === filter;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      r.content_title?.toLowerCase().includes(q) ||
      r.issue_type?.toLowerCase().includes(q) ||
      r.description?.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--color-surface-dim)]/50 rounded-[3rem] border border-[var(--color-outline-variant)] overflow-hidden">
      <header className="p-8 border-b border-[var(--color-outline-variant)] flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-[var(--color-danger)] mb-2">
            <AlertTriangle size={18} />
            <span className="font-black uppercase tracking-[0.2em] text-[10px]">Data Integrity Audit</span>
          </div>
          <h2 className="text-2xl font-black text-[var(--color-on-surface)]">Content Reports</h2>
          <p className="text-[var(--color-on-surface-variant)] text-xs mt-1">MCQ questions · KT documents · coding questions</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-on-surface-variant)]" size={16} />
            <input 
              type="text" 
              placeholder="Search reports..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] rounded-2xl pl-12 pr-6 py-3 text-sm text-[var(--color-on-surface)] focus:outline-none focus:ring-1 focus:ring-[var(--color-danger)]/50 transition-all w-64"
            />
          </div>

          <div className="flex p-1 bg-[var(--color-surface-container)] rounded-xl border border-[var(--color-outline-variant)]">
            {(['all', 'pending', 'resolved'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  filter === f ? 'bg-[var(--color-surface-bright)] text-[var(--color-on-surface)] shadow-lg' : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface-variant)]'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center space-y-4">
            <Loader2 className="animate-spin text-[var(--color-danger)]" size={40} />
            <p className="text-[var(--color-on-surface-variant)] font-black uppercase tracking-widest text-xs">Scanning Report Cluster...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center space-y-6 opacity-50">
            <div className="w-20 h-20 rounded-full bg-[var(--color-surface-container)] flex items-center justify-center text-[var(--color-on-surface-variant)] border border-[var(--color-outline-variant)]">
              <CheckCircle2 size={40} />
            </div>
            <p className="text-[var(--color-on-surface-variant)] font-bold">No items match your current filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {filteredReports.map(report => (
              <motion.div 
                key={report.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[var(--color-surface-container)]/50 border border-[var(--color-outline-variant)] rounded-3xl p-6 hover:border-[var(--color-danger)]/20 transition-all group"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--color-surface-container-high)] flex items-center justify-center text-[var(--color-on-surface-variant)]">
                      <User size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[var(--color-on-surface)]">{report.reporter_name || 'Anonymous User'}</p>
                      <div className="flex items-center gap-2 text-[10px] text-[var(--color-on-surface-variant)] font-black uppercase tracking-widest">
                        <Clock size={10} /> {new Date(report.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border ${TYPE_COLOR[report.content_type] || 'bg-[var(--color-surface-container-high)]/10 text-[var(--color-on-surface-variant)] border-[var(--color-outline-variant)]/20'}`}>
                      {TYPE_LABEL[report.content_type] || report.content_type}
                    </span>
                    <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                      report.status === 'pending' ? 'bg-[var(--color-danger)]/10 text-[var(--color-danger)] border border-[var(--color-danger)]/20' : 'bg-[var(--color-success)]/10 text-[var(--color-success)] border border-[var(--color-success)]/20'
                    }`}>
                      {report.status}
                    </span>
                  </div>
                </div>

                <div className="bg-[var(--color-surface-dim)]/50 rounded-2xl p-5 mb-6 border border-[var(--color-outline-variant)]">
                  <p className="text-[10px] font-black text-[var(--color-danger)] uppercase tracking-widest mb-2">Reported Content</p>
                  <p className="text-sm text-[var(--color-on-surface-variant)] font-medium leading-relaxed italic mb-4 break-words">"{report.content_title || 'Untitled'}"</p>

                  <div className="flex gap-4 p-4 bg-[var(--color-danger)]/5 rounded-xl border border-[var(--color-danger)]/10">
                    <AlertTriangle size={16} className="text-[var(--color-danger)] shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-black text-[var(--color-danger)] uppercase tracking-widest mb-1">Issue: {report.issue_type}</p>
                      <p className="text-xs text-[var(--color-on-surface-variant)] break-words">{report.description || 'No additional description provided.'}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    {report.content_type === 'question' ? (
                      <button
                        onClick={() => openEdit(report)}
                        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)] transition-all"
                      >
                        <Edit3 size={14} /> Edit
                      </button>
                    ) : null}

                    <button
                      onClick={() => setShowQuarantineModal(report)}
                      disabled={processing}
                      className="flex items-center gap-1 px-3 py-2 bg-amber-500/20 text-amber-700 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-amber-500/30 transition-all disabled:opacity-50"
                      title="Quarantine this content"
                    >
                      <Lock size={12} /> Quarantine
                    </button>

                    <button
                      onClick={() => setDeleteConfirm(report)}
                      disabled={processing}
                      className="flex items-center gap-1 px-3 py-2 bg-red-500/20 text-red-700 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-red-500/30 transition-all disabled:opacity-50"
                      title="Delete this content"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>

                  {report.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleResolve(report, 'dismissed')}
                        className="px-4 py-2 bg-[var(--color-surface-container-high)] hover:bg-[var(--color-surface-bright)] text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-[var(--color-outline-variant)]"
                      >
                        Dismiss
                      </button>
                      <button
                        onClick={() => handleResolve(report, 'resolved')}
                        className="px-4 py-2 bg-[var(--color-success)] text-[var(--color-surface-dim)] rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[var(--color-success)]/20 hover:scale-105 active:scale-95 transition-all"
                      >
                        Mark Resolved
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* ── Edit-question modal ── */}
      <AnimatePresence>
        {editing && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => !savingEdit && setEditing(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center gap-2 text-[var(--color-brand-primary)] mb-4">
                <Edit3 size={16} /><span className="font-black uppercase tracking-widest text-[10px]">Edit Reported Question</span>
              </div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-on-surface-variant)] mb-1">Question</label>
              <textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={3}
                className="w-full bg-[var(--color-surface-dim)] border border-[var(--color-outline-variant)] rounded-xl p-3 text-sm text-[var(--color-on-surface)] mb-4 outline-none focus:ring-1 focus:ring-[var(--color-brand-primary)]/50" />
              <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-on-surface-variant)] mb-1">Options (one per line)</label>
              <textarea value={editOptions} onChange={(e) => setEditOptions(e.target.value)} rows={4}
                className="w-full bg-[var(--color-surface-dim)] border border-[var(--color-outline-variant)] rounded-xl p-3 text-sm text-[var(--color-on-surface)] mb-4 outline-none focus:ring-1 focus:ring-[var(--color-brand-primary)]/50" />
              <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-on-surface-variant)] mb-1">Correct Answer</label>
              <input value={editAnswer} onChange={(e) => setEditAnswer(e.target.value)}
                className="w-full bg-[var(--color-surface-dim)] border border-[var(--color-outline-variant)] rounded-xl p-3 text-sm text-[var(--color-on-surface)] mb-5 outline-none focus:ring-1 focus:ring-[var(--color-brand-primary)]/50" />
              <div className="flex flex-wrap justify-end gap-2">
                <button disabled={savingEdit} onClick={() => setEditing(null)} className="px-4 py-2 text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] text-xs font-bold">Cancel</button>
                <button disabled={savingEdit} onClick={() => saveEdit(false)} className="px-4 py-2 rounded-xl bg-[var(--color-surface-container-high)] hover:bg-[var(--color-surface-bright)] text-[var(--color-on-surface)] text-xs font-bold border border-[var(--color-outline-variant)]">
                  {savingEdit ? <Loader2 size={14} className="animate-spin" /> : 'Save'}
                </button>
                <button disabled={savingEdit} onClick={() => saveEdit(true)} className="px-4 py-2 rounded-xl bg-[var(--color-success)] hover:bg-[var(--color-success)] text-[var(--color-surface-dim)] text-xs font-bold">
                  Save & Resolve
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Quarantine modal ── */}
      <AnimatePresence>
        {showQuarantineModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => !processing && setShowQuarantineModal(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] rounded-3xl p-6 shadow-2xl"
            >
              <div className="flex items-center gap-2 text-amber-600 mb-4">
                <Lock size={16} /><span className="font-black uppercase tracking-widest text-[10px]">Quarantine Content</span>
              </div>
              <p className="text-sm text-[var(--color-on-surface-variant)] mb-4">
                {showQuarantineModal.content_title}
              </p>
              <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-on-surface-variant)] mb-2">Reason for quarantine</label>
              <textarea
                value={quarantineReason}
                onChange={(e) => setQuarantineReason(e.target.value)}
                rows={3}
                placeholder="Explain why this content is being quarantined..."
                className="w-full bg-[var(--color-surface-dim)] border border-[var(--color-outline-variant)] rounded-xl p-3 text-sm text-[var(--color-on-surface)] mb-5 outline-none focus:ring-1 focus:ring-amber-500/50"
              />
              <div className="flex gap-2 justify-end">
                <button disabled={processing} onClick={() => { setShowQuarantineModal(null); setQuarantineReason(''); }} className="px-4 py-2 text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] text-xs font-bold">Cancel</button>
                <button disabled={processing || !quarantineReason.trim()} onClick={handleQuarantine} className="px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 disabled:opacity-50">
                  {processing ? <Loader2 size={14} className="animate-spin inline mr-2" /> : null}
                  Quarantine
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Delete confirmation modal ── */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => !processing && setDeleteConfirm(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] rounded-3xl p-6 shadow-2xl"
            >
              <div className="flex items-center gap-2 text-red-600 mb-4">
                <AlertTriangle size={16} /><span className="font-black uppercase tracking-widest text-[10px]">Delete Content</span>
              </div>
              <p className="text-sm text-[var(--color-on-surface-variant)] mb-4">
                Are you sure you want to permanently delete <strong>{deleteConfirm.content_title}</strong>?
                This action cannot be undone.
              </p>
              <div className="flex gap-2 justify-end">
                <button disabled={processing} onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] text-xs font-bold">Cancel</button>
                <button disabled={processing} onClick={() => handleDelete(deleteConfirm)} className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 disabled:opacity-50">
                  {processing ? <Loader2 size={14} className="animate-spin inline mr-2" /> : null}
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
