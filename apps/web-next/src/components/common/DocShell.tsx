import React from 'react';

/**
 * Dark-theme chrome for standalone document pages (privacy, terms, …). These
 * routes have no (app)/(public) layout, so they must provide their own themed
 * background — otherwise text renders on the browser's default white.
 */
export function DocShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0c1324] text-[var(--color-on-surface-variant)]">
      <header className="border-b border-[var(--color-outline-variant)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 md:px-8">
          <a href="/" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logo.png" alt="GrindBuddy" className="h-7 w-7 rounded-lg object-cover" />
            <span className="text-base font-black text-[var(--color-on-surface)]">GrindBuddy</span>
          </a>
          <div className="flex items-center gap-5 text-sm font-semibold text-[var(--color-on-surface-variant)]">
            <a href="/" className="hover:text-[var(--color-on-surface)] transition-colors">Home</a>
            <a href="/login" className="rounded-lg bg-[var(--color-brand-primary-container)] px-4 py-2 text-white hover:bg-[var(--color-brand-primary-container)] transition-colors">Sign in</a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-14 md:px-8">
        <h1 className="text-3xl font-black text-[var(--color-on-surface)]">{title}</h1>
        {updated && <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">{updated}</p>}
        <div className="mt-10 space-y-8 leading-relaxed [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-[var(--color-on-surface)] [&_a]:text-[var(--color-brand-primary)] [&_a]:underline [&_strong]:text-[var(--color-on-surface)]">
          {children}
        </div>
      </main>

      <footer className="border-t border-[var(--color-outline-variant)]">
        <p className="mx-auto max-w-3xl px-5 py-8 text-center text-xs text-[var(--color-on-surface-variant)] md:px-8">
          © {new Date().getFullYear()} GrindBuddy · <a href="/privacy" className="hover:text-[var(--color-on-surface-variant)]">Privacy</a> · <a href="/terms" className="hover:text-[var(--color-on-surface-variant)]">Terms</a> · <a href="/account-deletion" className="hover:text-[var(--color-on-surface-variant)]">Delete Account</a> · <a href="/contact-me" className="hover:text-[var(--color-on-surface-variant)]">Contact</a>
        </p>
      </footer>
    </div>
  );
}
