import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  History, 
  Search, 
  Filter, 
  BrainCircuit, 
  Code, 
  Calendar, 
  Trophy, 
  Clock, 
  ChevronRight,
  TrendingUp,
  Target,
  Zap,
  Loader2,
  FileText
} from 'lucide-react';
import ApiService from '../../services/ApiService';
import { toast } from 'react-hot-toast';

interface QuizAttempt {
  id: number;
  bank_name: string;
  score: number;
  total: number;
  attempted_at: string;
}

interface CodingAttempt {
  id: number;
  question_id: number;
  question_title: string;
  score: number;
  language: string;
  attempted_at: string;
}

interface RegistryData {
  quiz_attempts: QuizAttempt[];
  coding_attempts: CodingAttempt[];
  topic_breakdown: Record<string, { avg: number }>;
  completion_rate: number;
  total_assignments: number;
  assignments_completed: number;
}

interface AttemptHistoryProps {
  user: any;
  onBack: () => void;
}

export default function AttemptHistory({ user, onBack }: AttemptHistoryProps) {
  const [data, setData] = useState<RegistryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'quiz' | 'coding'>('quiz');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const slug = user?.email?.split('@')[0] || user?.id?.toString();
      const registry = await ApiService.getProfileRegistry(slug);
      setData(registry);
    } catch (err) {
      console.error("Failed to fetch history", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGetCertificate = async (attemptId: number) => {
    try {
      const res = await ApiService.request(`/quiz/attempts/${attemptId}/certificate`, { method: 'GET' });
      if (res && res.certificate_url) {
        window.open(res.certificate_url, '_blank');
      }
    } catch (err: any) {
      // Certificate is gated on mentor approval — surface that clearly.
      toast.error(err?.message || 'Certificate is available once a mentor approves your attempt.');
    }
  };

  const handleShareCertificate = async (attemptId: number) => {
    try {
      const res = await ApiService.request(`/quiz/attempts/${attemptId}/certificate`, { method: 'GET' });
      if (res && res.share_url) {
        window.open(res.share_url, '_blank');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Certificate is available once a mentor approves your attempt.');
    }
  };

  const filteredQuiz = data?.quiz_attempts.filter(a => 
    a.bank_name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const filteredCoding = data?.coding_attempts.filter(a => 
    (a.question_title?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    a.id.toString().includes(searchTerm)
  ) || [];

  const bestCoding = Math.max(0, ...(data?.coding_attempts.map(a => a.score) || [0]));
  const avgCoding = data?.coding_attempts.length 
    ? data.coding_attempts.reduce((acc, curr) => acc + (curr.score || 0), 0) / data.coding_attempts.length 
    : 0;

  return (
    <div className="min-h-screen bg-[var(--color-surface-dim)] p-8 font-plus-jakarta">
      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
          <div>
            <h1 className="text-2xl sm:text-4xl font-black text-[var(--color-on-surface)] mb-2 tracking-tight flex items-center gap-4">
              <div className="p-3 bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/20 rounded-2xl text-[var(--color-warning)]">
                <History size={32} />
              </div>
              Attempt Registry
            </h1>
            <p className="text-[var(--color-on-surface-variant)] font-bold uppercase tracking-[0.2em] text-[10px]">Chronological Performance Intelligence Ledger</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-on-surface-variant)] group-focus-within:text-[var(--color-warning)] transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Search historical records..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-[var(--color-surface-container)]/50 border border-[var(--color-outline-variant)] rounded-2xl py-3 pl-12 pr-6 text-sm text-[var(--color-on-surface)] focus:ring-2 focus:ring-[var(--color-warning)]/20 w-full md:w-64 transition-all"
              />
            </div>
            
            <div className="flex bg-[var(--color-surface-container)]/50 p-1 rounded-2xl border border-[var(--color-outline-variant)]">
              <button 
                onClick={() => setActiveTab('quiz')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'quiz' ? 'bg-[var(--color-warning)] text-[var(--color-on-surface-variant)]' : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface-variant)]'}`}
              >
                <BrainCircuit size={14} /> Quiz
              </button>
              <button 
                onClick={() => setActiveTab('coding')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'coding' ? 'bg-[var(--color-warning)] text-[var(--color-on-surface-variant)]' : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface-variant)]'}`}
              >
                <Code size={14} /> Code
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <Loader2 className="animate-spin text-[var(--color-warning)]" size={48} />
            <p className="text-[var(--color-on-surface-variant)] font-black uppercase tracking-widest text-xs">Querying Historical Database...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar Stats */}
            <div className="space-y-6">
               <div className="bg-[var(--color-surface-container)]/40 border border-[var(--color-outline-variant)] p-6 rounded-[2rem]">
                  <p className="text-[10px] text-[var(--color-on-surface-variant)] font-black uppercase tracking-widest mb-4">Quick Insights</p>
                  <div className="space-y-4">
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-[var(--color-on-surface-variant)]">
                           <Trophy size={16} className="text-[var(--color-warning)]" />
                           <span className="text-xs font-bold">Best Score</span>
                        </div>
                        <span className="text-sm font-black text-[var(--color-on-surface)]">{Math.max(0, ...(data?.quiz_attempts.map(a => (a.score/a.total)*100) || [0])).toFixed(0)}%</span>
                     </div>
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-[var(--color-on-surface-variant)]">
                           <TrendingUp size={16} className="text-[var(--color-success)]" />
                           <span className="text-xs font-bold">Accuracy</span>
                        </div>
                         <span className="text-sm font-black text-[var(--color-on-surface)]">{(() => {
                           const qa = data?.quiz_attempts || [];
                           const s = qa.reduce((acc, x) => acc + (x.score || 0), 0);
                           const t = qa.reduce((acc, x) => acc + (x.total || 0), 0);
                           return (t > 0 ? (s / t) * 100 : 0).toFixed(1);
                         })()}%</span>
                     </div>
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-[var(--color-on-surface-variant)]">
                           <Target size={16} className="text-[var(--color-brand-primary)]" />
                           <span className="text-xs font-bold">Total Attempts</span>
                        </div>
                        <span className="text-sm font-black text-[var(--color-on-surface)]">{(data?.quiz_attempts.length || 0) + (data?.coding_attempts.length || 0)}</span>
                     </div>
                  </div>
               </div>

               <div className="bg-[var(--color-surface-container)]/40 border border-[var(--color-outline-variant)] p-6 rounded-[2rem]">
                  <p className="text-[10px] text-[var(--color-on-surface-variant)] font-black uppercase tracking-widest mb-4">Topic Proficiency</p>
                  <div className="space-y-4">
                     {Object.entries(data?.topic_breakdown || {}).slice(0, 5).map(([topic, stats]: [string, any]) => (
                        <div key={topic}>
                           <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest mb-2">
                              <span className="text-[var(--color-on-surface-variant)] truncate max-w-[100px]">{topic}</span>
                              <span className="text-[var(--color-on-surface)]">{stats.avg.toFixed(0)}%</span>
                           </div>
                           <div className="h-1 bg-[var(--color-surface-container-high)] rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${stats.avg}%` }}
                                className="h-full bg-[var(--color-warning)]/50"
                              />
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            </div>

            {/* Main History List */}
            <div className="lg:col-span-3">
               <div className="space-y-4">
                  <AnimatePresence mode="popLayout">
                     {activeTab === 'quiz' ? (
                        filteredQuiz.map((attempt, idx) => (
                           <motion.div
                              key={attempt.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.05 }}
                              className="bg-[var(--color-surface-container)]/40 border border-[var(--color-outline-variant)] p-6 rounded-[2rem] flex items-center justify-between group hover:bg-[var(--color-surface-container)]/60 transition-all cursor-pointer"
                           >
                              <div className="flex items-center gap-6">
                                 <div className="w-12 h-12 bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/20 rounded-2xl flex items-center justify-center text-[var(--color-warning)] font-black text-xs">
                                    {Math.round((attempt.score / attempt.total) * 100)}%
                                 </div>
                                 <div>
                                    <h4 className="text-[var(--color-on-surface)] font-bold mb-1 group-hover:text-[var(--color-warning)] transition-colors">{attempt.bank_name}</h4>
                                    <div className="flex items-center gap-4 text-[10px] text-[var(--color-on-surface-variant)] font-bold uppercase tracking-widest">
                                       <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(attempt.attempted_at).toLocaleDateString()}</span>
                                       <span className="flex items-center gap-1"><Zap size={12} /> {attempt.score}/{attempt.total} Points</span>
                                    </div>
                                 </div>
                              </div>
                              <div className="flex gap-2">
                                 <button 
                                   onClick={() => handleGetCertificate(attempt.id)}
                                   title="Download Certificate"
                                   className="p-3 bg-[var(--color-surface-dim)] rounded-xl text-[var(--color-on-surface-variant)] group-hover:text-[var(--color-warning)] group-hover:bg-[var(--color-warning)]/10 transition-all"
                                 >
                                    <FileText size={18} />
                                 </button>
                                 <button 
                                   onClick={() => handleShareCertificate(attempt.id)}
                                   title="Share to LinkedIn" 
                                   className="p-3 bg-[var(--color-surface-dim)] rounded-xl text-[var(--color-on-surface-variant)] group-hover:text-[#0077b5] group-hover:bg-[#0077b5]/10 transition-all"
                                 >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
                                 </button>
                              </div>
                           </motion.div>
                        ))
                     ) : (
                        filteredCoding.map((attempt, idx) => (
                           <motion.div
                              key={attempt.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.05 }}
                              className="bg-[var(--color-surface-container)]/40 border border-[var(--color-outline-variant)] p-6 rounded-[2rem] flex items-center justify-between group hover:bg-[var(--color-surface-container)]/60 transition-all cursor-pointer"
                           >
                              <div className="flex items-center gap-6">
                                 <div className="w-12 h-12 bg-[var(--color-success)]/10 border border-[var(--color-success)]/20 rounded-2xl flex items-center justify-center text-[var(--color-success)] font-black text-xs">
                                    {attempt.score}%
                                 </div>
                                 <div>
                                    <h4 className="text-[var(--color-on-surface)] font-bold mb-1 group-hover:text-[var(--color-success)] transition-colors">
                                       {attempt.question_title || `Coding Lab Solution #${attempt.id}`}
                                    </h4>
                                    <div className="flex items-center gap-4 text-[10px] text-[var(--color-on-surface-variant)] font-bold uppercase tracking-widest">
                                       <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(attempt.attempted_at).toLocaleDateString()}</span>
                                       <span className="flex items-center gap-1"><Code size={12} /> Lab ID: {attempt.question_id}</span>
                                    </div>
                                 </div>
                              </div>
                              <button className="p-3 bg-[var(--color-surface-dim)] rounded-xl text-[var(--color-on-surface-variant)] group-hover:text-[var(--color-success)] group-hover:bg-[var(--color-success)]/10 transition-all">
                                 <FileText size={18} />
                              </button>
                           </motion.div>
                        ))
                     )}
                  </AnimatePresence>
                  
                  {((activeTab === 'quiz' && filteredQuiz.length === 0) || (activeTab === 'coding' && filteredCoding.length === 0)) && (
                     <div className="py-20 text-center bg-[var(--color-surface-container)]/20 rounded-[2rem] border border-dashed border-[var(--color-outline-variant)]">
                        <History size={48} className="mx-auto text-[var(--color-on-surface-variant)] mb-4" />
                        <p className="text-[var(--color-on-surface-variant)] font-bold uppercase tracking-widest text-[10px]">No historical records match your query.</p>
                     </div>
                  )}
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
