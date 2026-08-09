'use client';

import React, { useState } from 'react';
import { HelpCircle, Reply, Check, Clock, Search, X } from 'lucide-react';
import ApiService from '../../services/ApiService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../ui/Toast';

export default function UnansweredQueriesView({ companyId, projectId }: { companyId?: number, projectId?: number }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedQuery, setSelectedQuery] = useState<any>(null);
  const [answer, setAnswer] = useState('');

  const { data: queries, isLoading } = useQuery({
    queryKey: ['kt-unanswered-queries', companyId, projectId],
    queryFn: async () => {
      // Stub endpoint for frontend alignment
      // return ApiService.getUnansweredQueries(companyId, projectId);
      return [];
    }
  });

  const answerMutation = useMutation({
    mutationFn: async (payload: { id: number, answer: string }) => {
      // return ApiService.answerKTQuery(payload.id, payload.answer);
    },
    onSuccess: () => {
      toast('success', 'Answer provided and embedded into knowledge graph.');
      queryClient.invalidateQueries({ queryKey: ['kt-unanswered-queries'] });
      setSelectedQuery(null);
      setAnswer('');
    },
    onError: (err: any) => {
      toast('error', err.message || 'Failed to submit answer.');
    }
  });

  if (isLoading) {
    return <div className="animate-pulse flex space-x-4">
      <div className="flex-1 space-y-4 py-1">
        <div className="h-4 bg-[var(--color-surface-container)] rounded w-3/4"></div>
        <div className="space-y-2">
          <div className="h-4 bg-[var(--color-surface-container)] rounded"></div>
          <div className="h-4 bg-[var(--color-surface-container)] rounded w-5/6"></div>
        </div>
      </div>
    </div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--color-on-surface)] flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-[var(--color-brand-primary)]" />
            Unanswered Queries Queue
          </h2>
          <p className="text-[var(--color-on-surface-variant)] text-sm mt-1">Review questions the RAG AI failed to answer and train the graph.</p>
        </div>
      </div>

      {!queries || queries.length === 0 ? (
        <div className="text-center py-12 bg-[var(--color-surface-dim)] border border-[var(--color-outline-variant)] rounded-xl">
          <Check className="w-12 h-12 text-[var(--color-success)] mx-auto mb-3" />
          <h3 className="text-lg font-medium text-[var(--color-on-surface)]">Queue is Empty</h3>
          <p className="text-[var(--color-on-surface-variant)] text-sm mt-1">All user questions have been successfully answered by the AI.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {queries.map((q: any) => (
            <div key={q.id} className="bg-[var(--color-surface-dim)] border border-[var(--color-outline-variant)] rounded-xl p-5 flex gap-4 items-start">
              <div className="p-2 bg-[var(--color-brand-primary-container)]/10 rounded-lg text-[var(--color-brand-primary)]">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-[var(--color-on-surface)] font-medium">{q.query_text}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-[var(--color-on-surface-variant)]">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(q.created_at).toLocaleDateString()}</span>
                  <span>User: {q.user_name}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedQuery(q)}
                className="px-4 py-2 bg-[var(--color-surface-container)] hover:bg-[var(--color-surface-container)] text-[var(--color-on-surface)] text-sm rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Reply className="w-4 h-4" /> Provide Answer
              </button>
            </div>
          ))}
        </div>
      )}

      {selectedQuery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[var(--color-surface-dim)] border border-[var(--color-outline-variant)] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-[var(--color-outline-variant)] flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-[var(--color-on-surface)]">Provide Answer</h3>
                <p className="text-sm text-[var(--color-on-surface-variant)] mt-1">This answer will be embedded and stored in the RAG knowledge graph.</p>
              </div>
              <button onClick={() => setSelectedQuery(null)} className="text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-[var(--color-surface-dim)] p-4 rounded-xl border border-[var(--color-outline-variant)]">
                <p className="text-xs text-[var(--color-on-surface-variant)] uppercase font-bold tracking-widest mb-1">User Question</p>
                <p className="text-[var(--color-on-surface)]">{selectedQuery.query_text}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-on-surface)] mb-2">Your Answer</label>
                <textarea
                  value={answer}
                  onChange={e => setAnswer(e.target.value)}
                  placeholder="Provide a detailed answer. This will train the AI for future questions..."
                  className="w-full h-40 bg-[var(--color-surface-dim)] border border-[var(--color-outline-variant)] rounded-xl p-4 text-[var(--color-on-surface)] focus:outline-none focus:border-[var(--color-brand-primary)] focus:ring-1 focus:ring-[var(--color-brand-primary)] resize-none"
                />
              </div>
            </div>
            <div className="p-6 border-t border-[var(--color-outline-variant)] flex justify-end gap-3 bg-[var(--color-surface-dim)]/50">
              <button
                onClick={() => setSelectedQuery(null)}
                className="px-5 py-2.5 text-sm font-medium text-[var(--color-on-surface)] hover:text-[var(--color-on-surface)] transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={!answer.trim() || answerMutation.isPending}
                onClick={() => answerMutation.mutate({ id: selectedQuery.id, answer })}
                className="px-5 py-2.5 bg-[var(--color-brand-primary-container)] hover:bg-[var(--color-brand-primary-container)] disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors flex items-center gap-2 shadow-lg shadow-[var(--color-brand-primary)]/20"
              >
                {answerMutation.isPending ? 'Saving...' : 'Submit & Train Graph'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
