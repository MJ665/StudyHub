'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageSquare, Send, Loader2, Bot, User, ShieldCheck, FileText,
  Plus, Trash2, Pencil, Copy, Check, ThumbsUp, ThumbsDown, Share2,
} from 'lucide-react';
import ApiService from '@/services/ApiService';
import { useKTNavStore } from '@/stores/ktNavStore';
import { useKTGateStore } from '@/stores/ktGateStore';
import KTGate from './KTGate';
import KTGraphCanvas from './KTGraphCanvas';
import { ChatMarkdown } from './ChatMarkdown';
import { toast } from 'react-hot-toast';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '/api';

interface ChatMsg {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: any[];
  confidence?: number | null;
  feedback?: boolean | null;
  isError?: boolean;
  streaming?: boolean;
  graph?: { nodes: any[]; edges: any[] } | null;
  onboarding?: boolean;
  reasoningOpen?: boolean;
}
interface SessionRow {
  session_id: string;
  title: string;
  message_count: number;
  last_message_at?: string | null;
}

export default function KTChatView() {
  const { selectedProject, setView } = useKTNavStore();
  const gateStore = useKTGateStore();

  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [query, setQuery] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [internalAuth, setInternalAuth] = useState(false);
  const [booting, setBooting] = useState(true);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [sessionsOpen, setSessionsOpen] = useState(false); // mobile sessions drawer
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, streaming]);

  // Persist the active session per project so the conversation survives
  // navigation and reloads (Bug 15: chat was wiped because sessionId lived only
  // in component state).
  const activeKey = selectedProject ? `kt_active_session:${selectedProject.id}` : null;
  const rememberSession = useCallback((sid: string | null) => {
    if (typeof window === 'undefined' || !activeKey) return;
    if (sid) localStorage.setItem(activeKey, sid);
    else localStorage.removeItem(activeKey);
  }, [activeKey]);

  const refreshSessions = useCallback(async (): Promise<SessionRow[]> => {
    try {
      // Scope the sidebar to the ACTIVE project so each project shows only its
      // own chats (Claude-style projects) — switching projects never bleeds
      // another project's threads.
      const rows = await ApiService.getKTSessions(undefined, selectedProject?.id);
      const list = Array.isArray(rows) ? rows : [];
      setSessions(list);
      return list;
    } catch { return []; }
  }, [selectedProject?.id]);

  // Boot: JWT users get the multi-session experience. Restore the last active
  // session (or the most recent one) so returning to chat shows the conversation.
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('study_token') : null;
    if (!token || !selectedProject) { setBooting(false); return; }
    setInternalAuth(true);
    if (gateStore.authMode !== 'jwt') gateStore.setAuthMode('jwt');
    (async () => {
      const list = await refreshSessions();
      const stored = typeof window !== 'undefined' && activeKey ? localStorage.getItem(activeKey) : null;
      const target =
        (stored && list.find(s => s.session_id === stored)?.session_id) ||
        list[0]?.session_id ||
        null;
      if (target) await openSession(target);
      setBooting(false);
    })();
  }, [selectedProject, refreshSessions]); // eslint-disable-line react-hooks/exhaustive-deps

  const startNewChat = useCallback(async () => {
    if (!selectedProject) return;
    try {
      const res = await ApiService.startKTChatSession([selectedProject.id]);
      setSessionId(res.session_id);
      rememberSession(res.session_id);
      setMessages([]);
      refreshSessions();
    } catch (e: any) {
      toast.error(e?.message || 'Could not start a chat');
    }
  }, [selectedProject, refreshSessions]);

  const openSession = useCallback(async (sid: string) => {
    setSessionId(sid);
    rememberSession(sid);
    try {
      const rows = await ApiService.getSessionMessages(sid);
      setMessages(
        (Array.isArray(rows) ? rows : []).map((m: any) => ({
          id: m.id, role: m.role, content: m.content,
          sources: m.sources || [], confidence: m.confidence_score, feedback: m.feedback,
        })),
      );
    } catch { setMessages([]); }
  }, []);

  const renameSession = useCallback(async (sid: string, current: string) => {
    const title = window.prompt('Rename chat', current);
    if (!title || !title.trim()) return;
    try { await ApiService.renameKTSession(sid, title.trim()); refreshSessions(); }
    catch (e: any) { toast.error(e?.message || 'Rename failed'); }
  }, [refreshSessions]);

  const deleteSession = useCallback(async (sid: string) => {
    if (!window.confirm('Delete this chat and its messages?')) return;
    try {
      await ApiService.deleteKTSession(sid);
      if (sid === sessionId) { setSessionId(null); rememberSession(null); setMessages([]); }
      refreshSessions();
    } catch (e: any) { toast.error(e?.message || 'Delete failed'); }
  }, [sessionId, refreshSessions]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const sid = sessionId;
    const text = query.trim();
    if (!text || !sid || streaming) return;
    setQuery('');
    setMessages(prev => [...prev, { role: 'user', content: text }, { role: 'assistant', content: '', streaming: true }]);
    setStreaming(true);

    const token = typeof window !== 'undefined' ? localStorage.getItem('study_token') : null;
    try {
      const resp = await fetch(`${API_BASE}/kt/chat/message/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ session_id: sid, message: text }),
      });
      if (!resp.ok || !resp.body) {
        const msg =
          resp.status === 401 || resp.status === 403
            ? 'Your session expired or you don’t have access to this project. Sign in again, or redeem an access key for it.'
            : resp.status === 429
              ? 'The knowledge assistant is busy right now (rate limited). Give it a moment and try again.'
              : resp.status >= 500
                ? 'The knowledge service hit an error. Please try again in a moment.'
                : 'I couldn’t start a response. Please try again.';
        throw new Error(msg);
      }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      const apply = (patch: Partial<ChatMsg>) =>
        setMessages(prev => { const c = [...prev]; c[c.length - 1] = { ...c[c.length - 1], ...patch }; return c; });
      let acc = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          const s = line.startsWith('data: ') ? line.slice(6) : line;
          if (!s.trim()) continue;
          let d: any; try { d = JSON.parse(s); } catch { continue; }
          if (d.done) {
            apply({ streaming: false, content: d.full_response || acc, sources: d.sources || [], confidence: d.confidence_score, graph: d.graph || null, onboarding: !!d.onboarding });
          } else if (d.token) {
            acc += d.token; apply({ content: acc });
          }
        }
      }
      apply({ streaming: false });
      refreshSessions();
    } catch (err: any) {
      const content =
        err?.name === 'TypeError'
          ? 'I couldn’t reach the knowledge base — check your connection and try again.'
          : (err?.message || 'Something went wrong. Please try again.');
      setMessages(prev => { const c = [...prev]; c[c.length - 1] = { role: 'assistant', content, isError: true }; return c; });
    } finally {
      setStreaming(false);
    }
  };

  const copyMsg = (idx: number, content: string) => {
    navigator.clipboard?.writeText(content);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  const sendFeedback = async (idx: number, helpful: boolean) => {
    setMessages(prev => prev.map((m, i) => (i === idx ? { ...m, feedback: helpful } : m)));
    const mid = messages[idx]?.id;
    if (mid) { try { await ApiService.submitChatFeedback(mid, helpful ? 1 : -1); } catch { /* best-effort */ } }
    toast.success('Feedback recorded');
  };

  const toggleReasoning = (idx: number) => {
    setMessages(prev => prev.map((m, i) => (i === idx ? { ...m, reasoningOpen: !m.reasoningOpen } : m)));
  };

  // ── Guards ──
  if (!selectedProject) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <MessageSquare className="mx-auto text-[var(--color-on-surface-variant)] mb-4" size={40} />
          <h3 className="text-lg font-bold text-[var(--color-on-surface-variant)]">No project selected</h3>
          <p className="text-xs text-[var(--color-on-surface-variant)] mt-2 mb-6">Pick a project you can access to chat over its knowledge.</p>
          <button onClick={() => setView('projects')} className="bg-[var(--color-brand-primary-container)] hover:bg-[var(--color-brand-primary-container)] text-white py-3 px-6 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all">Select Project</button>
        </div>
      </div>
    );
  }
  if (!internalAuth && gateStore.gateState !== 'verified') {
    return <KTGate projectId={selectedProject.id} projectName={selectedProject.name} onUnlock={(_k, sid) => setSessionId(sid)} onCancel={() => setView('projects')} />;
  }

  return (
    <div className="flex-1 flex h-full bg-[var(--color-surface-dim)] overflow-hidden w-full">
      {/* ── Sessions sidebar (ChatGPT-style history) ── */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-[var(--color-outline-variant)] bg-[var(--color-surface-dim)]/70">
        <div className="p-3">
          <button onClick={startNewChat} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[var(--color-brand-primary-container)] hover:bg-[var(--color-brand-primary-container)] text-white text-xs font-bold transition-all">
            <Plus size={15} /> New chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-1 custom-scrollbar">
          {sessions.length === 0 && <p className="text-[11px] text-[var(--color-on-surface-variant)] px-3 py-4">No chats yet.</p>}
          {sessions.map(s => (
            <div key={s.session_id} className={`group flex items-center gap-1 rounded-lg px-2 py-2 cursor-pointer ${s.session_id === sessionId ? 'bg-[var(--color-surface-container-high)]/80' : 'hover:bg-[var(--color-surface-container)]'}`} onClick={() => openSession(s.session_id)}>
              <MessageSquare size={13} className="text-[var(--color-on-surface-variant)] shrink-0" />
              <span className="flex-1 truncate text-xs text-[var(--color-on-surface-variant)]">{s.title || 'New chat'}</span>
              <button onClick={(e) => { e.stopPropagation(); renameSession(s.session_id, s.title); }} className="opacity-0 group-hover:opacity-100 p-1 text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]"><Pencil size={12} /></button>
              <button onClick={(e) => { e.stopPropagation(); deleteSession(s.session_id); }} className="opacity-0 group-hover:opacity-100 p-1 text-[var(--color-on-surface-variant)] hover:text-[var(--color-danger)]"><Trash2 size={12} /></button>
            </div>
          ))}
        </div>
      </aside>

      {/* ── Main chat pane ── */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="px-4 sm:px-8 py-4 border-b border-[var(--color-outline-variant)] flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[var(--color-brand-primary-container)]/10 flex items-center justify-center text-[var(--color-brand-primary)] border border-[var(--color-brand-primary)]/20 shrink-0"><Bot size={18} /></div>
            <div className="min-w-0">
              <h3 className="font-bold text-[var(--color-on-surface)] text-sm truncate">{selectedProject.name} — Knowledge Assistant</h3>
              <span className="text-[9px] font-black uppercase text-[var(--color-success)] tracking-wider">Grounded in approved knowledge</span>
            </div>
          </div>
          <div className="md:hidden flex items-center gap-2">
            <button onClick={() => setSessionsOpen(true)} className="p-2 rounded-lg bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] text-[var(--color-on-surface-variant)]" aria-label="Chat history"><MessageSquare size={16} /></button>
            <button onClick={startNewChat} className="p-2 rounded-lg bg-[var(--color-brand-primary-container)] text-white" aria-label="New chat"><Plus size={16} /></button>
          </div>
        </div>

        {/* MOBILE: sessions drawer (desktop uses the left sidebar) */}
        {sessionsOpen && (
          <div className="md:hidden fixed inset-0 z-[70]" onClick={() => setSessionsOpen(false)}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div className="absolute top-0 left-0 h-full w-[80%] max-w-xs overflow-y-auto bg-[var(--color-surface-container-low)] border-r border-[var(--color-surface-bright)] p-3" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => { startNewChat(); setSessionsOpen(false); }} className="w-full flex items-center justify-center gap-2 py-2.5 mb-3 rounded-xl bg-[var(--color-brand-primary-container)] text-white text-xs font-bold">
                <Plus size={15} /> New chat
              </button>
              {sessions.length === 0 && <p className="text-[11px] text-[var(--color-on-surface-variant)] px-2 py-4">No chats yet.</p>}
              <div className="space-y-1">
                {sessions.map(s => (
                  <div key={s.session_id} className={`group flex items-center gap-1 rounded-lg px-2 py-2 cursor-pointer ${s.session_id === sessionId ? 'bg-[var(--color-surface-container-high)]/80' : 'hover:bg-[var(--color-surface-container)]'}`} onClick={() => { openSession(s.session_id); setSessionsOpen(false); }}>
                    <MessageSquare size={13} className="text-[var(--color-on-surface-variant)] shrink-0" />
                    <span className="flex-1 truncate text-xs text-[var(--color-on-surface-variant)]">{s.title || 'New chat'}</span>
                    <button onClick={(e) => { e.stopPropagation(); renameSession(s.session_id, s.title); }} className="p-1 text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]"><Pencil size={12} /></button>
                    <button onClick={(e) => { e.stopPropagation(); deleteSession(s.session_id); }} className="p-1 text-[var(--color-on-surface-variant)] hover:text-[var(--color-danger)]"><Trash2 size={12} /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 custom-scrollbar">
          {booting && <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-[var(--color-brand-primary)]" size={32} /></div>}
          {!booting && !sessionId && messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto text-[var(--color-on-surface-variant)] py-12">
              <Bot size={44} className="text-[var(--color-brand-primary)] mb-5 opacity-40" />
              <h4 className="text-base font-bold text-[var(--color-on-surface-variant)]">Ask the knowledge base</h4>
              <p className="text-xs text-[var(--color-on-surface-variant)] mt-2 leading-relaxed">Start a new chat to ask about {selectedProject.name}. Answers are grounded in approved, ingested documents with citations.</p>
              <button onClick={startNewChat} className="mt-5 bg-[var(--color-brand-primary-container)] hover:bg-[var(--color-brand-primary-container)] text-white py-2.5 px-5 rounded-xl font-bold text-xs">Start chatting</button>
            </div>
          )}

          {messages.map((msg, i) => {
            const isUser = msg.role === 'user';
            return (
              <div key={i} className={`flex items-start gap-3 sm:gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border shrink-0 ${isUser ? 'bg-[var(--color-brand-primary-container)] border-[var(--color-brand-primary)] text-[var(--color-on-surface)]' : 'bg-[var(--color-surface-container)] border-[var(--color-outline-variant)] text-[var(--color-brand-primary)]'}`}>
                  {isUser ? <User size={14} /> : <Bot size={14} />}
                </div>
                <div className={`max-w-[85%] sm:max-w-[75%] px-4 sm:px-6 py-4 rounded-3xl ${isUser ? 'bg-[var(--color-brand-primary-container)] text-white rounded-tr-none' : msg.isError ? 'bg-[var(--color-danger)]/20 border border-[var(--color-danger)]/20 text-[var(--color-danger)] rounded-tl-none' : msg.onboarding ? 'bg-[var(--color-brand-primary-container)]/10 border border-[var(--color-brand-primary)]/30 text-[var(--color-on-surface)] rounded-tl-none' : 'bg-[var(--color-surface-container)]/60 border border-[var(--color-outline-variant)] text-[var(--color-on-surface)] rounded-tl-none'}`}>
                  {isUser ? (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  ) : msg.streaming && !msg.content ? (
                    <div className="flex gap-1 items-center py-1">
                      <div className="w-1.5 h-1.5 bg-[var(--color-brand-primary-container)] rounded-full animate-bounce" />
                      <div className="w-1.5 h-1.5 bg-[var(--color-brand-primary-container)] rounded-full animate-bounce [animation-delay:0.2s]" />
                      <div className="w-1.5 h-1.5 bg-[var(--color-brand-primary-container)] rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  ) : (
                    <ChatMarkdown content={msg.content} />
                  )}

                  {!isUser && (msg.graph?.nodes?.length > 0 || (msg.sources && msg.sources.length > 0)) && (
                    <div className="pt-3 mt-3 border-t border-[var(--color-outline-variant)]/40">
                      <button
                        onClick={() => toggleReasoning(i)}
                        className="w-full flex items-center justify-between py-2 px-2 -mx-2 rounded-lg hover:bg-[var(--color-surface-container)]/30 transition-colors"
                      >
                        <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-on-surface-variant)] flex items-center gap-1.5">
                          <Share2 size={11} /> Reasoning trace
                        </p>
                        <svg
                          className={`w-4 h-4 text-[var(--color-on-surface-variant)] transition-transform ${msg.reasoningOpen ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                      </button>

                      {msg.reasoningOpen && (
                        <div className="mt-3 space-y-3">
                          {msg.graph && msg.graph.nodes?.length > 0 && (
                            <div>
                              <p className="text-[8px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)] mb-2 opacity-70">Knowledge graph</p>
                              <div className="h-[280px] w-full border border-[var(--color-outline-variant)]/50 rounded-lg overflow-hidden bg-[var(--color-surface-dim)]/50">
                                <KTGraphCanvas nodes={msg.graph.nodes} edges={msg.graph.edges} className="h-full w-full" />
                              </div>
                            </div>
                          )}

                          {msg.sources && msg.sources.length > 0 && (
                            <div>
                              <p className="text-[8px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)] mb-2 opacity-70">
                                Sources ({msg.sources.length})
                              </p>
                              <div className="space-y-1.5">
                                {msg.sources.map((src: any, idx: number) => (
                                  <div key={idx} className="px-2.5 py-1.5 bg-[var(--color-surface-container)]/40 border border-[var(--color-outline-variant)]/50 rounded-lg text-[9px] text-[var(--color-on-surface-variant)] flex items-start gap-2">
                                    <FileText size={11} className="shrink-0 mt-0.5 text-[var(--color-brand-primary)]" />
                                    <div className="flex-1 min-w-0">
                                      <div className="font-bold text-[var(--color-brand-primary)] truncate">{src.doc_title || src.title || 'Document'}</div>
                                      {src.chunk_id && <div className="text-[8px] opacity-60 truncate">ID: {src.chunk_id}</div>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {!msg.graph?.nodes?.length && !msg.sources?.length && (
                            <p className="text-[9px] text-[var(--color-on-surface-variant)] italic opacity-60">No reasoning data available</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {!isUser && !msg.isError && !msg.streaming && (
                    <div className="flex items-center justify-between mt-3 gap-2">
                      {typeof msg.confidence === 'number' ? (
                        <div className={`flex items-center gap-1.5 text-[9px] font-bold px-2 py-0.5 rounded-full ${msg.confidence >= 70 ? 'text-[var(--color-success)] bg-[var(--color-success)]/40 border border-[var(--color-success)]/20' : msg.confidence >= 40 ? 'text-[var(--color-warning)] bg-[var(--color-warning)]/40 border border-[var(--color-warning)]/20' : 'text-[var(--color-danger)] bg-[var(--color-danger)]/40 border border-[var(--color-danger)]/20'}`}>
                          <ShieldCheck size={10} /><span>{Math.round(msg.confidence)}% confidence</span>
                        </div>
                      ) : <div />}
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => copyMsg(i, msg.content)} className="p-1.5 rounded-lg border border-[var(--color-outline-variant)] text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] hover:border-[var(--color-outline-variant)]" title="Copy">
                          {copiedIdx === i ? <Check size={12} className="text-[var(--color-success)]" /> : <Copy size={12} />}
                        </button>
                        <button onClick={() => sendFeedback(i, true)} className={`p-1.5 rounded-lg border transition-all ${msg.feedback === true ? 'bg-[var(--color-success)]/20 border-[var(--color-success)]/50 text-[var(--color-success)]' : 'border-[var(--color-outline-variant)] text-[var(--color-on-surface-variant)] hover:text-[var(--color-success)]'}`}><ThumbsUp size={12} /></button>
                        <button onClick={() => sendFeedback(i, false)} className={`p-1.5 rounded-lg border transition-all ${msg.feedback === false ? 'bg-[var(--color-danger)]/20 border-[var(--color-danger)]/50 text-[var(--color-danger)]' : 'border-[var(--color-outline-variant)] text-[var(--color-on-surface-variant)] hover:text-[var(--color-danger)]'}`}><ThumbsDown size={12} /></button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 sm:p-6 border-t border-[var(--color-outline-variant)] bg-[var(--color-surface-dim)]/60">
          <form onSubmit={handleSend} className="relative max-w-4xl mx-auto w-full">
            <input
              type="text"
              placeholder={sessionId ? 'Ask about this project…' : 'Start a new chat to ask a question'}
              disabled={!sessionId || streaming}
              className="w-full bg-[var(--color-surface-dim)] border border-[var(--color-outline-variant)] rounded-[2rem] py-4 pl-6 pr-16 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/50 focus:border-[var(--color-brand-primary)] transition-all text-sm font-medium text-[var(--color-on-surface)] disabled:opacity-50"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button type="submit" disabled={!query.trim() || streaming || !sessionId} className="absolute right-2.5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-[var(--color-brand-primary-container)] hover:bg-[var(--color-brand-primary-container)] disabled:bg-[var(--color-surface-container)] disabled:text-[var(--color-on-surface-variant)] text-white flex items-center justify-center active:scale-95 transition-all">
              {streaming ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
