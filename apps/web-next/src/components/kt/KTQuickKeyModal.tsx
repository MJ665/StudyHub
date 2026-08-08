import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Key, Copy, Loader2, CheckCircle2 } from 'lucide-react';
import ApiService from '@/services/ApiService';
import { toast } from 'react-hot-toast';
import type { KTProject } from '@/types/kt';

interface KTQuickKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: KTProject;
}

export default function KTQuickKeyModal({ isOpen, onClose, project }: KTQuickKeyModalProps) {
  const [keyScopeLabel, setKeyScopeLabel] = useState('');
  const [keyRecipientEmail, setKeyRecipientEmail] = useState('');
  const [keyTtlDays, setKeyTtlDays] = useState(90);
  const [keyMaxUses, setKeyMaxUses] = useState<number | ''>('');
  const [generatingKey, setGeneratingKey] = useState(false);
  const [generatedRawKey, setGeneratedRawKey] = useState<string | null>(null);

  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneratingKey(true);
    setGeneratedRawKey(null);
    try {
      const res = await ApiService.generateKTKey({
        project_ids: [project.id],
        company_id: project.company_id,
        scope_label: keyScopeLabel || undefined,
        recipient_email: keyRecipientEmail || undefined,
        ttl_days: keyTtlDays || 90,
        max_uses: keyMaxUses === '' ? undefined : Number(keyMaxUses),
        send_email: false,
      });
      setGeneratedRawKey(res.raw_key);
      toast.success('Access key generated successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate access key');
    } finally {
      setGeneratingKey(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const handleClose = () => {
    setGeneratedRawKey(null);
    setKeyScopeLabel('');
    setKeyRecipientEmail('');
    setKeyTtlDays(90);
    setKeyMaxUses('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--color-surface-dim)]/80 backdrop-blur-sm">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] rounded-[2.5rem] p-8 max-w-xl w-full shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-emerald-500/5 rounded-full blur-[60px] pointer-events-none" />
          
          <h2 className="text-2xl font-black text-[var(--color-on-surface)] mb-2 flex items-center gap-3">
            <Key className="text-emerald-400" size={24} />
            <span>Generate Access Key</span>
          </h2>
          <p className="text-[var(--color-on-surface-variant)] text-xs mb-6">Create a secure access key for <strong>{project.name}</strong>.</p>

          {!generatedRawKey ? (
            <form onSubmit={handleGenerateKey} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-on-surface-variant)]">Scope Label</label>
                <input
                  type="text"
                  placeholder="e.g. Audit Team Access"
                  className="w-full bg-[var(--color-surface-dim)] border border-[var(--color-outline-variant)] rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-[var(--color-on-surface)] text-sm"
                  value={keyScopeLabel}
                  onChange={(e) => setKeyScopeLabel(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-on-surface-variant)]">Recipient Email (Optional)</label>
                <input
                  type="email"
                  placeholder="e.g. auditor@example.com"
                  className="w-full bg-[var(--color-surface-dim)] border border-[var(--color-outline-variant)] rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-[var(--color-on-surface)] text-sm"
                  value={keyRecipientEmail}
                  onChange={(e) => setKeyRecipientEmail(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-on-surface-variant)]">Expiration (Days)</label>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    className="w-full bg-[var(--color-surface-dim)] border border-[var(--color-outline-variant)] rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-[var(--color-on-surface)] text-sm"
                    value={keyTtlDays}
                    onChange={(e) => setKeyTtlDays(parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-on-surface-variant)]">Max Uses (Optional)</label>
                  <input
                    type="number"
                    min={1}
                    placeholder="Unlimited"
                    className="w-full bg-[var(--color-surface-dim)] border border-[var(--color-outline-variant)] rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-[var(--color-on-surface)] text-sm"
                    value={keyMaxUses}
                    onChange={(e) => setKeyMaxUses(e.target.value ? parseInt(e.target.value) : '')}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-[var(--color-outline-variant)]/40">
                <button
                  type="submit"
                  disabled={generatingKey}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)] py-4 rounded-2xl font-bold transition-all shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2"
                >
                  {generatingKey ? <Loader2 className="animate-spin" size={18} /> : 'Generate Key'}
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="bg-[var(--color-surface-container-high)] hover:bg-[var(--color-surface-bright)] text-[var(--color-on-surface)] px-6 py-4 rounded-2xl font-bold transition-all border border-[var(--color-outline-variant)]"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="bg-emerald-500/10 border border-emerald-500/30 p-6 rounded-2xl">
                <div className="flex items-start gap-4">
                  <CheckCircle2 className="text-emerald-400 mt-1 flex-shrink-0" size={24} />
                  <div>
                    <h3 className="text-emerald-400 font-bold mb-2">Key Generated Successfully</h3>
                    <p className="text-xs text-[var(--color-on-surface-variant)] mb-4">Please copy this key now. For security reasons, it will never be shown again.</p>
                    
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-[var(--color-surface-dim)] border border-[var(--color-outline-variant)] px-4 py-3 rounded-xl text-emerald-300 font-mono text-sm break-all">
                        {generatedRawKey}
                      </code>
                      <button
                        onClick={() => copyToClipboard(generatedRawKey)}
                        className="p-3 bg-[var(--color-surface-container-high)] hover:bg-[var(--color-surface-bright)] text-[var(--color-on-surface-variant)] rounded-xl transition-all"
                        title="Copy to clipboard"
                      >
                        <Copy size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end pt-4 border-t border-[var(--color-outline-variant)]/40">
                <button
                  onClick={handleClose}
                  className="bg-[var(--color-surface-container-high)] hover:bg-[var(--color-surface-bright)] text-[var(--color-on-surface)] px-8 py-3 rounded-2xl font-bold transition-all border border-[var(--color-outline-variant)]"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
