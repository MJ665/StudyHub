'use client';

import { useRouter } from 'next/navigation';
import NotificationsView from '@/components/dashboard/NotificationsView';
import { useSessionStore } from '@/stores/sessionStore';

export default function NotificationsPage() {
  const router = useRouter();
  const { user } = useSessionStore();
  return (
    <NotificationsView
      user={user}
      onBack={() => router.push('/dashboard')}
      onNavigate={(type: string, id?: number) => {
        if (type === 'new_assignment') router.push('/assignments');
        else if (type === 'exam_result') router.push(id ? `/exam-result/${id}` : '/exams');
        else if (type === 'exam') router.push(id ? `/exam/${id}` : '/exams');
        else if (type === 'attempt') router.push('/history');
        else if (type === 'kt' || type === 'document') router.push('/kt');
      }}
    />
  );
}
