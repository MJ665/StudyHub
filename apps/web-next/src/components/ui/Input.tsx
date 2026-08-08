'use client';

import React from 'react';

/** Token-based text input — themes across Classic / Warm Dark / Warm Light. */
const base =
  'w-full rounded-xl px-3 py-2.5 text-sm bg-[var(--color-surface-dim)] text-[var(--color-on-surface)] ' +
  'border border-[var(--color-outline-variant)] outline-none focus:ring-1 focus:ring-[var(--color-brand-primary)] ' +
  'placeholder:text-[var(--color-on-surface-variant)]';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className = '', ...props }, ref) {
    return <input ref={ref} {...props} className={`${base} ${className}`} />;
  }
);

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className = '', ...props }, ref) {
    return <textarea ref={ref} {...props} className={`${base} resize-y ${className}`} />;
  }
);

export default Input;
