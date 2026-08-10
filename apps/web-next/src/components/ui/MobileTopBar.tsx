'use client';

import React, { useState } from 'react';
import { Bell, LogOut, Map, Sparkles, X, ChevronRight } from 'lucide-react';
import ThemeSwitcher from '../theme/ThemeSwitcher';
import { useLearnerStats } from '../../lib/useLearnerStats';

interface MobileTopBarProps {
  user: any;
  onChangeView: (view: any) => void;
  onLogout: () => void;
  onOpenAIPath?: () => void;
  onOpenAIQuiz?: () => void;
}

/**
 * Compact mobile/tablet top bar (below lg). Brings the desktop sidebar's
 * mobile-missing bits to phones: the average-accuracy chip, the theme switcher,
 * a notifications bell, and an avatar that opens a sheet with the mini-profile,
 * AI tools, active tracks, and logout. Desktop keeps the full Sidebar.
 */
export default function MobileTopBar({ user, onChangeView, onLogout, onOpenAIPath, onOpenAIQuiz }: MobileTopBarProps) {
  const { accuracy, activeTracks } = useLearnerStats(user);
  const [sheetOpen, setSheetOpen] = useState(false);

  const accColor =
    accuracy == null ? '' :
    accuracy >= 70 ? 'text-[var(--color-success)]' :
    accuracy >= 40 ? 'text-[var(--color-warning)]' : 'text-[var(--color-danger)]';

  const initial = user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U';

  const go = (view: string) => { setSheetOpen(false); onChangeView(view); };

  return (
    <>
      <header className="lg:hidden fixed top-0 inset-x-0 z-40 h-14 flex items-center gap-2 px-3 bg-[var(--color-surface-container-low)] border-b border-[var(--color-surface-bright)] print:hidden">
        <img src="/images/logo.png" alt="" className="w-7 h-7 rounded-lg object-cover shrink-0" />
        <span className="text-sm font-black text-[var(--color-on-surface)] hidden sm:inline">StudyBuddy</span>

        {/* Accuracy chip */}
        {accuracy != null && (
          <button
            onClick={() => go('PROFILE')}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)]"
            aria-label="Average accuracy"
          >
            <span className="text-[9px] font-black uppercase tracking-wider text-[var(--color-on-surface-variant)]">Acc</span>
            <span className={`text-xs font-black ${accColor}`}>{accuracy}%</span>
          </button>
        )}

        <div className="flex-1" />

        {/* Theme switcher (compact) */}
        <ThemeSwitcher compact />

        {/* Notifications */}
        <button
          onClick={() => go('NOTIFICATIONS')}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container)]"
          aria-label="Notifications"
        >
          <Bell size={18} />
        </button>

        {/* Avatar → sheet */}
        <button
          onClick={() => setSheetOpen(true)}
          className="w-9 h-9 rounded-full bg-[var(--color-brand-primary)] text-[var(--color-surface-dim)] font-black flex items-center justify-center shrink-0"
          aria-label="Account menu"
        >
          {initial}
        </button>
      </header>

      {/* Account sheet */}
      {sheetOpen && (
        <div className="lg:hidden fixed inset-0 z-[70]" onClick={() => setSheetOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="absolute top-0 right-0 h-full w-[82%] max-w-xs overflow-y-auto bg-[var(--color-surface-container-low)] border-l border-[var(--color-surface-bright)] p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-on-surface-variant)]">Account</span>
              <button onClick={() => setSheetOpen(false)} className="text-[var(--color-on-surface-variant)]"><X size={18} /></button>
            </div>

            {/* Mini profile */}
            <button
              onClick={() => go('PROFILE')}
              className="w-full flex items-center gap-3 p-3 mb-4 bg-[var(--color-surface-container)] hover:bg-[var(--color-surface-bright)] rounded-xl border border-[var(--color-outline-variant)] text-left"
            >
              <div className="w-10 h-10 rounded-full bg-[var(--color-brand-primary)] text-[var(--color-surface-dim)] font-black flex items-center justify-center">{initial}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[var(--color-on-surface)] truncate">{user?.full_name || user?.email}</p>
                <p className="text-[10px] uppercase font-black text-[var(--color-brand-primary-container)] truncate">{user?.role}</p>
              </div>
              <ChevronRight size={16} className="text-[var(--color-on-surface-variant)]" />
            </button>

            {/* AI tools */}
            {(onOpenAIPath || onOpenAIQuiz) && (
              <div className="mb-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-on-surface-variant)] mb-2">AI Tools</p>
                <div className="space-y-1">
                  {onOpenAIPath && (
                    <button onClick={() => { setSheetOpen(false); onOpenAIPath(); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-[var(--color-on-surface-variant)] hover:text-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary-container)]/10">
                      <Map size={16} className="text-[var(--color-brand-primary)]" /> Learning Path
                    </button>
                  )}
                  {onOpenAIQuiz && (
                    <button onClick={() => { setSheetOpen(false); onOpenAIQuiz(); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-[var(--color-on-surface-variant)] hover:text-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary-container)]/10">
                      <Sparkles size={16} className="text-[var(--color-brand-primary)]" /> AI Quiz Builder
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Active tracks */}
            {activeTracks.length > 0 && (
              <div className="mb-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-on-surface-variant)] mb-2">Active Tracks</p>
                <div className="space-y-2">
                  {activeTracks.map((c: any, i: number) => (
                    <div key={c.id || i} className="flex items-center gap-2.5">
                      <div className="w-2 h-2 rounded-full bg-[var(--color-brand-primary-container)]" />
                      <span className="text-xs text-[var(--color-on-surface-variant)] font-medium truncate">{c.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => { setSheetOpen(false); onLogout(); }}
              className="w-full flex items-center justify-center gap-2 p-3 mt-2 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 rounded-xl font-bold border border-[var(--color-danger)]/30"
            >
              <LogOut size={16} /> Log out
            </button>
          </div>
        </div>
      )}
    </>
  );
}
