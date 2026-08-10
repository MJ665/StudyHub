'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Key, Plus, Shield, ShieldAlert, Copy, Check, Clock, Trash2, 
  Loader2, Mail, Users, CheckSquare, Square, Eye, EyeOff
} from 'lucide-react';
import ApiService from '@/services/ApiService';
import type { KTProject } from '@/types/kt';
import { useKTNavStore } from '@/stores/ktNavStore';
import { toast } from 'react-hot-toast';

interface KTKeysViewProps {
  user: any;
}

export default function KTKeysView({ user }: KTKeysViewProps) {
  const { selectedCompany } = useKTNavStore();
  const [keys, setKeys] = useState<any[]>([]);
  const [projects, setProjects] = useState<KTProject[]>([]);
  const [directoryUsers, setDirectoryUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  // Form states
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [scopeLabel, setScopeLabel] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [ttlDays, setTtlDays] = useState(30);
  const [maxUses, setMaxUses] = useState(100);
  const [sendEmail, setSendEmail] = useState(false);
  const [notes, setNotes] = useState('');
  const [generating, setGenerating] = useState(false);

  // Raw key display state (Visual layout instead of alert/prompt dialogs!)
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchKeysAndProjects = async () => {
    if (!selectedCompany) return;
    setLoading(true);
    try {
      const [fetchedKeys, fetchedProjects, fetchedUsers] = await Promise.all([
        ApiService.getKTKeys(selectedCompany.id, false), // Fetch all, not just active
        ApiService.getKTProjects(selectedCompany.id),
        ApiService.getUsers()
      ]);
      setKeys(fetchedKeys || []);
      setProjects(fetchedProjects || []);
      setDirectoryUsers(fetchedUsers?.items || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load access keys registry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeysAndProjects();
  }, [selectedCompany]);

  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedProjectIds.length === 0) {
      toast.error('Select at least one project scope');
      return;
    }

    setGenerating(true);
    try {
      const res = await ApiService.generateKTKey({
        project_ids: selectedProjectIds,
        company_id: selectedCompany?.id,
        scope_label: scopeLabel || undefined,
        recipient_name: recipientName || undefined,
        recipient_email: recipientEmail || undefined,
        ttl_days: ttlDays,
        max_uses: maxUses,
        send_email: sendEmail,
        notes: notes || undefined
      });

      // Display the raw key in a beautiful card layout instead of standard browser popups!
      setNewlyCreatedKey(res.raw_key || res.key || 'Generated successfully');
      toast.success('Access Key created successfully!');
      
      // Reset form
      setSelectedProjectIds([]);
      setScopeLabel('');
      setRecipientName('');
      setRecipientEmail('');
      setTtlDays(30);
      setMaxUses(100);
      setSendEmail(false);
      setNotes('');
      setShowCreate(false);
      
      fetchKeysAndProjects();
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate key');
    } finally {
      setGenerating(false);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this access key? This action is immediate.')) return;
    try {
      await ApiService.revokeKTKey(keyId);
      toast.success('Key revoked successfully');
      fetchKeysAndProjects();
    } catch (err: any) {
      toast.error(err.message || 'Failed to revoke key');
    }
  };

  const handleCopy = () => {
    if (!newlyCreatedKey) return;
    navigator.clipboard.writeText(newlyCreatedKey);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleProjectSelection = (projectId: string) => {
    setSelectedProjectIds(prev => 
      prev.includes(projectId) 
        ? prev.filter(id => id !== projectId) 
        : [...prev, projectId]
    );
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar relative z-10 max-w-7xl mx-auto w-full">
      <header className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2 text-[var(--color-brand-primary)]">
            <Shield size={16} />
            <span className="text-xs font-black uppercase tracking-widest">Cryptographic Security</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-[var(--color-on-surface)] tracking-tight">Access Keys Gateways</h1>
          <p className="text-[var(--color-on-surface-variant)] text-sm mt-1 max-w-xl">
            Provision cryptographically locked APIs and chat keys. Define multiple scoping boundaries, set custom expirations, and audit active connections.
          </p>
        </div>

        <button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-[var(--color-brand-primary-container)] hover:bg-[var(--color-brand-primary-container)] text-white px-6 py-3.5 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-[var(--color-brand-primary)]/20 active:scale-95 border border-[var(--color-brand-primary)]/30"
        >
          <Plus size={18} />
          <span>Provision Key</span>
        </button>
      </header>

      {/* Raw Generated Key Banner Display (Beautiful custom layout!) */}
      <AnimatePresence>
        {newlyCreatedKey && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-gradient-to-r from-[var(--color-brand-primary-container)] to-[var(--color-surface-container)] border-2 border-[var(--color-brand-primary)]/50 rounded-[2.5rem] p-8 mb-10 shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-[var(--color-brand-primary-container)]/10 rounded-full blur-[80px] pointer-events-none" />
            <h2 className="text-xl font-bold text-[var(--color-on-surface)] mb-2 flex items-center gap-3">
              <Shield className="text-[var(--color-brand-primary)] animate-pulse" size={22} />
              <span>Cryptographic Token Generated</span>
            </h2>
            <p className="text-[var(--color-on-surface-variant)] text-xs mb-6 max-w-2xl leading-relaxed">
              Here is your new raw access key. **Copy it now**. For security reasons, this raw string will **never** be shown again.
              Any requests utilizing this gateway token must supply this key inside the `X-KT-Key` header.
            </p>

            <div className="flex flex-col md:flex-row items-center gap-4 bg-[var(--color-surface-dim)] p-4 rounded-2xl border border-[var(--color-brand-primary)]/25">
              <span className="flex-1 font-mono text-sm text-[var(--color-brand-primary)] select-all truncate tracking-wider w-full md:w-auto text-center md:text-left px-2">
                {newlyCreatedKey}
              </span>
              <button
                onClick={handleCopy}
                className="w-full md:w-auto bg-[var(--color-brand-primary-container)] hover:bg-[var(--color-brand-primary-container)] text-white py-3 px-6 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                <span>{copied ? 'Copied!' : 'Copy Key'}</span>
              </button>
            </div>

            <button
              onClick={() => setNewlyCreatedKey(null)}
              className="mt-6 text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface-variant)] text-xs font-black uppercase tracking-widest transition-colors block mx-auto md:mx-0"
            >
              I have stored it securely
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Creation form */}
      {showCreate && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] rounded-[2.5rem] p-8 mb-10 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-[var(--color-brand-primary-container)]/5 rounded-full blur-[60px] pointer-events-none" />
          <h2 className="text-2xl font-black text-[var(--color-on-surface)] mb-2 flex items-center gap-3">
            <Key className="text-[var(--color-brand-primary)]" size={24} />
            <span>Provision Access Gateway</span>
          </h2>
          <p className="text-[var(--color-on-surface-variant)] text-xs mb-8">Restrict key access scopes to specific code repositories and documentation spaces.</p>

          <form onSubmit={handleGenerateKey} className="space-y-6">
            
            {/* Scoped Projects checkboxes */}
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-on-surface-variant)] block">
                Select Project Scopes (Multi-Project Selection)
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {projects.map((project) => {
                  const isChecked = selectedProjectIds.includes(project.id);
                  return (
                    <button
                      key={project.id}
                      type="button"
                      onClick={() => toggleProjectSelection(project.id)}
                      className={`flex items-center gap-3 p-4 rounded-2xl text-left border text-sm transition-all ${
                        isChecked 
                          ? 'bg-[var(--color-brand-primary-container)]/10 border-[var(--color-brand-primary)] text-[var(--color-brand-primary)]' 
                          : 'bg-[var(--color-surface-dim)] border-[var(--color-outline-variant)] text-[var(--color-on-surface-variant)] hover:border-[var(--color-outline-variant)]'
                      }`}
                    >
                      {isChecked ? <CheckSquare size={16} /> : <Square size={16} />}
                      <span className="font-semibold truncate">{project.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Directory User Autocomplete */}
              <div className="col-span-1 md:col-span-3 space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-on-surface-variant)]">Auto-Populate from Directory (Optional)</label>
                <select
                  className="w-full bg-[var(--color-surface-dim)] border border-[var(--color-outline-variant)] rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/50 text-[var(--color-on-surface)] text-sm"
                  onChange={(e) => {
                    const selectedUserId = e.target.value;
                    if (!selectedUserId) return;
                    const u = directoryUsers.find((u: any) => u.id === parseInt(selectedUserId));
                    if (u) {
                      setRecipientName(u.full_name || '');
                      setRecipientEmail(u.email || '');
                    }
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>Select a user to auto-populate...</option>
                  {directoryUsers.map((u: any) => (
                    <option key={u.id} value={u.id}>{u.full_name} ({u.email})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-on-surface-variant)]">Scope Tag / Label</label>
                <input
                  type="text"
                  placeholder="e.g. Jenkins Pipeline, AI Chat"
                  className="w-full bg-[var(--color-surface-dim)] border border-[var(--color-outline-variant)] rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/50 text-[var(--color-on-surface)] text-sm"
                  value={scopeLabel}
                  onChange={(e) => setScopeLabel(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-on-surface-variant)]">Recipient Name</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  className="w-full bg-[var(--color-surface-dim)] border border-[var(--color-outline-variant)] rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/50 text-[var(--color-on-surface)] text-sm"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-on-surface-variant)]">Recipient Email</label>
                <input
                  type="email"
                  placeholder="e.g. john@company.com"
                  className="w-full bg-[var(--color-surface-dim)] border border-[var(--color-outline-variant)] rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/50 text-[var(--color-on-surface)] text-sm"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-on-surface-variant)]">Expiration TTL (Days)</label>
                <select
                  className="w-full bg-[var(--color-surface-dim)] border border-[var(--color-outline-variant)] rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/50 text-[var(--color-on-surface)] text-sm"
                  value={ttlDays}
                  onChange={(e) => setTtlDays(Number(e.target.value))}
                >
                  <option value={7}>7 Days</option>
                  <option value={30}>30 Days</option>
                  <option value={90}>90 Days</option>
                  <option value={365}>1 Year</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-on-surface-variant)]">Maximum Allowed Uses</label>
                <input
                  type="number"
                  placeholder="e.g. 100"
                  className="w-full bg-[var(--color-surface-dim)] border border-[var(--color-outline-variant)] rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/50 text-[var(--color-on-surface)] text-sm"
                  value={maxUses}
                  onChange={(e) => setMaxUses(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-on-surface-variant)]">Internal Audit Notes</label>
              <textarea
                placeholder="Enter justification reasons or security notes for issuing this key..."
                rows={2}
                className="w-full bg-[var(--color-surface-dim)] border border-[var(--color-outline-variant)] rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/50 text-[var(--color-on-surface)] text-sm resize-none"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSendEmail(!sendEmail)}
                className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-colors ${
                  sendEmail ? 'text-[var(--color-brand-primary)]' : 'text-[var(--color-on-surface-variant)]'
                }`}
              >
                {sendEmail ? <CheckSquare size={16} /> : <Square size={16} />}
                <span>Email raw token securely to recipient</span>
              </button>
            </div>

            <div className="flex gap-3 pt-4 border-t border-[var(--color-outline-variant)]">
              <button
                type="submit"
                disabled={generating}
                className="flex-1 bg-[var(--color-brand-primary-container)] hover:bg-[var(--color-brand-primary-container)] disabled:bg-[var(--color-surface-container-high)] text-white py-4 rounded-2xl font-bold transition-all shadow-xl shadow-[var(--color-brand-primary)]/25 flex items-center justify-center gap-2 text-sm"
              >
                {generating ? <Loader2 className="animate-spin" size={18} /> : 'Generate Cryptographic Key'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="bg-[var(--color-surface-container-high)] hover:bg-[var(--color-surface-bright)] text-[var(--color-on-surface)] px-6 py-4 rounded-2xl font-bold transition-all border border-[var(--color-outline-variant)] text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Keys list */}
      {loading ? (
        <div className="h-[300px] flex items-center justify-center">
          <Loader2 className="animate-spin text-[var(--color-brand-primary)]" size={32} />
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-xs font-black uppercase tracking-widest text-[var(--color-on-surface-variant)] mb-2">Active Keys Registry</h2>
          
          <div className="grid grid-cols-1 gap-4">
            {keys.map((k) => (
              <div 
                key={k.id}
                className={`bg-[var(--color-surface-container)]/40 border rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all ${
                  k.is_active ? 'border-[var(--color-outline-variant)]' : 'border-[var(--color-danger)] bg-[var(--color-danger)]/5'
                }`}
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-[var(--color-on-surface)] text-base">{k.scope_label || 'Unnamed Access Token'}</span>
                    {!k.is_active && (
                      <span className="text-[9px] font-black uppercase tracking-widest bg-[var(--color-danger)]/30 text-[var(--color-danger)] border border-[var(--color-danger)]/20 px-2 py-0.5 rounded">
                        Revoked
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-on-surface-variant)]">Token Prefix</p>
                      <p className="font-mono text-[var(--color-on-surface-variant)] mt-0.5">{k.key_prefix || 'sk-kt-...'}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-on-surface-variant)]">Recipient</p>
                      <p className="text-[var(--color-on-surface-variant)] mt-0.5 truncate max-w-[150px]">{k.recipient_name || 'System Account'}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-on-surface-variant)]">Uses remaining</p>
                      <p className="text-[var(--color-on-surface-variant)] mt-0.5">{k.max_uses != null ? `${k.uses_remaining ?? (k.max_uses - (k.use_count ?? 0))} / ${k.max_uses}` : 'unlimited'}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-on-surface-variant)]">Expires</p>
                      <p className="text-[var(--color-on-surface-variant)] mt-0.5 flex items-center gap-1">
                        <Clock size={12} className="text-[var(--color-brand-primary)]" />
                        {k.expires_at ? new Date(k.expires_at).toLocaleDateString() : 'never'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {k.is_active ? (
                    <button
                      onClick={() => handleRevokeKey(k.id)}
                      className="bg-[var(--color-surface-dim)] border border-[var(--color-danger)] text-[var(--color-danger)] hover:bg-[var(--color-danger)]/20 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2"
                    >
                      <Trash2 size={12} />
                      Revoke
                    </button>
                  ) : (
                    <span className="text-xs text-[var(--color-on-surface-variant)] italic">Inactive</span>
                  )}
                </div>
              </div>
            ))}

            {keys.length === 0 && (
              <div className="bg-[var(--color-surface-container)]/10 border border-[var(--color-outline-variant)] rounded-2xl p-12 text-center">
                <ShieldAlert className="mx-auto text-[var(--color-on-surface-variant)] mb-3" size={32} />
                <p className="text-[var(--color-on-surface-variant)] font-bold">No Active Tokens Provisioned</p>
                <p className="text-xs text-[var(--color-on-surface-variant)] mt-1">Generate a secure cryptographic API key to enable Jenkins, CLI or AI assistant tasks.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
