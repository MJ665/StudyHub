'use client';

import React from 'react';

/** Token-based button primitive — themes correctly across Navy Light / Navy Dark
 *  / Classic. Variants map to semantic color tokens (no hardcoded palette).
 *  On-fill text uses --color-surface-dim, which flips lightness with the theme so
 *  it stays legible whether the fill is dark (light theme) or light (dark theme). */
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-[var(--color-brand-primary)] text-[var(--color-surface-dim)] hover:opacity-90',
  secondary: 'bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)] border border-[var(--color-outline-variant)] hover:bg-[var(--color-surface-bright)]',
  ghost: 'bg-transparent text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-high)]',
  danger: 'bg-[var(--color-danger)] text-[var(--color-surface-dim)] hover:opacity-90',
};
const SIZES: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export default function Button({ variant = 'primary', size = 'md', className = '', ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    />
  );
}
