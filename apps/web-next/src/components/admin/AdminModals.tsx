'use client';
/* Extracted verbatim from LDAdminDashboard.tsx (Phase 4 decomposition).
   eslint-disable-next-line — imports copied wholesale; unused ones are
   pruned in the Phase 6 lint pass. */
/* eslint-disable @typescript-eslint/no-unused-vars */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users, Building2, TrendingUp, ShieldCheck, Search, Plus,
  ChevronRight, ChevronDown, Layers, Settings, X,
  Filter, UserPlus, Database, Terminal, Target, Upload,
  Check, Loader2, ArrowLeft, Trash2, Mail, BadgeCheck, Download,
  Clock, Sparkles, BookmarkPlus, ShieldAlert, RefreshCw, FileText, Brain, Activity, Shield, Trophy,
  Play, CheckCircle, AlertCircle, Calendar, AlertTriangle, Info
} from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import ApiService, { ExecutiveSummary, BatchInsights } from '../../services/ApiService';
import { useToast } from '../ui/Toast';
import AssignmentCreationModal from '../dashboard/AssignmentCreationModal';
import CourseEnrollmentModal from '../dashboard/CourseEnrollmentModal';
import CodingQuestionModal from '../dashboard/CodingQuestionModal';
import BankCreationModal from '../dashboard/BankCreationModal';
import NotificationCenter from '../common/NotificationCenter';
import { ComparisonChart, CompositeHealthGauge, EngagementDecayWidget, PerformanceDistributionChart, LeaderboardTable } from '../dashboard/AnalyticsCharts';
import UserIntelPanel from '../dashboard/UserIntelPanel';
import QuestionManagement from '../dashboard/QuestionManagement';
import QuestionReportUI from './QuestionReportUI';
import DataIntegrityDashboard from '../dashboard/DataIntegrityDashboard';
import SystemHealthMonitor from '../dashboard/SystemHealthMonitor';

