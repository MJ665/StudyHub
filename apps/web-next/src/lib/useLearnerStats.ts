'use client';

import { useEffect, useState } from 'react';
import ApiService from '../services/ApiService';

export interface LearnerStats {
  accuracy: number | null;
  streakCount: number;
  activeTracks: any[];
}

/**
 * Shared learner stats (average accuracy, streak, active tracks) used by both the
 * desktop Sidebar and the mobile top bar so mobile has feature parity — the same
 * source, fetched once per mount. Mirrors the fetch previously inline in Sidebar.
 */
export function useLearnerStats(user: any): LearnerStats {
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [streakCount, setStreakCount] = useState<number>(0);
  const [activeTracks, setActiveTracks] = useState<any[]>([]);

  useEffect(() => {
    ApiService.getMyStats()
      .then((res: any) => {
        if (res?.overall_accuracy !== undefined && res?.overall_accuracy !== null) {
          setAccuracy(res.overall_accuracy);
        } else if (res?.banks_attempted?.length > 0) {
          const totalScore = res.banks_attempted.reduce((s: number, b: any) => s + (b.score || 0), 0);
          const totalQ = res.banks_attempted.reduce((s: number, b: any) => s + (b.total || 0), 0);
          setAccuracy(totalQ > 0 ? Math.round((totalScore / totalQ) * 100) : 0);
        }
        if (res?.streak_count !== undefined) setStreakCount(res.streak_count);
      })
      .catch(() => { /* ignore */ });

    if (user?.group_id != null) {
      ApiService.getCourses(user.group_id)
        .then((courses: any[]) => setActiveTracks((courses || []).slice(0, 4)))
        .catch(() => { /* ignore */ });
    }
  }, [user?.group_id]);

  return { accuracy, streakCount, activeTracks };
}
