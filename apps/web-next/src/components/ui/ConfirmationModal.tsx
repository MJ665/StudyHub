"use client";
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  onClose?: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'danger';
  variant?: 'warning' | 'danger';
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  onClose,
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "warning",
  variant
}) => {
  const actualType = variant || type;
  const actualCancel = onClose || onCancel;
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-[var(--color-surface-dim)]/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] p-8 rounded-[2rem] max-w-md w-full shadow-2xl"
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 ${
              actualType === 'danger' ? 'bg-[var(--color-danger)]/10 text-[var(--color-danger)]' : 'bg-[var(--color-warning)]/10 text-[var(--color-warning)]'
            }`}>
              <AlertTriangle size={24} />
            </div>
            <h3 className="text-xl font-black text-[var(--color-on-surface)] mb-2">{title}</h3>
            <p className="text-sm text-[var(--color-on-surface-variant)] mb-8 leading-relaxed">{message}</p>
            <div className="flex gap-3">
              <button
                onClick={actualCancel}
                className="flex-1 py-3 px-4 bg-[var(--color-surface-container-high)] hover:bg-[var(--color-surface-bright)] text-[var(--color-on-surface)] rounded-xl font-black text-xs uppercase tracking-widest transition-all"
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                className={`flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all text-[var(--color-on-surface)] shadow-lg ${
                  actualType === 'danger' ? 'bg-[var(--color-danger)] hover:bg-[var(--color-danger)] shadow-[var(--color-danger)]/20' : 'bg-[var(--color-brand-primary-container)] hover:bg-[var(--color-brand-primary-container)] shadow-[var(--color-brand-primary)]/20'
                }`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
