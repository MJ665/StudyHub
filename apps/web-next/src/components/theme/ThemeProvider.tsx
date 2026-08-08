'use client';

/**
 * Tri-theme system: Classic (the original cool lavender/teal — the default),
 * Warm Dark, and Warm Light (warm minimalism). Themes swap CSS-variable values
 * via a `data-theme` attribute on <html> (see globals.css). Resolution order:
 *   per-user preference (localStorage) → NEXT_PUBLIC_DEFAULT_THEME → Classic.
 * Registry-driven so adding a theme later is a one-line change.
 */
import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'classic' | 'warm-dark' | 'warm-light';

export const THEME_REGISTRY: { id: Theme; label: string }[] = [
  { id: 'classic', label: 'Classic' },
  { id: 'warm-dark', label: 'Warm Dark' },
  { id: 'warm-light', label: 'Warm Light' },
];

const THEME_IDS = THEME_REGISTRY.map((t) => t.id);
const ENV_DEFAULT = (process.env.NEXT_PUBLIC_DEFAULT_THEME as Theme) || 'classic';
const STORAGE_KEY = 'sb-theme';

// Native shell colors per theme (mirror globals.css --color-surface-dim) so the
// Expo WebView wrapper can match its status bar + background to the web theme.
const NATIVE_SHELL: Record<Theme, { bg: string; dark: boolean }> = {
  classic: { bg: '#0c1324', dark: true },
  'warm-dark': { bg: '#14100c', dark: true },
  'warm-light': { bg: '#faf7f1', dark: false },
};

function postThemeToNative(t: Theme) {
  if (typeof window === 'undefined') return;
  const rn = (window as any).ReactNativeWebView;
  if (!rn?.postMessage) return;
  try {
    rn.postMessage(JSON.stringify({ type: 'THEME', theme: t, ...NATIVE_SHELL[t] }));
  } catch { /* ignore */ }
}

function applyTheme(t: Theme) {
  if (typeof document === 'undefined') return;
  const el = document.documentElement;
  if (t === 'classic') el.removeAttribute('data-theme');
  else el.setAttribute('data-theme', t);
  postThemeToNative(t); // keep the mobile shell in sync when inside the WebView
}

interface ThemeCtx { theme: Theme; setTheme: (t: Theme) => void; }
const Ctx = createContext<ThemeCtx>({ theme: ENV_DEFAULT, setTheme: () => {} });
export const useTheme = () => useContext(Ctx);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(ENV_DEFAULT);

  useEffect(() => {
    let resolved: Theme = ENV_DEFAULT;
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
      if (stored && THEME_IDS.includes(stored)) resolved = stored;
    } catch { /* ignore */ }
    setThemeState(resolved);
    applyTheme(resolved);
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    applyTheme(t);
    try { localStorage.setItem(STORAGE_KEY, t); } catch { /* ignore */ }
  };

  return <Ctx.Provider value={{ theme, setTheme }}>{children}</Ctx.Provider>;
}
