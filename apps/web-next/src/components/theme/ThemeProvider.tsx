'use client';

/**
 * Tri-theme system: Navy Light (white + navy blue — the default), Navy Dark
 * (deep navy-black), and Classic (the original cool lavender/teal). Themes swap
 * CSS-variable values via a `data-theme` attribute on <html> (see globals.css).
 * Resolution order:
 *   per-user preference (localStorage) → NEXT_PUBLIC_DEFAULT_THEME → Navy Light.
 * Registry-driven so adding a theme later is a one-line change.
 */
import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'navy-light' | 'navy-dark' | 'classic';

export const THEME_REGISTRY: { id: Theme; label: string }[] = [
  { id: 'navy-light', label: 'Navy Light' },
  { id: 'navy-dark', label: 'Navy Dark' },
  { id: 'classic', label: 'Classic' },
];

const THEME_IDS = THEME_REGISTRY.map((t) => t.id);
const ENV_DEFAULT = (process.env.NEXT_PUBLIC_DEFAULT_THEME as Theme) || 'navy-light';
const STORAGE_KEY = 'sb-theme';

// Native shell colors per theme (mirror globals.css --color-surface-dim) so the
// Expo WebView wrapper can match its status bar + background to the web theme.
const NATIVE_SHELL: Record<Theme, { bg: string; dark: boolean }> = {
  'navy-light': { bg: '#ffffff', dark: false },
  'navy-dark': { bg: '#0b1220', dark: true },
  classic: { bg: '#0c1324', dark: true },
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
  if (t === 'navy-light') el.removeAttribute('data-theme');
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
