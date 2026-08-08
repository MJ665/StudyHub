'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Shield, Key, Loader2, ArrowRight } from 'lucide-react';
import ApiService from '@/services/ApiService';
import { toast } from 'react-hot-toast';
import { useKTGateStore } from '@/stores/ktGateStore';
import { useKTNavStore } from '@/stores/ktNavStore';

interface KTGateProps {
  projectId: string;
  projectName: string;
  onUnlock?: (key: string, sessionId: string, scope?: any) => void;
  onCancel: () => void;
}

export default function KTGate({ projectId, projectName, onUnlock, onCancel }: KTGateProps) {
  const [accessKey, setAccessKey] = useState('');
  const [verifying, setVerifying] = useState(false);
  
  const gateStore = useKTGateStore();
  const navStore = useKTNavStore();

  const handleVerifyKey = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!accessKey.trim()) return;

    setVerifying(true);
    try {
      // Step 1: Create session — this locks project_ids at session level
      const sessionRes = await ApiService.startKTChatSession([], accessKey);
      
      // Step 2: Fetch key scope — what can this key access?
      const scope = await ApiService.getKTKeyScope(accessKey);
      
      // Step 3: Fetch accessible document IDs for this key
      const docs = await ApiService.getKTDocuments({}, accessKey);
      
      // Step 4: Store everything in gate store
      gateStore.setScopeFromKey(scope);
      gateStore.setAccessibleDocs(docs.map((d: any) => d.id));
      gateStore.setSessionId(sessionRes.session_id);
      gateStore.setRawKey(accessKey);
      
      // Step 5: Navigate to scoped project list (not full hub)
      navStore.setView('key-scoped-projects' as any);  // NEW view
      
      if (onUnlock) onUnlock(accessKey, sessionRes.session_id, scope);
      toast.success(`Access granted to: ${scope.scope_label || 'Knowledge Base'}`);
    } catch (err: any) {
      toast.error('Invalid or expired Access Key');
      setAccessKey('');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-8 relative z-10 w-full min-h-[500px]">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[var(--color-surface-container)]/60 border border-[var(--color-outline-variant)] rounded-[2.5rem] p-12 flex flex-col items-center justify-center text-center backdrop-blur-xl max-w-lg w-full shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-[250px] h-[250px] bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none" />
        
        <div className="w-20 h-20 rounded-3xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 mb-8">
          <Shield size={40} className="text-[var(--color-brand-primary)]" />
        </div>
        
        <h3 className="text-2xl font-black text-[var(--color-on-surface)] mb-3">Secure Knowledge Gateway</h3>
        <p className="text-[var(--color-on-surface-variant)] text-xs max-w-sm mb-8 leading-relaxed">
          Access to {projectName ? `**${projectName}**'s` : 'the'} intelligence and database indexes is cryptographically locked. 
          Please input a valid Gateway Access Key to unlock this domain.
        </p>
        
        <form onSubmit={handleVerifyKey} className="w-full space-y-4">
          <div className="relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-[var(--color-on-surface-variant)] group-focus-within:text-[var(--color-brand-primary)] transition-colors">
              <Key size={16} />
            </div>
            <input 
              type="password"
              placeholder="Enter Access Key (sh_kt_...)"
              className="w-full bg-[var(--color-surface-dim)] border border-[var(--color-outline-variant)] rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all font-mono text-xs text-[var(--color-on-surface)]"
              value={accessKey}
              onChange={(e) => setAccessKey(e.target.value)}
              required
            />
          </div>
          
          <button 
            type="submit"
            disabled={!accessKey.trim() || verifying}
            className="w-full bg-[var(--color-brand-primary-container)] hover:bg-indigo-500 disabled:bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)] py-4 rounded-2xl font-bold transition-all shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-2 text-sm"
          >
            {verifying ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <>Unlock Knowledge base <ArrowRight size={18} /></>
            )}
          </button>

          <button 
            type="button"
            onClick={onCancel}
            className="w-full text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface-variant)] text-[10px] font-black uppercase tracking-widest transition-colors pt-2"
          >
            Cancel and Return
          </button>
        </form>
      </motion.div>
    </div>
  );
}

