'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useMobile } from '../../lib/useMobile';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface ResponsiveTabsProps {
  tabs: TabItem[];
  active: string;
  onChange: (id: string) => void;
  /** Extra classes on the wrapper. */
  className?: string;
  /**
   * Mobile behavior. 'auto' (default) → a dropdown when there are many tabs
   * (>5), otherwise a horizontal-scroll chip row. Desktop is always the pill row.
   */
  mobileMode?: 'auto' | 'dropdown' | 'scroll';
}

/**
 * One tab primitive that never overflows on mobile. Desktop keeps the familiar
 * pill row; on phones it collapses long strips (e.g. the 10 admin tabs) into a
 * compact dropdown, and shows short strips as a swipeable chip row. Token-styled
 * so it themes correctly (Navy Light / Navy Dark / Classic).
 */
export default function ResponsiveTabs({
  tabs,
  active,
  onChange,
  className = '',
  mobileMode = 'auto',
}: ResponsiveTabsProps) {
  const isMobile = useMobile();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const activeTab = tabs.find((t) => t.id === active) ?? tabs[0];
  const useDropdown =
    isMobile && (mobileMode === 'dropdown' || (mobileMode === 'auto' && tabs.length > 5));

  // ── Mobile dropdown (many tabs) ──
  if (useDropdown) {
    return (
      <div ref={ref} className={`relative ${className}`}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] text-sm font-bold text-[var(--color-on-surface)]"
        >
          <span className="flex items-center gap-2 truncate">
            {activeTab?.icon}
            {activeTab?.label}
          </span>
          <ChevronDown size={16} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <div className="absolute z-50 mt-2 w-full max-h-[60vh] overflow-y-auto rounded-xl bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)] shadow-2xl p-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  onChange(t.id);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-left text-sm font-semibold transition-colors ${
                  t.id === active
                    ? 'bg-[var(--color-brand-primary)] text-[var(--color-surface-dim)]'
                    : 'text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-high)] hover:text-[var(--color-on-surface)]'
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Mobile scroll chips (few tabs) OR desktop pill row ──
  const scroll = isMobile;
  return (
    <div
      className={`flex gap-1 p-1 rounded-2xl bg-[var(--color-surface-container)]/60 border border-[var(--color-outline-variant)] ${
        scroll ? 'overflow-x-auto no-scrollbar' : 'flex-wrap w-fit'
      } ${className}`}
    >
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            t.id === active
              ? 'bg-[var(--color-brand-primary)] text-[var(--color-surface-dim)] shadow'
              : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]'
          }`}
        >
          {t.icon}
          {t.label}
        </button>
      ))}
    </div>
  );
}
