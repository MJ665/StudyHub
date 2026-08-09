'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, Loader2, Sparkles, AlertTriangle, Layers, 
  BarChart3, PieChart, Activity, Building, Briefcase 
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, Radar, RadarChart, PolarGrid, 
  PolarAngleAxis, PolarRadiusAxis 
} from 'recharts';
import ApiService from '@/services/ApiService';
import { useKTNavStore } from '@/stores/ktNavStore';

export default function KTAnalyticsView() {
  const { selectedCompany } = useKTNavStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [companyData, setCompanyData] = useState<any[]>([]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        setError(null);
        const [stats, company] = await Promise.all([
          ApiService.getKTAnalyticsSummary(),
          ApiService.getKTCompanyAnalytics(selectedCompany?.id).catch(() => [])
        ]);
        setSummary(stats);
        setCompanyData(company || []);
      } catch (err: any) {
        console.error('Failed to load KT analytics:', err);
        setError(err.message || 'Failed to load analytics data.');
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [selectedCompany]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-[var(--color-brand-primary)]" size={36} />
          <p className="text-xs font-black uppercase tracking-widest text-[var(--color-on-surface-variant)]">Compiling analytics matrix...</p>
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20 rounded-2xl p-6 max-w-md text-center">
          <AlertTriangle className="text-[var(--color-danger)] mx-auto mb-4" size={32} />
          <h3 className="text-lg font-bold text-[var(--color-on-surface)] mb-2">Analytics Unavailable</h3>
          <p className="text-sm text-[var(--color-on-surface-variant)]">{error || 'Failed to fetch analytics data'}</p>
        </div>
      </div>
    );
  }

  // Real analytics from Postgres (no mock fallbacks). Field names match the
  // backend /kt/insights/summary payload.
  const coverage = Math.round(summary?.overall_health ?? 0);
  const docCount = summary?.doc_count ?? 0;
  const ingestedCount = summary?.ingested_count ?? 0;
  const entityCount = summary?.graph?.entities ?? 0;

  // Ingestion activity over the last 30 days (documents created per day).
  const activityData = (summary?.activity_last_30d || []).map((d: any) => ({
    month: (d.date || '').slice(5), // MM-DD
    docs: d.count,
  }));

  // Knowledge-domain health radar, built from the real metrics object.
  const m = summary?.metrics || {};
  const radarData = [
    { subject: 'Coverage', A: Math.round(m.coverage_health ?? 0) },
    { subject: 'Freshness', A: Math.round(m.freshness_health ?? 0) },
    { subject: 'Depth', A: Math.round(m.depth_health ?? 0) },
    { subject: 'Engagement', A: Math.round(m.engagement_health ?? 0) },
    { subject: 'Collaboration', A: Math.round(m.collaboration_health ?? 0) },
    { subject: 'Handoff', A: Math.round(m.handoff_health ?? 0) },
  ];

  return (
    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar relative z-10 max-w-7xl mx-auto w-full space-y-8">
      <header>
        <div className="flex items-center gap-2 mb-2 text-[var(--color-brand-primary)]">
          <TrendingUp size={16} />
          <span className="text-xs font-black uppercase tracking-widest">Executive Dashboard</span>
        </div>
        <h1 className="text-4xl font-black text-[var(--color-on-surface)] tracking-tight">Analytics & Intelligence</h1>
        <p className="text-[var(--color-on-surface-variant)] text-sm mt-1 max-w-xl">
          Track knowledge base health, document ingestion velocity, and structural coverage gaps for {selectedCompany?.name || 'All Organizations'}.
        </p>
      </header>

      {/* Grid count cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] rounded-2xl p-6">
          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-on-surface-variant)] mb-1">Knowledge Coverage</p>
          <h3 className="text-3xl font-black text-[var(--color-on-surface)]">{coverage}%</h3>
          <div className="w-full h-1 bg-[var(--color-surface-dim)] rounded-full overflow-hidden mt-3 border border-[var(--color-outline-variant)]">
            <div className="h-full bg-gradient-to-r from-[var(--color-brand-primary-container)] to-teal-500" style={{ width: `${coverage}%` }} />
          </div>
        </div>

        <div className="bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] rounded-2xl p-6">
          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-on-surface-variant)] mb-1">Total Documents</p>
          <h3 className="text-3xl font-black text-[var(--color-on-surface)]">{docCount}</h3>
          <p className="text-[10px] text-[var(--color-success)] font-bold mt-2">Documents in the workspace</p>
        </div>

        <div className="bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] rounded-2xl p-6">
          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-on-surface-variant)] mb-1">Indexed for retrieval</p>
          <h3 className="text-3xl font-black text-[var(--color-success)]">{ingestedCount}</h3>
          <p className="text-[10px] text-[var(--color-on-surface-variant)] font-bold mt-2">of {docCount} approved &amp; ingested</p>
        </div>

        <div className="bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] rounded-2xl p-6">
          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-on-surface-variant)] mb-1">Graph entities</p>
          <h3 className="text-3xl font-black text-[var(--color-brand-primary)]">{entityCount}</h3>
          <p className="text-[10px] text-[var(--color-on-surface-variant)] font-bold mt-2">Extracted knowledge nodes</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Coverage Over Time Area Chart */}
        <div className="bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] rounded-[2rem] p-8 space-y-6">
          <h3 className="text-lg font-bold text-[var(--color-on-surface)] flex items-center gap-2">
            <Activity className="text-[var(--color-brand-primary)]" size={18} />
            <span>Documentation Activity (30 days)</span>
          </h3>

          <div className="h-80 w-full">
            {activityData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-[var(--color-on-surface-variant)]">
                No documents created in the last 30 days.
              </div>
            ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                <Area type="monotone" dataKey="docs" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" name="Documents created" />
              </AreaChart>
            </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Knowledge Domains Radar Chart */}
        <div className="bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] rounded-[2rem] p-8 space-y-6">
          <h3 className="text-lg font-bold text-[var(--color-on-surface)] flex items-center gap-2">
            <Layers className="text-[var(--color-brand-primary)]" size={18} />
            <span>Knowledge Domains Coverage</span>
          </h3>

          <div className="h-80 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke="#1e293b" />
                <PolarAngleAxis dataKey="subject" stroke="#64748b" fontSize={10} />
                <PolarRadiusAxis stroke="#1e293b" fontSize={9} domain={[0, 100]} />
                <Radar name="Health %" dataKey="A" stroke="#14b8a6" fill="#14b8a6" fillOpacity={0.25} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Bottom Insights panel */}
      <div className="bg-[var(--color-surface-container)]/40 border border-[var(--color-outline-variant)] rounded-[2rem] p-8">
        <h3 className="text-lg font-bold text-[var(--color-on-surface)] mb-6 flex items-center gap-2">
          <AlertTriangle className="text-[var(--color-brand-primary)]" size={18} />
          <span>Flagged Structural Gaps</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(summary?.gaps || []).map((gap: any, i: number) => (
            <div key={i} className="bg-[var(--color-surface-dim)] border border-[var(--color-outline-variant)] p-4 rounded-2xl flex items-center gap-4">
              <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-danger)] animate-pulse shrink-0" />
              <div>
                <p className="text-sm font-bold text-[var(--color-on-surface)]">{gap.title || gap}</p>
                <p className="text-xs text-[var(--color-on-surface-variant)] mt-1">Impact score: High Priority gap</p>
              </div>
            </div>
          ))}

          {(summary?.gaps || []).length === 0 && (
            <div className="col-span-2 text-center py-6 text-[var(--color-on-surface-variant)] text-sm">
              No structural knowledge gaps are currently flagged. The workspace is fully documented!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
