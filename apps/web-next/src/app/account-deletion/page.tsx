import React from 'react';
import { DocShell } from '@/components/common/DocShell';

export const metadata = {
  title: 'Delete Your Account — GrindBuddy',
  description: 'Learn how to delete your GrindBuddy account and what happens to your data.',
};

export default function AccountDeletion() {
  return (
    <DocShell title="Delete Your Account" updated="Last updated: 2026">
      <section>
        <h2>Self-Service Account Deletion</h2>
        <p>
          GrindBuddy offers self-service account deletion through the app. You can delete your
          account at any time without contacting support.
        </p>
      </section>

      <section>
        <h2>How to Delete Your Account</h2>
        <p>
          In the GrindBuddy app, open <strong>Profile → Security → Delete account</strong>.
          You will be asked to confirm your choice twice before the deletion is processed.
        </p>
      </section>

      <section>
        <h2>What Happens When You Delete Your Account</h2>
        <p>
          When you delete your account, the following changes occur:
        </p>
        <ul className="list-disc list-inside space-y-2 mt-4 text-[var(--color-on-surface-variant)]">
          <li>Your account is deactivated and can no longer be used to log in.</li>
          <li>Your personal identifiers (name and email) are anonymized.</li>
          <li>Your login credentials are permanently erased.</li>
          <li>All active sessions and push-notification tokens are revoked.</li>
          <li>
            Assessment records owned by your organization are retained for compliance purposes,
            but are no longer linked to your identifiable personal information.
          </li>
        </ul>
      </section>

      <section>
        <h2>Processing Timeline</h2>
        <p>
          Account deletion requests are processed within 30 days. Once processed, your personal
          data cannot be recovered.
        </p>
      </section>

      <section>
        <h2>Alternative: Request via Email</h2>
        <p>
          If you prefer not to use the in-app deletion tool, you can also request account deletion
          by email. Contact your organization administrator or email{' '}
          <a href="mailto:contact.hackathonmj@gmail.com">contact.hackathonmj@gmail.com</a>{' '}
          with your request, and we will process it within 30 days.
        </p>
      </section>

      <section>
        <h2>Questions</h2>
        <p>
          For questions about account deletion or data privacy, contact{' '}
          <a href="mailto:contact.hackathonmj@gmail.com">contact.hackathonmj@gmail.com</a>.
        </p>
      </section>
    </DocShell>
  );
}
