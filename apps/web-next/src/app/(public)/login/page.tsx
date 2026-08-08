'use client';

/**
 * Email-first login (owner decision #6) — the ONLY sign-in path.
 *
 * Individual email + password credentials; new accounts receive theirs by
 * email at creation. The legacy group-pattern login is fully retired.
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Loader2, Mail } from 'lucide-react';

import ApiService from '@/services/ApiService';
import { landingRouteFor, useSessionStore } from '@/stores/sessionStore';

export default function LoginPage() {
  const router = useRouter();
  const { user, hydrated, hydrate } = useSessionStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!hydrated) void hydrate();
  }, [hydrated, hydrate]);

  useEffect(() => {
    if (hydrated && user) router.replace(landingRouteFor(user));
  }, [hydrated, user, router]);

  const finishLogin = async () => {
    const me = await hydrate();
    router.replace(landingRouteFor(me));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setBusy(true);
    try {
      await ApiService.loginWithEmail(email.trim().toLowerCase(), password);
      await finishLogin();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid email or password');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-surface-dim)] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-[var(--color-on-surface)]">Welcome back</h1>
          <p className="text-[var(--color-on-surface-variant)] mt-2">Sign in to your StudyBuddy account</p>
        </div>

        <form
          onSubmit={submit}
          className="bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] rounded-3xl p-8 shadow-2xl space-y-5"
        >
          <label className="block">
            <span className="text-xs font-bold text-[var(--color-on-surface-variant)] uppercase tracking-wider">
              Work email
            </span>
            <div className="mt-2 flex items-center gap-3 bg-[var(--color-surface-container-high)]/60 border border-[var(--color-outline-variant)] rounded-xl px-4 py-3 focus-within:border-indigo-500">
              <Mail size={18} className="text-[var(--color-on-surface-variant)]" />
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="bg-transparent flex-1 text-[var(--color-on-surface)] outline-none placeholder:text-slate-600"
              />
            </div>
          </label>

          <label className="block">
            <span className="text-xs font-bold text-[var(--color-on-surface-variant)] uppercase tracking-wider">
              Password
            </span>
            <div className="mt-2 flex items-center gap-3 bg-[var(--color-surface-container-high)]/60 border border-[var(--color-outline-variant)] rounded-xl px-4 py-3 focus-within:border-indigo-500">
              <KeyRound size={18} className="text-[var(--color-on-surface-variant)]" />
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-transparent flex-1 text-[var(--color-on-surface)] outline-none placeholder:text-slate-600"
              />
            </div>
          </label>

          {error && (
            <p className="text-sm text-rose-400 bg-rose-900/20 border border-rose-500/20 rounded-xl px-4 py-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 bg-[var(--color-brand-primary-container)] hover:bg-indigo-500 disabled:opacity-50 text-[var(--color-on-surface)] py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/30"
          >
            {busy && <Loader2 size={18} className="animate-spin" />}
            Sign in
          </button>

          <div className="flex items-center justify-between text-sm pt-1">
            <button
              type="button"
              onClick={() => router.push('/forgot-password')}
              className="text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]"
            >
              Forgot password?
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
