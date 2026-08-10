/**
 * UserIntelPanel.tsx
 * High-fidelity, 30-dimension intelligence panel for deep learner analytics.
 * Provides real-time synchronization with the backend PerformanceEngine.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Sparkles, Loader2, Target, TrendingUp, TrendingDown, Flame,
  BookOpen, Code2, Clock, Trophy, BarChart3, Shield,
  RefreshCw, ChevronRight, Brain, Zap, Map, ExternalLink, Activity
} from 'lucide-react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, Cell,
  CartesianGrid
} from 'recharts';
import ApiService, { AIResponseEnvelope } from '../../services/ApiService';
import { useToast } from '../ui/Toast';
import InterventionModal from './InterventionModal';

interface UserIntelPanelProps {
  userId: number;
  onClose: () => void;
  onViewPremium?: (slug: string) => void;
}

export default function UserIntelPanel({ userId, onClose, onViewPremium }: UserIntelPanelProps) {
  const { toast } = useToast();
  const [intel, setIntel] = useState<any>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<'overview' | 'topics' | 'trend' | 'ai' | 'atlas'>('overview');
  const [showIntervention, setShowIntervention] = useState(false);
  const [atlas, setAtlas] = useState<string[] | null>(null);
  const [atlasLoading, setAtlasLoading] = useState(false);
  const [consistency, setConsistency] = useState<any>(null);
  const [consistencyLoading, setConsistencyLoading] = useState(false);

  const fetchIntel = useCallback(async (refresh: boolean = false) => {
    setLoading(true);
    setConsistencyLoading(true);
    try {
      const [data, consistencyData] = await Promise.all([
        ApiService.getUserIntel(userId, refresh),
        ApiService.getUserConsistency(userId).catch(() => null)
      ]);
      setIntel(data);
      setConsistency(consistencyData);
      if (refresh) toast('success', 'Intelligence Matrix Synchronized');
    } catch (err: any) {
      toast('error', `Synchronization failure: ${err.message}`);
    } finally {
      setLoading(false);
      setConsistencyLoading(false);
    }
  }, [userId, toast]);


  const generateAISummary = async (refresh: boolean = false) => {
    setAiLoading(true);
    try {
      const data = await ApiService.getUserAISummary(userId, refresh) as AIResponseEnvelope;
      setAiSummary(data.data?.summary || (data as any).summary);
      toast('success', 'AI Cognitive Analysis Synthesized');
    } catch (err: any) {
      toast('error', 'AI Engine timeout: Synthesis aborted');
    } finally {
      setAiLoading(false);
    }
  };

  const fetchGrowthAtlas = async (refresh: boolean = false) => {
    if (!intel?.user) return;
    setAtlasLoading(true);
    try {
      const slug = intel.user.custom_slug || intel.user.id.toString();
      const res = await ApiService.getProfileAtlas(slug, refresh) as any;
      const atlasData = res.data?.atlas || res.atlas?.data || res.data || res.atlas;
      setAtlas(Array.isArray(atlasData) ? atlasData : null);
      toast('success', 'Growth Atlas Mapped');
    } catch (err: any) {
      toast('error', 'Growth engine failure: Mapping aborted');
    } finally {
      setAtlasLoading(false);
    }
  };

  useEffect(() => {
    fetchIntel();
  }, [fetchIntel]);

  const user = intel?.user || {};
  const metrics = intel?.metrics || {};
  const charts = intel?.charts || {};
  const vectors = intel?.raw_vectors || {};

  const radarData = useMemo(() => [
    { subject: 'Velocity', value: Math.min(100, Math.max(0, 50 + (vectors.m17_velocity || 0) * 5)) },
    { subject: 'Precision', value: vectors.m02_overall_accuracy || 0 },
    { subject: 'Consistency', value: vectors.m18_consistency || 0 },
    { subject: 'Retention', value: Math.max(0, 100 - (vectors.m27_decay_rate || 0) * 2) },
    { subject: 'Success', value: vectors.m14_coding_success || 0 },
    { subject: 'Percentile', value: vectors.m26_percentile || 0 },
  ], [vectors]);

  const sections = [
    { id: 'overview', label: 'Matrix Overview', icon: BarChart3 },
    { id: 'topics', label: 'Domain Mastery', icon: BookOpen },
    { id: 'trend', label: 'Activity Trend', icon: TrendingUp },
    { id: 'ai', label: 'AI Cognitive Report', icon: Brain },
    { id: 'atlas', label: 'Growth Atlas', icon: Map },
  ];

  const riskColor = metrics.m29_risk?.value?.includes('High') ? 'text-[var(--color-danger)]' : 
                    metrics.m29_risk?.value?.includes('Medium') ? 'text-[var(--color-warning)]' : 'text-[var(--color-success)]';

  if (loading && !intel) {
    return (
      <div className="fixed inset-0 bg-[var(--color-surface-dim)]/80 backdrop-blur-md flex items-center justify-center z-[100]">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <Loader2 size={48} className="text-[var(--color-brand-primary)] animate-spin" />
            <div className="absolute inset-0 blur-xl bg-[var(--color-brand-primary-container)]/20 animate-pulse" />
          </div>
          <p className="text-[var(--color-brand-primary)] font-black tracking-widest text-xs uppercase animate-pulse">Synchronizing Intelligence...</p>
        </div>
      </div>
    );
  }

  if (!intel) return null;

  return (
    <div className="fixed inset-0 z-[90] flex justify-end pointer-events-none">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto" onClick={onClose} />
      
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="relative w-full max-w-2xl h-full bg-[var(--color-surface-container)] border-l border-[var(--color-outline-variant)] shadow-[0_0_100px_rgba(0,0,0,0.5)] flex flex-col pointer-events-auto overflow-hidden"
      >
        {/* Top Header */}
        <div className="p-8 border-b border-[var(--color-outline-variant)] bg-[var(--color-surface-container)]/50 backdrop-blur-xl shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="relative group">
                <div className="w-16 h-16 rounded-2xl bg-[var(--color-brand-primary-container)]/20 border border-[var(--color-brand-primary)]/30 flex items-center justify-center overflow-hidden group-hover:border-[var(--color-brand-primary)]/50 transition-all">
                  {user.profile_photo_url ? (
                    <img src={user.profile_photo_url} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <span className="text-2xl font-black text-[var(--color-brand-primary)]">{user.full_name?.charAt(0)}</span>
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[var(--color-success)] border-2 border-[var(--color-outline-variant)] rounded-full" />
              </div>
              
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-black text-[var(--color-on-surface)] tracking-tight">{user.full_name}</h2>
                  <span className="px-2.5 py-1 bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)] rounded-lg text-[10px] font-black text-[var(--color-on-surface-variant)] uppercase tracking-widest">
                    {user.role}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-2">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-[var(--color-on-surface-variant)]">
                    <Flame size={12} className="text-orange-500" /> {metrics.m07_streak?.value || '0d'} Streak
                  </span>
                  <span className={`flex items-center gap-1.5 text-xs font-bold ${riskColor}`}>
                    <Target size={12} /> {metrics.m29_risk?.value || 'Stable'}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs font-bold text-[var(--color-brand-primary)]">
                    <Activity size={12} /> {metrics.m26_percentile?.value || '0'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => fetchIntel(true)} disabled={loading} className="p-3 bg-[var(--color-surface-container-high)] hover:bg-[var(--color-surface-bright)] text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] rounded-xl transition-all border border-[var(--color-outline-variant)]">
                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              </button>
              <button onClick={onClose} className="p-3 bg-[var(--color-surface-container-high)] hover:bg-[var(--color-surface-bright)] text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] rounded-xl transition-all border border-[var(--color-outline-variant)]">
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="flex gap-2 mt-8 overflow-x-auto no-scrollbar pb-1">
            {sections.map(sec => {
              const Icon = sec.icon;
              const isActive = activeSection === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => setActiveSection(sec.id as any)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${
                    isActive 
                      ? 'bg-[var(--color-brand-primary-container)] text-white border-[var(--color-brand-primary)] shadow-lg shadow-[var(--color-brand-primary)]/20' 
                      : 'bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] border-transparent hover:text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-bright)]'
                  }`}
                >
                  <Icon size={12} />
                  {sec.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Bar */}
        <div className="px-8 py-4 bg-[var(--color-brand-primary-container)]/5 border-b border-[var(--color-outline-variant)] flex items-center justify-between shrink-0">
          <p className="text-[10px] font-black text-[var(--color-brand-primary)] uppercase tracking-[0.2em]">Administrative Controls</p>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowIntervention(true)} className="flex items-center gap-2 px-4 py-1.5 bg-[var(--color-danger)]/10 hover:bg-[var(--color-danger)] text-[var(--color-danger)] hover:text-[var(--color-on-surface)] border border-[var(--color-danger)]/20 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all">
              <Shield size={12} /> Intervene
            </button>
            <button onClick={() => onViewPremium?.(user.custom_slug || user.id.toString())} className="flex items-center gap-2 px-4 py-1.5 bg-[var(--color-brand-primary-container)]/10 hover:bg-[var(--color-brand-primary-container)] text-[var(--color-brand-primary)] hover:text-white border border-[var(--color-brand-primary)]/20 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all">
              <ExternalLink size={12} /> Full Profile
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 scrollbar-thin scrollbar-thumb-white/10">
          <AnimatePresence mode="wait">
            
            {/* OVERVIEW SECTION */}
            {activeSection === 'overview' && (
              <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8">
                {/* Core Vectors */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="col-span-2 bg-[var(--color-surface-container-high)]/40 border border-[var(--color-outline-variant)] rounded-3xl p-6 flex flex-col items-center">
                    <p className="text-[10px] font-black text-[var(--color-on-surface-variant)] uppercase tracking-widest mb-6 w-full text-center">Intelligence Radar</p>
                    <div className="h-48 w-full">
                      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                        <RadarChart data={radarData}>
                          <PolarGrid stroke="rgba(255,255,255,0.05)" />
                          <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 8, fontWeight: 900 }} />
                          <Radar name="Vectors" dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} strokeWidth={2} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  
                  <div className="col-span-3 grid grid-cols-2 gap-3">
                    {[
                      { label: 'Overall Accuracy', value: metrics.m02_overall_accuracy?.value, icon: Target, color: 'text-[var(--color-success)]', bg: 'bg-[var(--color-success)]/10' },
                      { label: 'Engagement Profile', value: metrics.m28_engagement?.value, icon: Zap, color: 'text-[var(--color-brand-primary)]', bg: 'bg-[var(--color-brand-primary-container)]/10' },
                      { label: 'Learning Trajectory', value: metrics.m17b_velocity_label?.value, icon: TrendingUp, color: 'text-[var(--color-brand-primary)]', bg: 'bg-[var(--color-brand-primary-container)]/10' },
                      { label: 'Group Percentile', value: metrics.m26_percentile?.value, icon: Trophy, color: 'text-[var(--color-warning)]', bg: 'bg-[var(--color-warning)]/10' },
                    ].map((s, i) => (
                      <div key={i} className={`${s.bg} border border-[var(--color-outline-variant)] rounded-2xl p-4 flex flex-col justify-between`}>
                        <div className="flex items-center gap-2">
                          <s.icon size={12} className={s.color} />
                          <p className="text-[9px] font-black text-[var(--color-on-surface-variant)] uppercase tracking-widest truncate">{s.label}</p>
                        </div>
                        <p className={`text-xl font-black ${s.color} mt-2`}>{s.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Scientific Consistency Matrix */}
                {consistency && (
                  <div className="bg-[var(--color-surface-container-high)]/40 border border-[var(--color-outline-variant)] rounded-3xl p-6 space-y-4 backdrop-blur-md">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Activity size={16} className="text-[var(--color-brand-primary)]" />
                        <h4 className="text-xs font-black text-[var(--color-on-surface)] uppercase tracking-[0.2em]">Scientific Consistency Analysis</h4>
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-[var(--color-brand-primary-container)]/10 text-[var(--color-brand-primary)] border border-[var(--color-brand-primary)]/20">
                        Method #15 (CV)
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="bg-[var(--color-surface-container-high)] rounded-2xl p-4 flex flex-col justify-between">
                        <p className="text-[9px] font-black text-[var(--color-on-surface-variant)] uppercase tracking-widest">Consistency Index</p>
                        <p className="text-xl font-black text-[var(--color-brand-primary)] mt-1">{(consistency.consistency_index || 0).toFixed(2)}%</p>
                        <p className="text-[8px] font-black text-[var(--color-on-surface-variant)] mt-1 uppercase tracking-wider">Coefficient of Var.</p>
                      </div>

                      <div className="bg-[var(--color-surface-container-high)] rounded-2xl p-4 flex flex-col justify-between">
                        <p className="text-[9px] font-black text-[var(--color-on-surface-variant)] uppercase tracking-widest">Status / Profile</p>
                        <p className="text-sm font-black text-[var(--color-success)] mt-1 uppercase tracking-wider truncate">{consistency.consistency_status || 'N/A'}</p>
                        <p className="text-[8px] font-black text-[var(--color-on-surface-variant)] mt-1 uppercase tracking-wider">Stability Grade</p>
                      </div>

                      <div className="bg-[var(--color-surface-container-high)] rounded-2xl p-4 flex flex-col justify-between">
                        <p className="text-[9px] font-black text-[var(--color-on-surface-variant)] uppercase tracking-widest">Mean Accuracy</p>
                        <p className="text-xl font-black text-[var(--color-on-surface)] mt-1">{(consistency.mean_accuracy || 0).toFixed(2)}%</p>
                        <p className="text-[8px] font-black text-[var(--color-on-surface-variant)] mt-1 uppercase tracking-wider">Average Performance</p>
                      </div>

                      <div className="bg-[var(--color-surface-container-high)] rounded-2xl p-4 flex flex-col justify-between">
                        <p className="text-[9px] font-black text-[var(--color-on-surface-variant)] uppercase tracking-widest">Standard Deviation</p>
                        <p className="text-xl font-black text-[var(--color-brand-primary)] mt-1">{(consistency.standard_deviation || 0).toFixed(2)}</p>
                        <p className="text-[8px] font-black text-[var(--color-on-surface-variant)] mt-1 uppercase tracking-wider">Performance Spread</p>
                      </div>
                    </div>

                    <div className="bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)] rounded-2xl p-4 flex gap-3 items-center">
                      <Brain size={24} className="text-[var(--color-brand-primary)] flex-shrink-0" />
                      <p className="text-xs text-[var(--color-on-surface-variant)] font-medium leading-relaxed">
                        {consistency.interpretation || 'No consistency profile synthesized yet.'}
                      </p>
                    </div>
                  </div>
                )}

                {/* The Full 30-Dimension Grid */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-[var(--color-on-surface)] uppercase tracking-[0.2em]">30-Metric Analytical Grid</h3>
                    <div className="h-px bg-[var(--color-surface-container-high)] flex-1 mx-4" />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {Object.values(metrics).map((m: any, i: number) => {
                      const typeColor = m.type === 'quantitative' ? 'text-[var(--color-brand-primary)]' : m.type === 'qualitative' ? 'text-[var(--color-brand-primary)]' : 'text-[var(--color-warning)]';
                      const bgColor = m.type === 'quantitative' ? 'bg-[var(--color-brand-primary-container)]/5' : m.type === 'qualitative' ? 'bg-[var(--color-brand-primary-container)]/5' : 'bg-[var(--color-warning)]/5';
                      return (
                        <div key={i} className={`${bgColor} border border-[var(--color-outline-variant)] rounded-2xl p-4 hover:border-[var(--color-outline-variant)] transition-all group`}>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-xs group-hover:scale-110 transition-transform">{m.icon}</span>
                            <p className={`text-[9px] font-black uppercase tracking-widest ${typeColor} truncate`}>{m.label}</p>
                          </div>
                          <p className="text-xs font-black text-[var(--color-on-surface)]">{m.value}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* TOPICS SECTION */}
            {activeSection === 'topics' && (
              <motion.div key="topics" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8">
                <div className="grid grid-cols-2 gap-4">
                  {charts.best_topic && (
                    <div className="bg-[var(--color-success)]/10 border border-[var(--color-success)]/20 rounded-3xl p-6">
                      <p className="text-[10px] font-black text-[var(--color-success)] uppercase tracking-widest mb-2">🏆 Peak Mastery</p>
                      <p className="text-[var(--color-on-surface)] font-black text-lg">{charts.best_topic.topic}</p>
                      <p className="text-3xl font-black text-[var(--color-success)] mt-1">{charts.best_topic.avg_accuracy}%</p>
                    </div>
                  )}
                  {charts.worst_topic && (
                    <div className="bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20 rounded-3xl p-6">
                      <p className="text-[10px] font-black text-[var(--color-danger)] uppercase tracking-widest mb-2">⚠️ Critical Gap</p>
                      <p className="text-[var(--color-on-surface)] font-black text-lg">{charts.worst_topic.topic}</p>
                      <p className="text-3xl font-black text-[var(--color-danger)] mt-1">{charts.worst_topic.avg_accuracy}%</p>
                    </div>
                  )}
                </div>

                <div className="bg-[var(--color-surface-container-high)]/40 border border-[var(--color-outline-variant)] rounded-3xl p-8">
                  <p className="text-[10px] font-black text-[var(--color-on-surface-variant)] uppercase tracking-widest mb-8">Topic Mastery Architecture</p>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                      <BarChart data={charts.topic_mastery} layout="vertical" margin={{ left: 10 }}>
                        <XAxis type="number" domain={[0, 100]} hide />
                        <YAxis type="category" dataKey="topic" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }} width={120} />
                        <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ background: '#0f172a', border: 'none', borderRadius: 12 }} />
                        <Bar dataKey="avg_accuracy" radius={[0, 10, 10, 0]} barSize={20}>
                          {charts.topic_mastery?.map((entry: any, i: number) => (
                            <Cell key={i} fill={entry.avg_accuracy >= 80 ? '#10b981' : entry.avg_accuracy >= 60 ? '#6366f1' : '#f43f5e'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TREND SECTION */}
            {activeSection === 'trend' && (
              <motion.div key="trend" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8">
                <div className="bg-[var(--color-surface-container-high)]/40 border border-[var(--color-outline-variant)] rounded-3xl p-8">
                  <div className="flex items-center justify-between mb-8">
                    <p className="text-[10px] font-black text-[var(--color-on-surface-variant)] uppercase tracking-widest">Cognitive Engagement Velocity</p>
                    <div className="px-3 py-1 bg-[var(--color-brand-primary-container)]/10 border border-[var(--color-brand-primary)]/20 rounded-full text-[10px] font-black text-[var(--color-brand-primary)]">
                      STREAK ACTIVE: {metrics.m07_streak?.value}
                    </div>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                      <AreaChart data={charts.activity_trend}>
                        <defs>
                          <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 10, fontWeight: 900 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 10 }} />
                        <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: 12 }} />
                        <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={3} fill="url(#trendGrad)" dot={{ r: 4, fill: '#6366f1', stroke: '#0f172a', strokeWidth: 2 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </motion.div>
            )}

            {/* AI SECTION */}
            {activeSection === 'ai' && (
              <motion.div key="ai" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                {aiLoading ? (
                  <div className="flex flex-col items-center justify-center py-32 gap-6">
                    <div className="relative">
                      <Loader2 size={48} className="text-[var(--color-brand-primary)] animate-spin" />
                      <Brain size={24} className="absolute inset-0 m-auto text-[var(--color-brand-primary)] animate-pulse" />
                    </div>
                    <p className="text-[var(--color-on-surface-variant)] text-sm font-black uppercase tracking-widest animate-pulse">Synthesizing Narrative...</p>
                  </div>
                ) : aiSummary ? (
                  <div className="bg-gradient-to-br from-[var(--color-brand-primary-container)]/20 to-[var(--color-surface-container)]/20 border border-[var(--color-brand-primary)]/20 rounded-[2.5rem] p-8">
                    <div className="flex items-center gap-3 mb-8">
                      <Sparkles className="text-[var(--color-brand-primary)]" size={24} />
                      <h3 className="text-lg font-black text-[var(--color-on-surface)] uppercase tracking-tight">Gemini Intelligence Report</h3>
                    </div>
                    <div className="space-y-6">
                      {aiSummary.split('\n').filter(Boolean).map((line, i) => (
                        <div key={i} className="flex gap-4 p-5 bg-[var(--color-surface-container-high)] rounded-2xl border border-[var(--color-outline-variant)] hover:border-[var(--color-brand-primary)]/30 transition-all">
                          <ChevronRight size={16} className="text-[var(--color-brand-primary)] shrink-0 mt-1" />
                          <p className="text-[var(--color-on-surface-variant)] leading-relaxed text-sm font-medium" 
                             dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<span class="text-[var(--color-on-surface)] font-black">$1</span>') }} />
                        </div>
                      ))}
                    </div>
                    <button onClick={() => generateAISummary(true)} className="mt-8 w-full py-4 bg-[var(--color-surface-container-high)] hover:bg-[var(--color-surface-bright)] text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] rounded-2xl text-xs font-black uppercase tracking-widest transition-all border border-[var(--color-outline-variant)] flex items-center justify-center gap-2">
                      <RefreshCw size={14} /> Regenerate Insights
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-32 gap-8 text-center">
                    <div className="w-24 h-24 bg-[var(--color-brand-primary-container)]/10 border border-[var(--color-brand-primary)]/20 rounded-[3rem] flex items-center justify-center">
                      <Brain size={48} className="text-[var(--color-brand-primary)]" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-[var(--color-on-surface)] mb-2 uppercase tracking-tight">Cognitive Engine Offline</h3>
                      <p className="text-[var(--color-on-surface-variant)] text-sm max-w-xs mx-auto leading-relaxed">Synthesize the 30-dimension matrix into a strategic natural language coaching narrative.</p>
                    </div>
                    <button onClick={() => generateAISummary()} className="px-10 py-5 bg-[var(--color-brand-primary-container)] hover:bg-[var(--color-brand-primary-container)] text-white rounded-[2rem] font-black uppercase tracking-widest flex items-center gap-3 shadow-2xl shadow-[var(--color-brand-primary)]/40 transition-all">
                      <Sparkles size={20} /> Generate AI Report
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {/* ATLAS SECTION */}
            {activeSection === 'atlas' && (
              <motion.div key="atlas" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                {atlasLoading ? (
                  <div className="flex flex-col items-center justify-center py-32 gap-6">
                    <Loader2 size={48} className="text-[var(--color-success)] animate-spin" />
                    <p className="text-[var(--color-on-surface-variant)] text-sm font-black uppercase tracking-widest animate-pulse">Mapping Pedagogy...</p>
                  </div>
                ) : atlas ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-black text-[var(--color-on-surface)] uppercase tracking-widest flex items-center gap-3">
                        <Map size={18} className="text-[var(--color-success)]" /> Strategic Growth Map
                      </h3>
                      <button onClick={() => fetchGrowthAtlas(true)} className="text-[10px] font-black text-[var(--color-on-surface-variant)] hover:text-[var(--color-success)] flex items-center gap-2 uppercase tracking-widest transition-all">
                        <RefreshCw size={12} /> Sync
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {atlas.map((point, i) => (
                        <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }} className="bg-[var(--color-surface-container-high)]/40 border border-[var(--color-outline-variant)] rounded-2xl p-5 hover:border-[var(--color-success)]/30 transition-all group">
                          <div className="flex items-start gap-4">
                            <div className="w-8 h-8 rounded-xl bg-[var(--color-success)]/10 border border-[var(--color-success)]/20 flex items-center justify-center shrink-0 group-hover:bg-[var(--color-success)] group-hover:text-[var(--color-on-surface-variant)] transition-all">
                              <span className="text-xs font-black">{i + 1}</span>
                            </div>
                            <p className="text-xs text-[var(--color-on-surface-variant)] leading-relaxed font-medium pt-1">
                              {point.replace(/\*\*(.*?)\*\*/g, '$1')}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-32 gap-8 text-center">
                    <div className="w-24 h-24 bg-[var(--color-success)]/10 border border-[var(--color-success)]/20 rounded-[3rem] flex items-center justify-center">
                      <Map size={48} className="text-[var(--color-success)]" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-[var(--color-on-surface)] mb-2 uppercase tracking-tight">Growth Map Unavailable</h3>
                      <p className="text-[var(--color-on-surface-variant)] text-sm max-w-xs mx-auto leading-relaxed">Map the learner's 30-point performance trajectory to identify strategic opportunities.</p>
                    </div>
                    <button onClick={() => fetchGrowthAtlas()} className="px-10 py-5 bg-[var(--color-success)] hover:bg-[var(--color-success)] text-[var(--color-surface-dim)] rounded-[2rem] font-black uppercase tracking-widest flex items-center gap-3 shadow-2xl shadow-[var(--color-success)]/40 transition-all">
                      <Sparkles size={20} /> Generate Growth Atlas
                    </button>
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        <InterventionModal
          isOpen={showIntervention}
          onClose={() => setShowIntervention(false)}
          targetUserIds={[userId]}
          targetUserNames={[user.full_name]}
        />
      </motion.div>
    </div>
  );
}
