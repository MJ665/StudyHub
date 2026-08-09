'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Inbox, FileCheck, Search, Filter, Clock, AlertTriangle, ArrowRight, 
  Sparkles, FileText, ChevronDown, Check, X, ShieldAlert,
  Loader2, Mail
} from 'lucide-react';
import ApiService from '@/services/ApiService';
import { toast } from 'react-hot-toast';

export default function KTMentorInboxView() {
  const [activeTab, setActiveTab] = useState<'Inbox' | 'Unanswered'>('Inbox');
  const [inbox, setInbox] = useState<any[]>([]);
  const [orphanedQueries, setOrphanedQueries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingGaps, setLoadingGaps] = useState(false);

  // Rejection modal states
  const [rejectingDocId, setRejectingDocId] = useState<string | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [submittingRejection, setSubmittingRejection] = useState(false);

  // Processing state locks (double ingestion pipeline safeguards)
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [ingestionStatuses, setIngestionStatuses] = useState<Record<string, string>>({});

  const fetchInbox = async () => {
    setLoading(true);
    try {
      const res = await ApiService.getMentorInbox(1, 50);
      setInbox(res?.items || res || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load mentor review inbox');
    } finally {
      setLoading(false);
    }
  };

  const fetchGaps = async () => {
    setLoadingGaps(true);
    try {
      const res = await ApiService.getKTGaps(false);
      setOrphanedQueries(res?.items || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load orphaned queries');
    } finally {
      setLoadingGaps(false);
    }
  };

  useEffect(() => {
    fetchInbox();
  }, []);

  useEffect(() => {
    if (activeTab === 'Unanswered') {
      fetchGaps();
    }
  }, [activeTab]);

  const pollIntervalsRef = useRef<Record<string, NodeJS.Timeout>>({});

  useEffect(() => {
    return () => {
      // Cleanup all intervals on unmount
      Object.values(pollIntervalsRef.current).forEach(interval => clearInterval(interval as NodeJS.Timeout));
    };
  }, []);

  const pollIngestionStatus = async (docId: string, toastId: string) => {
    if (pollIntervalsRef.current[docId]) {
      const existing = pollIntervalsRef.current[docId] as any;
      if (existing.close) existing.close();
      else clearInterval(existing);
    }
    
    const eventSource = ApiService.getEventSource(`/kt/documents/${docId}/ingestion-status/stream`);
    
    eventSource.onmessage = (event) => {
      try {
        const res = JSON.parse(event.data);
        if (res.status === 'processing') {
          const msg = `Extracting entities... (Nodes: ${res.nodes_created || 0})`;
          setIngestionStatuses(prev => ({ ...prev, [docId]: msg }));
          toast.loading(`Ingesting: ${msg}`, { id: toastId });
        } else if (res.status === 'completed' || res.status === 'Complete' || res.status === 'COMPLETE') {
          eventSource.close();
          delete pollIntervalsRef.current[docId];
          setIngestionStatuses(prev => ({ ...prev, [docId]: 'Completed' }));
          toast.success(`Ingestion complete! Nodes: ${res.nodes_created || 0}, Edges: ${res.edges_created || 0}`, { id: toastId });
          setProcessingIds(prev => {
            const copy = new Set(prev);
            copy.delete(docId);
            return copy;
          });
          fetchInbox();
        } else if (res.status === 'failed') {
          eventSource.close();
          delete pollIntervalsRef.current[docId];
          setIngestionStatuses(prev => ({ ...prev, [docId]: 'Failed' }));
          toast.error(`Ingestion failed: ${res.error_message || 'Unknown error'}`, { id: toastId });
          setProcessingIds(prev => {
            const copy = new Set(prev);
            copy.delete(docId);
            return copy;
          });
        }
      } catch (e) {
        console.error('SSE parsing error', e);
      }
    };
    
    eventSource.onerror = () => {
      eventSource.close();
      delete pollIntervalsRef.current[docId];
      setProcessingIds(prev => {
        const copy = new Set(prev);
        copy.delete(docId);
        return copy;
      });
    };
    
    pollIntervalsRef.current[docId] = eventSource as any;
  };

  const handleApprove = async (docId: string) => {
    if (processingIds.has(docId)) return;

    // Add to processing locks
    setProcessingIds(prev => {
      const copy = new Set(prev);
      copy.add(docId);
      return copy;
    });
    
    setIngestionStatuses(prev => ({ ...prev, [docId]: 'Approving...' }));

    const toastId = `approve-${docId}`;
    try {
      // 1. Double Approval Safeguard: reviewKTDocument(approved)
      toast.loading('1/2 Approving document registry...', { id: toastId });
      await ApiService.reviewKTDocument(docId, 'approved');

      // 2. Sequential Ingestion Trigger: triggerKTIngestion()
      toast.loading('2/2 Triggering graph ingestion pipeline...', { id: toastId });
      setIngestionStatuses(prev => ({ ...prev, [docId]: 'Triggering ingestion...' }));
      await ApiService.triggerKTIngestion(docId);

      // Start polling status
      pollIngestionStatus(docId, toastId);
      
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to approve and ingest document', { id: toastId });
      setProcessingIds(prev => {
        const copy = new Set(prev);
        copy.delete(docId);
        return copy;
      });
      setIngestionStatuses(prev => {
        const copy = { ...prev };
        delete copy[docId];
        return copy;
      });
    }
  };

  const handleOpenRejection = (docId: string) => {
    if (processingIds.has(docId)) return;
    setRejectingDocId(docId);
    setRejectionNotes('');
  };

  const handleConfirmRejection = async () => {
    if (!rejectingDocId) return;
    if (!rejectionNotes.trim()) {
      toast.error('Provide rejection reason notes');
      return;
    }

    setSubmittingRejection(true);
    try {
      await ApiService.reviewKTDocument(rejectingDocId, 'rejected', rejectionNotes);
      toast.success('Document marked as rejected with notes');
      setRejectingDocId(null);
      fetchInbox();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject document');
    } finally {
      setSubmittingRejection(false);
    }
  };

  const isAnyProcessing = processingIds.size > 0;
  
  return (
    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar relative z-10 max-w-7xl mx-auto w-full">
      <header className="mb-12">
        <div className="flex items-center gap-2 mb-2 text-[var(--color-brand-primary)]">
          <Sparkles size={16} />
          <span className="text-xs font-black uppercase tracking-widest">Verification Desk</span>
        </div>
        <h1 className="text-4xl font-black text-[var(--color-on-surface)] tracking-tight">Mentor Inbox Review</h1>
        <p className="text-[var(--color-on-surface-variant)] text-sm mt-1 max-w-xl">
          Approve pending engineering spec uploads, audit coverage levels, and ingestion sequences.
        </p>

        <div className="flex gap-4 mt-8 bg-[var(--color-surface-container)]/50 p-2 rounded-2xl w-max border border-[var(--color-outline-variant)]">
          <button 
            onClick={() => setActiveTab('Inbox')}
            className={`px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${activeTab === 'Inbox' ? 'bg-[var(--color-brand-primary-container)] text-white shadow-lg' : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]'}`}
          >
            Review Inbox
          </button>
          <button 
            onClick={() => setActiveTab('Unanswered')}
            className={`px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'Unanswered' ? 'bg-[var(--color-warning)] text-[var(--color-on-surface)] shadow-lg' : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-warning)]'}`}
          >
            <AlertTriangle size={14} />
            Unanswered AI Queries
          </button>
        </div>
      </header>

      {activeTab === 'Unanswered' ? (
        <div className="space-y-4">
          {loadingGaps ? (
            <div className="h-[300px] flex items-center justify-center">
              <Loader2 className="animate-spin text-[var(--color-brand-primary)]" size={32} />
            </div>
          ) : orphanedQueries.length === 0 ? (
            <div className="h-[300px] flex flex-col items-center justify-center text-[var(--color-on-surface-variant)] border border-[var(--color-outline-variant)] border-dashed rounded-[2rem] bg-[var(--color-surface-container)]/20">
                <Mail size={48} className="mb-4 opacity-50 text-[var(--color-warning)]" />
                <h3 className="text-xl font-bold text-[var(--color-on-surface-variant)]">No orphaned queries found</h3>
                <p className="text-sm mt-2 max-w-md text-center">The AI knowledge graph has successfully answered all recent user prompts. When it fails, the orphaned queries will queue here for Mentor review.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orphanedQueries.map((gap) => (
                <div key={gap.id} className="bg-[var(--color-surface-container)]/40 border border-[var(--color-outline-variant)] rounded-[2rem] p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/20 flex items-center justify-center text-[var(--color-warning)] shrink-0">
                      <AlertTriangle size={22} />
                    </div>
                    <div>
                      <h3 className="text-[var(--color-on-surface)] font-bold text-base">"{gap.query_text}"</h3>
                      <p className="text-[var(--color-on-surface-variant)] text-xs mt-1">Asked {gap.occurrence_count} times</p>
                      <div className="flex flex-wrap gap-3 mt-3 text-[10px] font-bold text-[var(--color-on-surface-variant)]">
                        <span className="bg-[var(--color-surface-dim)] px-2.5 py-1 rounded-lg border border-[var(--color-outline-variant)]">
                          Last Ask: {new Date(gap.last_asked_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      onClick={() => {
                        toast.loading('Resolving gap...', { id: gap.id });
                        ApiService.request(`/kt/insights/gaps/${gap.id}/resolve`, { method: 'PATCH' })
                          .then(() => {
                            toast.success('Gap marked as resolved', { id: gap.id });
                            fetchGaps();
                          })
                          .catch((e) => toast.error(e.message, { id: gap.id }));
                      }}
                      className="bg-[var(--color-surface-container-high)] hover:bg-[var(--color-success)]/40 hover:text-[var(--color-success)] text-[var(--color-on-surface-variant)] px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2"
                    >
                      <Check size={14} />
                      Mark Resolved
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : loading ? (
        <div className="h-[300px] flex items-center justify-center">
          <Loader2 className="animate-spin text-[var(--color-brand-primary)]" size={32} />
        </div>
      ) : (
        <div className="space-y-4">
          {inbox.map((item) => {
            const isProcessing = processingIds.has(item.id);
            const statusMsg = ingestionStatuses[item.id];
            return (
              <div 
                key={item.id}
                className="bg-[var(--color-surface-container)]/40 border border-[var(--color-outline-variant)] rounded-[2rem] p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--color-brand-primary-container)]/10 border border-[var(--color-brand-primary)]/20 flex items-center justify-center text-[var(--color-brand-primary)] shrink-0">
                    <FileText size={22} />
                  </div>
                  <div>
                    <h3 className="text-[var(--color-on-surface)] font-bold text-base">{item.title || 'Untitled Document'}</h3>
                    <p className="text-[var(--color-on-surface-variant)] text-xs mt-1">Submitted by: {item.author_name || 'Incoming engineer'}</p>
                    
                    <div className="flex flex-wrap gap-3 mt-3 text-[10px] font-bold text-[var(--color-on-surface-variant)]">
                      <span className="bg-[var(--color-surface-dim)] px-2.5 py-1 rounded-lg border border-[var(--color-outline-variant)]">
                        {item.doc_type || 'Spec'}
                      </span>
                      {item.sprint && (
                        <span className="bg-[var(--color-surface-dim)] px-2.5 py-1 rounded-lg border border-[var(--color-outline-variant)]">
                          {item.sprint}
                        </span>
                      )}
                      {statusMsg && (
                        <span className="bg-[var(--color-brand-primary-container)]/20 text-[var(--color-brand-primary)] px-2.5 py-1 rounded-lg border border-[var(--color-brand-primary)]/30 flex items-center gap-2">
                          <Loader2 size={10} className="animate-spin" /> {statusMsg}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => handleApprove(item.id)}
                    disabled={isProcessing}
                    className="bg-[var(--color-brand-primary-container)] hover:bg-[var(--color-brand-primary-container)]/90 disabled:bg-[var(--color-surface-container)] text-white px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-[var(--color-brand-primary)]/10 active:scale-95"
                  >
                    {isProcessing ? (
                      <Loader2 className="animate-spin" size={14} />
                    ) : (
                      <>
                        <Check size={14} />
                        Approve & Ingest
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleOpenRejection(item.id)}
                    disabled={isProcessing}
                    className="bg-[var(--color-surface-dim)] border border-[var(--color-outline-variant)] text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] hover:border-[var(--color-outline-variant)] px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2"
                  >
                    <X size={14} />
                    Reject
                  </button>
                </div>
              </div>
            );
          })}

          {inbox.length === 0 && (
            <div className="bg-[var(--color-surface-container)]/10 border border-[var(--color-outline-variant)] rounded-[2rem] p-12 text-center">
              <Mail className="mx-auto text-[var(--color-on-surface-variant)] mb-3" size={36} />
              <p className="text-[var(--color-on-surface-variant)] font-bold">Review Inbox Clear</p>
              <p className="text-xs text-[var(--color-on-surface-variant)] mt-1">All incoming engineering docs are validated, embedded, and indexed into the knowledge graph for grounded retrieval.</p>
            </div>
          )}
        </div>
      )}

      {/* Structured Rejection Modal */}
      <AnimatePresence>
        {rejectingDocId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--color-surface-dim)]/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              // Safely prevent closes/ backdrop dismiss when submitting
              onClick={(e) => e.stopPropagation()}
              className="bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] rounded-[2.5rem] p-8 max-w-lg w-full shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-[var(--color-danger)]/5 rounded-full blur-[60px] pointer-events-none" />
              
              <h3 className="text-xl font-bold text-[var(--color-on-surface)] mb-2 flex items-center gap-3">
                <ShieldAlert className="text-[var(--color-danger)]" size={22} />
                <span>Rejection Review Comments</span>
              </h3>
              <p className="text-[var(--color-on-surface-variant)] text-xs mb-6">
                Mentors are required to supply structured guidelines outlining missing requirements or logic gaps.
              </p>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-on-surface-variant)]">Structured Reason</label>
                  <textarea
                    placeholder="Describe missing system specs, sprint logic omissions, or required changes..."
                    rows={4}
                    className="w-full bg-[var(--color-surface-dim)] border border-[var(--color-outline-variant)] rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-[var(--color-danger)]/50 text-[var(--color-on-surface)] text-sm resize-none"
                    value={rejectionNotes}
                    onChange={(e) => setRejectionNotes(e.target.value)}
                    required
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t border-[var(--color-outline-variant)]">
                  <button
                    onClick={handleConfirmRejection}
                    disabled={submittingRejection || !rejectionNotes.trim()}
                    className="flex-1 bg-[var(--color-danger)] hover:bg-[var(--color-danger)] disabled:bg-[var(--color-surface-container)] text-[var(--color-on-surface)] py-3.5 rounded-2xl font-bold transition-all shadow-xl shadow-[var(--color-danger)]/25 flex items-center justify-center gap-2 text-sm"
                  >
                    {submittingRejection ? <Loader2 className="animate-spin" size={16} /> : 'Confirm Rejection'}
                  </button>
                  <button
                    onClick={() => {
                      if (!submittingRejection) setRejectingDocId(null);
                    }}
                    disabled={submittingRejection}
                    className="bg-[var(--color-surface-container-high)] hover:bg-[var(--color-surface-bright)] text-[var(--color-on-surface)] px-6 py-3.5 rounded-2xl font-bold transition-all border border-[var(--color-outline-variant)] text-sm"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
