'use client';

import React, { useState } from 'react';
import { Activity, Clock, CheckCircle2, XCircle, AlertCircle, Play, Bell, Loader2 } from 'lucide-react';
import ApiService from '../../services/ApiService';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '../ui/Toast';

export default function SystemHealthMonitor() {
  const { toast } = useToast();
  const [runningTask, setRunningTask] = useState<string | null>(null);
  const [testingSlack, setTestingSlack] = useState(false);

  const { data: taskData, isLoading, refetch } = useQuery({
    queryKey: ['system-task-status'],
    queryFn: async () => {
      return ApiService.getAllTaskStatus();
    },
    refetchInterval: 10000 // Auto-poll every 10s
  });

  const runNow = async (taskName: string) => {
    setRunningTask(taskName);
    try {
      await ApiService.triggerTask(taskName);
      toast('success', `Task '${taskName}' queued. Telemetry will refresh shortly.`);
      // Give the background task a moment, then refresh telemetry.
      setTimeout(() => refetch(), 2500);
    } catch (err: any) {
      toast('error', err?.message || `Failed to trigger ${taskName}`);
    } finally {
      setRunningTask(null);
    }
  };

  const testSlack = async () => {
    setTestingSlack(true);
    try {
      const res: any = await ApiService.testSlackAlert();
      if (res?.sent) toast('success', 'Test alert delivered to Slack ✅');
      else if (!res?.configured) toast('error', 'SLACK_WEBHOOK_URL is not configured.');
      else toast('error', res?.error || 'Slack post failed.');
    } catch (err: any) {
      toast('error', err?.message || 'Slack test failed');
    } finally {
      setTestingSlack(false);
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-[var(--color-surface-container)] rounded w-1/4"></div>
        <div className="h-64 bg-[var(--color-surface-container)] rounded-xl"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-[var(--color-on-surface)] flex items-center gap-2">
            <Activity className="w-6 h-6 text-[var(--color-success)]" />
            System Background Telemetry
          </h2>
          <p className="text-[var(--color-on-surface-variant)] text-sm mt-1">Live monitoring of async worker tasks and system crons.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={testSlack}
            disabled={testingSlack}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--color-surface-container)] hover:bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] text-[var(--color-on-surface)] text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {testingSlack ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
            Test Slack Alert
          </button>
          <div className="flex items-center gap-2 text-xs text-[var(--color-on-surface-variant)] font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-success)] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-success)]"></span>
            </span>
            Live Polling Active
          </div>
        </div>
      </div>

      <div className="bg-[var(--color-surface-dim)] border border-[var(--color-outline-variant)] rounded-2xl overflow-x-auto shadow-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[var(--color-surface-dim)]/50 border-b border-[var(--color-outline-variant)] text-[var(--color-on-surface-variant)] text-xs uppercase tracking-widest font-bold">
              <th className="p-4">Task Definition</th>
              <th className="p-4">Status</th>
              <th className="p-4">Last Executed</th>
              <th className="p-4 text-right">Total Runs</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-outline-variant)]">
            {!taskData || taskData.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-[var(--color-on-surface-variant)] text-sm">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  No telemetry data received from the engine yet.
                </td>
              </tr>
            ) : (
              taskData.map((task: any, i: number) => {
                const failed = task.status === 'failed' || task.status === 'failure';
                return (
                <tr key={i} className="hover:bg-[var(--color-surface-container)]/30 transition-colors align-top">
                  <td className="p-4">
                    <span className="text-[var(--color-on-surface)] font-medium block">{task.task_name}</span>
                    <span className="text-xs text-[var(--color-on-surface-variant)] block mt-0.5">{task.worker_id || 'system-cron'}</span>
                    {failed && task.error_message ? (
                      <span className="text-xs text-[var(--color-danger)]/80 block mt-1 max-w-md break-words">{task.error_message}</span>
                    ) : null}
                  </td>
                  <td className="p-4">
                    {task.status === 'success' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--color-success)]/10 text-[var(--color-success)] text-xs font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Healthy
                      </span>
                    ) : failed ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--color-danger)]/10 text-[var(--color-danger)] text-xs font-semibold">
                        <XCircle className="w-3.5 h-3.5" /> Failed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--color-surface-container-high)]/10 text-[var(--color-on-surface-variant)] text-xs font-semibold">
                        <Clock className="w-3.5 h-3.5" /> Idle
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 text-[var(--color-on-surface)] text-sm">
                      <Clock className="w-4 h-4 text-[var(--color-on-surface-variant)]" />
                      {task.executed_at ? new Date(task.executed_at).toLocaleString() : 'Never'}
                    </div>
                  </td>
                  <td className="p-4 text-right text-[var(--color-on-surface)] text-sm font-mono">
                    {task.runs ?? 0}
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => runNow(task.task_name)}
                      disabled={runningTask === task.task_name}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[var(--color-brand-primary-container)]/10 hover:bg-[var(--color-brand-primary-container)]/20 text-[var(--color-brand-primary)] text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      {runningTask === task.task_name
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Play className="w-3.5 h-3.5" />}
                      Run now
                    </button>
                  </td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
