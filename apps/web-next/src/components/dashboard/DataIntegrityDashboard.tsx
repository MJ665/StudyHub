'use client';

import React, { useState } from 'react';
import { Database, AlertTriangle, CheckCircle, RefreshCcw, Merge, CloudOff } from 'lucide-react';
import ApiService from '../../services/ApiService';
import { useMutation } from '@tanstack/react-query';

export default function DataIntegrityDashboard() {
  const [lastRun, setLastRun] = useState<{task: string, status: string, message: string} | null>(null);

  const runTaskMutation = useMutation({
    mutationFn: async (taskName: string) => {
      // In a real app, this would trigger the actual backend endpoint for the script
      return ApiService.triggerTask(taskName);
    },
    onSuccess: (data, taskName) => {
      setLastRun({ task: taskName, status: 'Success', message: 'Task executed successfully.' });
    },
    onError: (err: any, taskName) => {
      setLastRun({ task: taskName, status: 'Error', message: err.message || 'Task failed.' });
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--color-on-surface)] flex items-center gap-2">
            <Database className="w-6 h-6 text-[var(--color-brand-primary)]" />
            Data Integrity & Scrubbing
          </h2>
          <p className="text-[var(--color-on-surface-variant)]">Run enterprise data scrubbing and integrity tools</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Merge Duplicate Users */}
        <div className="bg-[var(--color-surface-dim)] border border-[var(--color-outline-variant)] rounded-xl p-6 flex flex-col gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400">
              <Merge className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[var(--color-on-surface)]">Merge Duplicate Users</h3>
              <p className="text-sm text-[var(--color-on-surface-variant)] mt-1">
                Scans the relational database for users with matching emails or conflicting UUIDs and merges their attempts, roles, and profiles.
              </p>
            </div>
          </div>
          <button 
            onClick={() => runTaskMutation.mutate('merge_duplicate_users')}
            disabled={runTaskMutation.isPending}
            className="mt-auto flex items-center justify-center gap-2 w-full bg-[var(--color-surface-container)] hover:bg-[var(--color-surface-container)] text-[var(--color-on-surface)] py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {runTaskMutation.isPending ? <RefreshCcw className="w-4 h-4 animate-spin" /> : 'Run Merge Tool'}
          </button>
        </div>

        {/* Fix Orphaned Records */}
        <div className="bg-[var(--color-surface-dim)] border border-[var(--color-outline-variant)] rounded-xl p-6 flex flex-col gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-[var(--color-warning)]/10 rounded-lg text-[var(--color-warning)]">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[var(--color-on-surface)]">Fix Orphaned Records</h3>
              <p className="text-sm text-[var(--color-on-surface-variant)] mt-1">
                Identifies and cleans up attempts, assignments, and roles that are missing valid parent group references.
              </p>
            </div>
          </div>
          <button 
            onClick={() => runTaskMutation.mutate('fix_orphaned_records')}
            disabled={runTaskMutation.isPending}
            className="mt-auto flex items-center justify-center gap-2 w-full bg-[var(--color-surface-container)] hover:bg-[var(--color-surface-container)] text-[var(--color-on-surface)] py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {runTaskMutation.isPending ? <RefreshCcw className="w-4 h-4 animate-spin" /> : 'Run Orphan Fix'}
          </button>
        </div>

        {/* S3 Resource Pruning */}
        <div className="bg-[var(--color-surface-dim)] border border-[var(--color-outline-variant)] rounded-xl p-6 flex flex-col gap-4 md:col-span-2 lg:col-span-1">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-[var(--color-danger)]/10 rounded-lg text-[var(--color-danger)]">
              <CloudOff className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[var(--color-on-surface)]">S3 Resource Pruning</h3>
              <p className="text-sm text-[var(--color-on-surface-variant)] mt-1">
                Removes unlinked files, temporary exports, and abandoned profile photo uploads from AWS S3 buckets to reduce cloud storage costs.
              </p>
            </div>
          </div>
          <button 
            onClick={() => runTaskMutation.mutate('prune_s3_resources')}
            disabled={runTaskMutation.isPending}
            className="mt-auto flex items-center justify-center gap-2 w-full bg-[var(--color-surface-container)] hover:bg-[var(--color-surface-container)] text-[var(--color-on-surface)] py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {runTaskMutation.isPending ? <RefreshCcw className="w-4 h-4 animate-spin" /> : 'Execute Storage Prune'}
          </button>
        </div>
      </div>

      {lastRun && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 ${lastRun.status === 'Success' ? 'bg-[var(--color-success)]/10 border-[var(--color-success)]/20 text-[var(--color-success)]' : 'bg-[var(--color-danger)]/10 border-[var(--color-danger)]/20 text-[var(--color-danger)]'}`}>
          {lastRun.status === 'Success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
          <div>
            <p className="font-semibold">{lastRun.task} - {lastRun.status}</p>
            <p className="text-sm opacity-90">{lastRun.message}</p>
          </div>
        </div>
      )}
    </div>
  );
}
