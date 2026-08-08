'use client';

import React from 'react';
import { Palette } from 'lucide-react';
import { THEME_REGISTRY, useTheme } from './ThemeProvider';

/** Compact theme picker (Classic / Warm Dark / Warm Light), token-styled so it
 *  looks right in every theme. */
export default function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  return (
    <div className={compact ? 'flex items-center gap-1' : 'space-y-2'}>
      {!compact && (
        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-on-surface-variant)]">
          <Palette size={12} /> Theme
        </div>
      )}
      <div className="flex p-1 rounded-xl bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)]">
        {THEME_REGISTRY.map((t) => (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            className={`flex-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
              theme === t.id
                ? 'bg-[var(--color-brand-primary)] text-[var(--color-surface-dim)] shadow'
                : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]'
            }`}
            title={t.label}
          >
            {compact ? t.label.replace('Warm ', '') : t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
