"use client";
import React, { useState, useCallback, createContext, useContext, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, XCircle, AlertCircle, Info, X } from 'lucide-react';

// ─── Toast Context ────────────────────────────────────────────────────────────
type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: {
    (type: ToastType, message: string): void;
    success: (message: string) => void;
    error: (message: string) => void;
    warning: (message: string) => void;
    info: (message: string) => void;
  };
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
};

// ─── Toast Item ───────────────────────────────────────────────────────────────
function ToastItem({ toast: t, onClose }: { toast: Toast; onClose: () => void }) {
  const styles: Record<ToastType, { bg: string; border: string; icon: React.ReactNode }> = {
    success: {
      bg: 'bg-[var(--color-success)]/60',
      border: 'border-[var(--color-success)]/40',
      icon: <CheckCircle2 size={18} className="text-[var(--color-success)] shrink-0" />
    },
    error: {
      bg: 'bg-[var(--color-danger)]/60',
      border: 'border-[var(--color-danger)]/40',
      icon: <XCircle size={18} className="text-[var(--color-danger)] shrink-0" />
    },
    warning: {
      bg: 'bg-[var(--color-warning)]/60',
      border: 'border-[var(--color-warning)]/40',
      icon: <AlertCircle size={18} className="text-[var(--color-warning)] shrink-0" />
    },
    info: {
      bg: 'bg-[var(--color-brand-primary-container)]/60',
      border: 'border-[var(--color-brand-primary)]/40',
      icon: <Info size={18} className="text-[var(--color-brand-primary)] shrink-0" />
    }
  };

  const style = styles[t.type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`flex items-center gap-3 px-5 py-4 rounded-2xl border backdrop-blur-md shadow-2xl ${style.bg} ${style.border} min-w-[280px] max-w-[420px]`}
      role="alert"
      aria-live="polite"
    >
      {style.icon}
      <p className="text-sm font-medium text-[var(--color-on-surface)] flex-1">{t.message}</p>
      <button
        onClick={onClose}
        aria-label="Dismiss notification"
        className="text-[var(--color-on-surface)]/40 hover:text-[var(--color-on-surface)] transition-colors ml-2 shrink-0"
      >
        <X size={16} />
      </button>
    </motion.div>
  );
}

// ─── Toast Provider ───────────────────────────────────────────────────────────
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Record<string, any>>({});

  const showToast = useCallback((type: ToastType, message: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, type, message }]);
    
    // Auto-dismiss after 4 seconds
    timersRef.current[id] = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
      delete timersRef.current[id];
    }, 4000);
  }, []);

  const toast = Object.assign(
    (type: ToastType, message: string) => showToast(type, message),
    {
      success: (msg: string) => showToast('success', msg),
      error: (msg: string) => showToast('error', msg),
      warning: (msg: string) => showToast('warning', msg),
      info: (msg: string) => showToast('info', msg),
    }
  );

  const dismiss = useCallback((id: string) => {
    clearTimeout(timersRef.current[id]);
    delete timersRef.current[id];
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* VIII: Toast portal - bottom-right consistently positioned */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 items-end pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map(t => (
            <div key={t.id} className="pointer-events-auto">
              <ToastItem toast={t} onClose={() => dismiss(t.id)} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
