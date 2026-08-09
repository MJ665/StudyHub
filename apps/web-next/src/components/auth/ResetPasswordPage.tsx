import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Lock, ChevronLeft, Check, Loader2, ShieldAlert, Key } from 'lucide-react';
import ApiService from '../../services/ApiService';
import { useToast } from '../ui/Toast';

export default function ResetPasswordPage({
  email,
  onBack,
  onSuccess
}: {
  email?: string,
  onBack: () => void,
  onSuccess: () => void
}) {
  const { toast } = useToast();
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || !newPassword || !email) return;

    if (newPassword !== confirmPassword) {
      toast('error', 'Credential mismatch. Verify password confirmation.');
      return;
    }

    setLoading(true);
    try {
      await ApiService.resetPassword(email, otp, newPassword);
      toast('success', 'Security credentials updated successfully.');
      onSuccess();
    } catch (err: any) {
      toast('error', err.message || 'Validation failed. Check OTP integrity.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-surface-dim)] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[var(--color-brand-primary-container)]/5 rounded-full blur-3xl -mr-64 -mt-64" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-brand-primary/5 rounded-full blur-3xl -ml-64 -mb-64" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] rounded-[2.5rem] p-10 shadow-2xl relative z-10"
      >
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] transition-all text-xs font-black uppercase tracking-widest mb-10 group"
        >
          <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Recovery
        </button>

        <div className="mb-10">
          <div className="w-16 h-16 bg-[var(--color-brand-primary-container)]/10 rounded-2xl flex items-center justify-center text-[var(--color-brand-primary)] mb-6">
            <Key size={32} />
          </div>
          <h2 className="text-3xl font-black text-[var(--color-on-surface)] mb-2">Sync Credentials</h2>
          <p className="text-sm text-[var(--color-on-surface-variant)] font-bold leading-relaxed">
            Enter the 6-digit OTP transmitted to <span className="text-[var(--color-on-surface)]">{email}</span> and define your new security key.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-on-surface-variant)] mb-2 ml-1">Secure OTP</label>
            <input 
              type="text" 
              required
              maxLength={6}
              placeholder="000000"
              value={otp}
              onChange={e => setOtp(e.target.value)}
              className="w-full bg-[var(--color-surface-dim)] border border-[var(--color-outline-variant)] rounded-2xl p-5 text-center text-2xl font-black tracking-[0.5em] text-[var(--color-on-surface)] outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/30 transition-all"
            />
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-on-surface-variant)] mb-2 ml-1">New Password</label>
              <div className="relative">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--color-on-surface-variant)]" size={18} />
                <input 
                  type="password" 
                  required
                  maxLength={72}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full bg-[var(--color-surface-dim)] border border-[var(--color-outline-variant)] rounded-2xl p-5 pl-14 text-[var(--color-on-surface)] font-bold outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/30 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-on-surface-variant)] mb-2 ml-1">Confirm Identity</label>
              <div className="relative">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--color-on-surface-variant)]" size={18} />
                <input 
                  type="password" 
                  required
                  maxLength={72}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full bg-[var(--color-surface-dim)] border border-[var(--color-outline-variant)] rounded-2xl p-5 pl-14 text-[var(--color-on-surface)] font-bold outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/30 transition-all"
                />
              </div>
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-[var(--color-brand-primary-container)] hover:bg-[var(--color-brand-primary-container)] text-white py-5 rounded-[2rem] font-black uppercase tracking-widest shadow-xl shadow-[var(--color-brand-primary)]/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" /> : <>Finalize Update <Check size={18} /></>}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
