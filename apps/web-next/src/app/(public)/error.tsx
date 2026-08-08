'use client';

/** Route-group error boundary for public pages (login, recovery, profiles). */

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[var(--color-surface-dim)] flex items-center justify-center p-8">
      <div className="bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] rounded-3xl p-10 max-w-md w-full text-center">
        <h2 className="text-2xl font-black text-[var(--color-on-surface)] mb-2">Something broke</h2>
        <p className="text-[var(--color-on-surface-variant)] text-sm mb-6 break-words">
          {error.message || 'An unexpected error occurred.'}
        </p>
        <div className="flex gap-3">
          <button
            onClick={reset}
            className="flex-1 py-3 bg-[var(--color-brand-primary-container)] hover:bg-indigo-500 text-[var(--color-on-surface)] rounded-xl font-bold transition-all"
          >
            Try again
          </button>
          <a
            href="/login"
            className="flex-1 py-3 bg-[var(--color-surface-container-high)] hover:bg-[var(--color-surface-bright)] text-[var(--color-on-surface)] rounded-xl font-bold transition-all border border-[var(--color-outline-variant)]"
          >
            Sign in
          </a>
        </div>
      </div>
    </div>
  );
}