export function ResourceModal({ type, initialName = '', onClose, onSubmit, mode = 'CREATE' }: any) {
  const [name, setName] = useState(initialName);
  return (
    <div className="fixed inset-0 bg-[var(--color-surface-dim)]/80 backdrop-blur-md z-[130] flex items-center justify-center p-6">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] p-10 rounded-[3rem] w-full max-w-sm shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-brand" />
        <h3 className="text-2xl font-black text-[var(--color-on-surface)] mb-2">{mode === 'CREATE' ? 'Initialize' : 'Modify'} {type}</h3>
        <p className="text-[10px] text-[var(--color-on-surface-variant)] font-black uppercase tracking-widest mb-10">Strategic Structural Governance</p>

        <div className="space-y-1 mb-8">
          <label className="text-[9px] font-black uppercase tracking-widest text-[var(--color-on-surface-variant)] ml-2">Identifier</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={`Enter name...`}
            className="w-full bg-[var(--color-surface-dim)] border border-[var(--color-outline-variant)] rounded-2xl p-4 text-[var(--color-on-surface)] font-bold focus:ring-2 focus:ring-brand-primary/50 outline-none transition-all"
          />
        </div>

        <div className="flex gap-4">
          <button onClick={onClose} className="flex-1 py-4 font-black uppercase tracking-widest text-xs text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] transition-colors">Abort</button>
          <button
            onClick={() => onSubmit(name)}
            disabled={!name.trim() || name === initialName}
            className="flex-1 py-4 bg-brand-primary text-[var(--color-surface-dim)] rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-brand-primary/20 hover:brightness-110 disabled:opacity-30 disabled:grayscale transition-all"
          >
            {mode === 'CREATE' ? 'Execute' : 'Update'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}


export function DeleteModal({ type, name, onClose, onConfirm, processing }: any) {
  return (
    <div className="fixed inset-0 bg-[var(--color-danger)]/20 backdrop-blur-xl z-[140] flex items-center justify-center p-6">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[var(--color-surface-container)] border border-[var(--color-danger)]/30 p-10 rounded-[3rem] w-full max-w-sm shadow-2xl relative overflow-hidden text-center">
        <div className="w-20 h-20 bg-[var(--color-danger)]/10 rounded-full flex items-center justify-center mx-auto mb-6 text-[var(--color-danger)]">
          <ShieldAlert size={40} />
        </div>
        <h3 className="text-2xl font-black text-[var(--color-on-surface)] mb-2">Purge Request</h3>
        <p className="text-[10px] text-[var(--color-danger)] font-black uppercase tracking-[0.2em] mb-6">Irreversible Registry Deletion</p>

        <div className="p-6 bg-[var(--color-danger)]/5 rounded-3xl border border-[var(--color-danger)]/10 mb-8">
          <p className="text-sm text-[var(--color-on-surface-variant)]">Are you certain you want to purge <span className="text-[var(--color-on-surface)] font-bold">{name}</span> ({type}) from the organizational hierarchy?</p>
          <p className="text-[10px] text-[var(--color-danger)] font-black uppercase tracking-widest mt-4">All downstream dependencies will be lost.</p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            disabled={processing}
            onClick={onConfirm}
            className="w-full py-5 bg-[var(--color-danger)] text-[var(--color-on-surface)] rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-[var(--color-danger)]/40 hover:bg-[var(--color-danger)] transition-all flex items-center justify-center gap-3"
          >
            {processing ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            Confirm Purge
          </button>
          <button onClick={onClose} disabled={processing} className="w-full py-4 font-black uppercase tracking-widest text-xs text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] transition-colors">Cancel Protocol</button>
        </div>
      </motion.div>
    </div>
  );
}


export function BulkAddModal({ onClose, onSubmit, tree, currentUser }: any) {
  const isGroupAdmin = currentUser?.role === 'GroupAdmin';
  const assignedGroupId = currentUser?.assigned_groups?.[0] || currentUser?.group_id;

  const [groupId, setGroupId] = useState(isGroupAdmin && assignedGroupId ? String(assignedGroupId) : '');
  const [csvText, setCsvText] = useState('');
  const groups: any[] = [];
  tree?.forEach((o: any) => {
    o.departments?.forEach((d: any) => {
      d.verticals?.forEach((v: any) => {
        v.batches?.forEach((b: any) => {
          b.groups?.forEach((g: any) => {
            groups.push({ id: g.id, name: `${o.name} > ${b.name} > ${g.name}` });
          });
        });
      });
    });
  });
  return (
    <div className="fixed inset-0 bg-[var(--color-surface-dim)]/90 backdrop-blur-xl z-[130] flex items-center justify-center p-6">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] p-10 rounded-[3.5rem] w-full max-w-2xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-[var(--color-brand-primary-container)] shadow-[0_0_20px_rgba(99,102,241,0.5)]" />
        <h3 className="text-3xl font-black text-[var(--color-on-surface)] mb-2">Bulk Onboarding Protocol</h3>
        <p className="text-[10px] text-[var(--color-brand-primary)] font-black uppercase tracking-[0.3em] mb-10">Cross-Organization Network Bridging</p>
        <div className="space-y-8">
          <div>
            <label className="block text-[10px] font-black uppercase text-[var(--color-on-surface-variant)] mb-2">Operational Node Target</label>
            {isGroupAdmin ? (
              <div className="w-full bg-[var(--color-surface-dim)]/50 border border-[var(--color-brand-primary)]/30 rounded-2xl p-4 text-[var(--color-brand-primary)] font-bold flex items-center gap-2">
                <Shield size={14} /> {groups.find(g => String(g.id) === String(groupId))?.name || 'Authorized Scoped Context'}
              </div>
            ) : (
              <select value={groupId} onChange={(e) => setGroupId(e.target.value)} className="w-full bg-[var(--color-surface-dim)] border border-[var(--color-outline-variant)] rounded-2xl p-4 text-[var(--color-on-surface)] font-bold outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/30 transition-all">
                <option value="">Select Target Sync Point...</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            )}
          </div>
          <div className="flex items-center p-4 bg-[var(--color-brand-primary-container)]/5 rounded-2xl border border-[var(--color-brand-primary)]/10">
            <p className="text-[10px] text-[var(--color-brand-primary)] leading-relaxed font-bold">Each account receives individual credentials by email after onboarding.</p>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-[var(--color-on-surface-variant)] mb-2">Directory Registry (Format: Full Name, email@host.com)</label>
            <textarea value={csvText} onChange={(e) => setCsvText(e.target.value)} className="w-full h-48 bg-[var(--color-surface-dim)] border border-[var(--color-outline-variant)] rounded-3xl p-6 text-[var(--color-on-surface)] font-mono text-xs resize-none outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/30 transition-all" placeholder="John Wick, baba.yaga@continental.com" />
          </div>
          <div className="flex gap-4">
            <button onClick={onClose} className="flex-1 py-5 font-black uppercase tracking-widest text-xs text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] transition-colors">Cancel Protocol</button>
            <button onClick={() => {
              const lines = csvText.split('\n').filter(l => l.includes(','));
              const users = lines.map(l => {
                const [n, e] = l.split(',').map(s => s.trim());
                return { full_name: n, email: e, role: 'Member' };
              });
              onSubmit(parseInt(groupId), users);
            }} disabled={!groupId || !csvText.trim()} className="flex-1 py-5 bg-[var(--color-brand-primary-container)] text-white rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-xl shadow-[var(--color-brand-primary)]/30 hover:bg-[var(--color-brand-primary-container)] transition-all">Begin Synchronization</button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}


export function UserDetailsModal({ user, onClose }: { user: any; onClose: () => void }) {
  const { toast } = useToast();
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        const res = await ApiService.getUserInsights(user.id);
        console.log("Intel Sync Result:", res);
        setInsights(res);
      } catch (err) {
        console.error("Failed to fetch entity intel", err);
        toast('error', 'Intel Synchronization Failed: Neural link unstable.');
      } finally {
        setLoading(false);
      }
    };
    fetchInsights();
  }, [user.id]);

  const [generatingAtlas, setGeneratingAtlas] = useState(false);
  const handleGenerateAtlas = async () => {
    setGeneratingAtlas(true);
    try {
      const res = await ApiService.getMemberGrowthAtlas(user.id);
      console.log("Growth Atlas generated:", res);
      // We can show this in an alert or separate panel, for now toast success
      toast('success', 'AI Growth Atlas compiled! Summary injected into narrative.');
      // Refresh insights to show new narrative if backend updates it (or just rely on the toast for now)
      const fresh = await ApiService.getUserInsights(user.id);
      setInsights(fresh);
    } catch (err: any) {
      toast('error', 'Atlas generation failed — neural throughput limit reached.');
    } finally {
      setGeneratingAtlas(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[var(--color-surface-dim)]/90 backdrop-blur-xl z-[150] flex items-center justify-center p-6 overflow-y-auto">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-surface-container border border-surface-bright p-10 rounded-[4rem] w-full max-w-2xl shadow-2xl relative my-auto">
        <div className="flex justify-between items-start mb-10">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-[2.5rem] bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary text-4xl font-black shadow-lg shadow-brand-primary/5">{user.full_name?.[0] || 'U'}</div>
            <div>
              <h3 className="text-4xl font-black text-[var(--color-on-surface)] mb-2">{user.full_name}</h3>
              <div className="flex gap-2">
                <span className="px-3 py-1 rounded-lg bg-[var(--color-brand-primary-container)]/10 text-[var(--color-brand-primary)] text-[10px] font-black uppercase tracking-widest border border-[var(--color-brand-primary)]/20">Access: {user.role}</span>
                <span className="px-3 py-1 rounded-lg bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] text-[10px] font-black uppercase tracking-widest border border-[var(--color-outline-variant)]">GID: #{user.group_id}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[var(--color-surface-container-high)] rounded-full text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] transition-all"><X size={28} /></button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="p-6 bg-[var(--color-surface-container)]/50 border border-[var(--color-outline-variant)] rounded-3xl group hover:border-brand-primary/30 transition-all">
            <p className="text-[10px] font-black text-[var(--color-on-surface-variant)] uppercase tracking-[0.2em] mb-2">Network Identity</p>
            <div className="flex items-center gap-2">
              <Mail size={12} className="text-brand-primary/60" />
              <p className="text-xs font-bold text-[var(--color-on-surface)] truncate">{user.email}</p>
            </div>
          </div>
          <div className="p-6 bg-[var(--color-surface-container)]/50 border border-[var(--color-outline-variant)] rounded-3xl group hover:border-brand-primary/30 transition-all">
            <p className="text-[10px] font-black text-[var(--color-on-surface-variant)] uppercase tracking-[0.2em] mb-2">Pedagogical Sector</p>
            <div className="flex items-center gap-2">
              <Building2 size={12} className="text-brand-primary/60" />
              <p className="text-xs font-bold text-[var(--color-on-surface)] truncate">{user.batch_name || user.vertical_name || 'Autonomous Registry'}</p>
            </div>
          </div>
        </div>

        <div className="mb-10">
          <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-primary mb-6 flex items-center gap-2">
            <TrendingUp size={14} /> Comprehensive Sync Insights
          </h4>

          {loading ? (
            <div className="p-12 bg-[var(--color-surface-container)]/40 rounded-[2.5rem] border border-[var(--color-outline-variant)] flex flex-col items-center justify-center gap-4 border-dashed">
              <Loader2 className="animate-spin text-brand-primary" size={32} />
              <p className="text-[10px] font-black text-[var(--color-on-surface-variant)] uppercase tracking-widest">Compiling Neural History...</p>
            </div>
          ) : insights ? (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { label: 'Sync Score', val: `${insights.metrics.synchronization.avg_accuracy}%`, color: 'indigo-400' },
                  { label: 'Group Avg Sync', val: `${insights.metrics.advanced.group_average_accuracy}%`, color: 'slate-400' },
                  { label: 'Weighted Prof.', val: `${insights.metrics.advanced.weighted_proficiency}%`, color: 'brand-primary' },
                  { label: 'Consistency', val: `${insights.metrics.advanced.consistency_score}%`, color: 'emerald-400' },
                  { label: 'Quiz Volume', val: insights.metrics.synchronization.volume, color: 'indigo-400' },
                  { label: 'Lab Success', val: `${insights.metrics.algorithmic_lab.success_rate}%`, color: 'emerald-400' },
                  { label: 'Sprint Streak', val: `${insights.metrics.advanced.streak} Days`, color: 'rose-400' }
                ].map((s, i) => (
                  <div key={i} className={`p-4 bg-[var(--color-surface-container)]/60 rounded-2xl border border-[var(--color-outline-variant)] text-center transition-all hover:bg-[var(--color-surface-container-high)]`}>
                    <p className="text-[7px] font-black text-[var(--color-on-surface-variant)] uppercase mb-1 tracking-widest">{s.label}</p>
                    <p className={`text-sm font-black text-[var(--color-on-surface)]`}>{s.val}</p>
                  </div>
                ))}
              </div>

              {/* Topic Mastery Matrix */}
              <div className="bg-[var(--color-surface-dim)]/50 border border-[var(--color-outline-variant)] rounded-[2.5rem] p-8">
                <p className="text-[10px] font-black text-brand-tertiary uppercase tracking-[0.2em] mb-6">Pedagogical Mastery Analysis</p>
                <div className="space-y-4">
                  {Array.isArray(insights.metrics?.synchronization?.topic_mastery) && insights.metrics.synchronization.topic_mastery.length > 0 ? insights.metrics.synchronization.topic_mastery.map((m: any, i: number) => (
                    <div key={i}>
                      <div className="flex justify-between text-[10px] font-bold text-[var(--color-on-surface-variant)] mb-2">
                        <span>{m.topic} <span className="text-[8px] text-[var(--color-on-surface-variant)] ml-2">({m.volume} attempts)</span></span>
                        <span className={m.status === 'Elite' ? 'text-brand-primary' : 'text-[var(--color-brand-primary)]'}>{m.status} • {m.accuracy}%</span>
                      </div>
                      <div className="h-1.5 bg-[var(--color-surface-container)] rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${m.accuracy}%` }}
                          className={`h-full ${m.accuracy > 90 ? 'bg-brand-primary' : 'bg-brand-tertiary'}`}
                        />
                      </div>
                    </div>
                  )) : (
                    <p className="text-[9px] text-[var(--color-on-surface-variant)] italic">No topic mastery data detected in current cycle.</p>
                  )}
                </div>
              </div>

              {/* Activity Timeline Trace */}
              <div className="bg-[var(--color-surface-dim)]/50 border border-[var(--color-outline-variant)] rounded-[2.5rem] p-8">
                <p className="text-[10px] font-black text-[var(--color-success)] uppercase tracking-[0.2em] mb-6">Activity Symmetry Trace (Last 30 Cycles)</p>
                <div className="flex items-end justify-between h-20 gap-1 px-2">
                  {(insights.metrics.timeline || []).map((d: any, i: number) => (
                    <div key={i} className="flex-1 group relative">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${Math.min((d.activity || 0) * 20, 100)}%` }}
                        className={`w-full rounded-t-sm ${(d.activity || 0) > 0 ? 'bg-[var(--color-success)]/40 hover:bg-[var(--color-success)] border-x border-[var(--color-success)]/20' : 'bg-[var(--color-surface-container-high)]'}`}
                      />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] p-2 rounded-lg text-[8px] text-[var(--color-on-surface)] whitespace-nowrap z-10 shadow-2xl">
                        {d.date}: {d.activity || 0} Intels
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-8 bg-brand-primary/5 border border-brand-primary/20 rounded-[2.5rem] relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/10 blur-[60px] -mr-16 -mt-16" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-brand-tertiary/5 blur-[50px] -ml-16 -mb-16" />

                <div className="flex justify-between items-center mb-4">
                  <p className="text-[10px] font-black text-brand-primary uppercase tracking-[0.2em] flex items-center gap-2">
                    <Sparkles size={12} className="text-brand-primary" /> AI Pedagogical Growth Narrative
                  </p>
                  <button
                    onClick={handleGenerateAtlas}
                    disabled={generatingAtlas}
                    className="bg-brand-primary/10 hover:bg-brand-primary hover:text-[var(--color-surface-dim)] text-brand-primary px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all border border-brand-primary/20 disabled:opacity-50"
                  >
                    {generatingAtlas ? (
                      <div className="flex items-center gap-1.5">
                        <Loader2 size={10} className="animate-spin" /> Analyzing...
                      </div>
                    ) : (
                      'Enrich Atlas'
                    )}
                  </button>
                </div>

                <p className="text-xs font-bold text-[var(--color-on-surface-variant)] leading-relaxed italic relative z-10 transition-all group-hover:text-[var(--color-on-surface)]">
                  "{insights.ai_narrative || "Synthesizing neural progress patterns for executive summary..."}"
                </p>

                {insights.metrics.study_path && insights.metrics.study_path.length > 0 && (
                  <div className="mt-6 border-t border-[var(--color-outline-variant)] pt-4 relative z-10">
                    <p className="text-[10px] font-black text-brand-tertiary uppercase tracking-[0.2em] mb-3">AI Recommended Study Path</p>
                    <div className="flex gap-2 max-w-full overflow-x-auto pb-2">
                      {(Array.isArray(insights.metrics?.study_path) ? insights.metrics.study_path : []).map((path: any, i: number) => (
                        <div key={i} className="flex-none bg-[var(--color-surface-container)] border border-brand-tertiary/20 px-4 py-3 rounded-xl min-w-[200px]">
                          <p className="text-[9px] text-[var(--color-on-surface-variant)] uppercase tracking-widest mb-1 font-bold">{path.chapter || "Fundamentals"}</p>
                          <p className="text-xs font-black text-[var(--color-on-surface)] truncate">{path.name}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Detailed Log Fragment */}
              <div className="bg-[var(--color-surface-dim)]/50 border border-[var(--color-outline-variant)] rounded-[2.5rem] p-8">
                <div className="flex items-center justify-between mb-6">
                  <p className="text-[10px] font-black text-brand-primary uppercase tracking-[0.2em]">Neural Execution Logs (Last 25 Fragments)</p>
                  <div className="flex gap-2">
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[var(--color-brand-primary-container)]/10 border border-[var(--color-brand-primary)]/20 text-[8px] font-bold text-[var(--color-brand-primary)]">
                      <div className="w-1 h-1 rounded-full bg-[var(--color-brand-primary-container)] animate-pulse" /> QUIZ
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[var(--color-success)]/10 border border-[var(--color-success)]/20 text-[8px] font-bold text-[var(--color-success)]">
                      <div className="w-1 h-1 rounded-full bg-[var(--color-success)] animate-pulse" /> CODE
                    </div>
                  </div>
                </div>

                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {Array.isArray(insights.raw_logs) && insights.raw_logs.map((log: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-[var(--color-surface-container-high)] rounded-2xl border border-[var(--color-outline-variant)] hover:border-[var(--color-outline-variant)] transition-all group">
                      <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-[8px] ${log.type === 'QUIZ' ? 'bg-[var(--color-brand-primary-container)]/20 text-[var(--color-brand-primary)]' : 'bg-[var(--color-success)]/20 text-[var(--color-success)]'
                          }`}>
                          {log.type}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[var(--color-on-surface)] group-hover:text-brand-primary transition-colors">{log.title}</p>
                          <div className="flex gap-2 mt-1">
                            <span className="text-[9px] text-[var(--color-on-surface-variant)] font-bold">{new Date(log.timestamp).toLocaleDateString()}</span>
                            <span className="text-[9px] text-[var(--color-on-surface-variant)] font-bold">|</span>
                            <span className="text-[9px] text-[var(--color-on-surface-variant)] font-bold uppercase tracking-widest">{log.type}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-[var(--color-on-surface)]">{log.result}</p>
                        <p className="text-[9px] text-[var(--color-on-surface-variant)] font-bold flex items-center justify-end gap-1"><Clock size={10} /> {log.efficiency || 'Neural Fast-Path'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-10 bg-[var(--color-surface-container)]/40 rounded-[2.5rem] border border-[var(--color-outline-variant)] text-center animate-pulse">
              <p className="text-[10px] font-black text-[var(--color-on-surface-variant)] uppercase">Synchronicity Link Severed</p>
            </div>
          )}
        </div>

        <button onClick={onClose} className="w-full py-5 bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)] rounded-3xl font-black uppercase tracking-widest text-xs text-[var(--color-on-surface)] hover:bg-[var(--color-surface-bright)] transition-all flex items-center justify-center gap-2">
          <BadgeCheck size={16} /> Acknowledge Intell Sync
        </button>
      </motion.div>
    </div>
  );
}

// ─── System Health Panel ─────────────────────────────────────────────────────
// Replaces hardcoded "Cluster Operational" static HTML with real API data

export function CreationModal({ type, onClose, onSubmit }: { type: string, onClose: () => void, onSubmit: (name: string) => void }) {
  const [name, setName] = React.useState('');
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[var(--color-surface-dim)]/80 backdrop-blur-md" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] rounded-[2.5rem] p-10 w-full max-w-md shadow-2xl"
      >
        <h3 className="text-2xl font-black text-[var(--color-on-surface)] mb-6">Create New {type}</h3>
        <input
          autoFocus
          className="w-full bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)] rounded-2xl p-5 text-[var(--color-on-surface)] mb-6"
          placeholder={`${type} Name`}
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && name.trim() && onSubmit(name)}
        />
        <div className="flex gap-4">
          <button onClick={onClose} className="flex-1 py-4 bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] rounded-2xl font-black">Cancel</button>
          <button
            disabled={!name.trim()}
            onClick={() => onSubmit(name)}
            className="flex-1 py-4 bg-[var(--color-brand-primary-container)] text-white rounded-2xl font-black disabled:opacity-50"
          >
            Create
          </button>
        </div>
      </motion.div>
    </div>
  );
}


