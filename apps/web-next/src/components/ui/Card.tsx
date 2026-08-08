'use client';

import React from 'react';

/** Token-based surface card — depth via layered neutrals + soft border, no
 *  hardcoded palette so it themes across Classic / Warm Dark / Warm Light. */
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  raised?: boolean;
}

export default function Card({ raised = false, className = '', ...props }: CardProps) {
  return (
    <div
      {...props}
      className={`rounded-2xl border border-[var(--color-outline-variant)] ${
        raised ? 'bg-[var(--color-surface-container-high)] shadow-xl' : 'bg-[var(--color-surface-container)]'
      } ${className}`}
    />
  );
}
