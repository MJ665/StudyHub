'use client';

import { useEffect, useState } from 'react';
import ApiService from '@/services/ApiService';

interface Org {
  id: number;
  name: string;
  brand_name: string;
  status: string;
  contact_name?: string;
  contact_email?: string;
  onboarded_at?: string | null;
  created_at?: string | null;
}
interface Usage {
  total_cost_usd: number;
  total_calls: number;
  by_organization: { organization: string; calls: number; cost_usd: number }[];
  by_feature: { feature: string; calls: number; cost_usd: number }[];
}
interface Stats { total_orgs: number; pending: number; approved: number; suspended: number }

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-[var(--color-warning)]/15 text-[var(--color-warning)]',
  approved: 'bg-[var(--color-success)]/15 text-[var(--color-success)]',
  suspended: 'bg-[var(--color-danger)]/15 text-[var(--color-danger)]',
};

export default function PlatformAdminPage() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [o, u, s] = await Promise.all([
        ApiService.platformListOrgs(),
        ApiService.platformAIUsage(30),
        ApiService.platformStats(),
      ]);
      setOrgs(o.organizations || []);
      setUsage(u);
      setStats(s);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load. Platform Admin access required.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const act = async (id: number, action: 'approve' | 'suspend' | 'reactivate') => {
    setBusy(id);
    try {
      if (action === 'approve') {
        const r = await ApiService.platformApproveOrg(id);
        setToast(`Approved. Onboarding link: ${r.onboarding_url}`);
      } else if (action === 'suspend') {
        await ApiService.platformSuspendOrg(id);
      } else {
        await ApiService.platformReactivateOrg(id);
      }
      await load();
    } catch (e: unknown) {
      setToast(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-surface-dim)] text-[var(--color-on-surface)] p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black tracking-tight">Platform Admin</h1>
            <p className="text-[var(--color-on-surface-variant)] text-sm">Powered by GrindBuddy — org governance &amp; AI cost</p>
          </div>
          <button onClick={load} className="px-4 py-2 rounded-lg bg-[var(--color-surface-container-high)] hover:bg-[var(--color-surface-bright)] text-sm">Refresh</button>
        </header>

        {error && <div className="mb-6 rounded-lg bg-[var(--color-danger)]/10 text-[var(--color-danger)] p-4 text-sm">{error}</div>}
        {toast && (
          <div className="mb-6 rounded-lg bg-[var(--color-surface-container-high)] p-4 text-sm break-all flex justify-between gap-4">
            <span>{toast}</span>
            <button onClick={() => setToast(null)} className="text-[var(--color-on-surface-variant)] shrink-0">✕</button>
          </div>
        )}

        {loading ? (
          <div className="text-[var(--color-on-surface-variant)]">Loading…</div>
        ) : (
          <>
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {([['Total orgs', stats.total_orgs], ['Pending', stats.pending], ['Approved', stats.approved], ['Suspended', stats.suspended]] as const).map(([label, val]) => (
                  <div key={label} className="rounded-xl bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] p-5">
                    <div className="text-3xl font-black">{val}</div>
                    <div className="text-[var(--color-on-surface-variant)] text-xs uppercase tracking-widest mt-1">{label}</div>
                  </div>
                ))}
              </div>
            )}

            {usage && (
              <div className="rounded-xl bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] p-6 mb-8">
                <div className="flex items-baseline justify-between mb-4">
                  <h2 className="font-bold">AI cost &amp; utilization (30d)</h2>
                  <div className="text-right">
                    <div className="text-2xl font-black text-[var(--color-success)]">${usage.total_cost_usd.toFixed(4)}</div>
                    <div className="text-[var(--color-on-surface-variant)] text-xs">{usage.total_calls} calls</div>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <div className="text-[var(--color-on-surface-variant)] text-xs uppercase tracking-widest mb-2">By organization</div>
                    {usage.by_organization.slice(0, 8).map((r) => (
                      <div key={r.organization} className="flex justify-between text-sm py-1 border-b border-[var(--color-outline-variant)]/50">
                        <span className="truncate">{r.organization}</span>
                        <span className="text-[var(--color-on-surface-variant)]">${r.cost_usd.toFixed(4)} · {r.calls}</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="text-[var(--color-on-surface-variant)] text-xs uppercase tracking-widest mb-2">By feature</div>
                    {usage.by_feature.slice(0, 8).map((r) => (
                      <div key={r.feature} className="flex justify-between text-sm py-1 border-b border-[var(--color-outline-variant)]/50">
                        <span className="truncate">{r.feature}</span>
                        <span className="text-[var(--color-on-surface-variant)]">${r.cost_usd.toFixed(4)} · {r.calls}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-xl bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] overflow-hidden">
              <h2 className="font-bold p-5 border-b border-[var(--color-outline-variant)]">Organizations</h2>
              {orgs.length === 0 && <div className="p-5 text-[var(--color-on-surface-variant)] text-sm">No organizations yet.</div>}
              {orgs.map((o) => (
                <div key={o.id} className="flex items-center justify-between gap-4 p-4 border-b border-[var(--color-outline-variant)]/50">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{o.brand_name || o.name}</div>
                    <div className="text-[var(--color-on-surface-variant)] text-xs truncate">{o.contact_name} · {o.contact_email}</div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_STYLES[o.status] || 'bg-[var(--color-surface-bright)]'}`}>{o.status}</span>
                    {o.status === 'pending' && (
                      <button disabled={busy === o.id} onClick={() => act(o.id, 'approve')} className="px-3 py-1.5 rounded-lg bg-[var(--color-success)] hover:bg-[var(--color-success)] text-xs font-bold disabled:opacity-50">Approve</button>
                    )}
                    {o.status === 'approved' && (
                      <button disabled={busy === o.id} onClick={() => act(o.id, 'suspend')} className="px-3 py-1.5 rounded-lg bg-[var(--color-danger)] hover:bg-[var(--color-danger)] text-xs font-bold disabled:opacity-50">Suspend</button>
                    )}
                    {o.status === 'suspended' && (
                      <button disabled={busy === o.id} onClick={() => act(o.id, 'reactivate')} className="px-3 py-1.5 rounded-lg bg-[var(--color-surface-bright)] hover:bg-[var(--color-surface-container-high)] text-xs font-bold disabled:opacity-50">Reactivate</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
