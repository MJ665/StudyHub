import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, BookOpen, Settings2, Loader2, CheckCircle2, AlertCircle, Plus, ChevronDown } from 'lucide-react';
import ApiService from '../../services/ApiService';
import { useToast } from '../ui/Toast';

interface GeneratedQuestion {
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  difficulty: string;
}

interface AIQuizGeneratorProps {
  onClose: () => void;
  onImport: (questions: GeneratedQuestion[], topic: string) => void;
  groupId?: number;
  courseId?: number;
}

export default function AIQuizGenerator({ onClose, onImport, groupId, courseId }: AIQuizGeneratorProps) {
  const { toast } = useToast();
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('Medium');
  const [numQuestions, setNumQuestions] = useState(5);
  const [language, setLanguage] = useState('English');
  const [questionType, setQuestionType] = useState('mcq_single');
  const [loading, setLoading] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editData, setEditData] = useState<GeneratedQuestion | null>(null);
  const [questions, setQuestions] = useState<GeneratedQuestion[] | null>(null);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<number>>(new Set());

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast('error', 'Please enter a topic first');
      return;
    }
    setLoading(true);
    setQuestions(null);
    setEditIndex(null);
    try {
      const res = await ApiService.generateSmartQuiz(topic.trim(), difficulty, numQuestions, language, questionType);
      const generatedQuestions = res.data?.questions || [];
      setQuestions(generatedQuestions);
      // Auto-select all
      setSelectedQuestions(new Set(generatedQuestions.map((_: any, i: number) => i)));
      toast('success', `Generated ${res.data?.generated_count || generatedQuestions.length} questions!`);
    } catch (err: any) {
      toast('error', `Generation failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    setEditIndex(index);
    setEditData({ ...questions![index] });
  };

  const saveEdit = () => {
    if (!questions || editIndex === null || !editData) return;
    const next = [...questions];
    next[editIndex] = editData;
    setQuestions(next);
    setEditIndex(null);
    setEditData(null);
    toast('success', 'Question updated');
  };

  const toggleQuestion = (index: number) => {
    if (editIndex !== null) return; // Disable selection while editing
    const next = new Set(selectedQuestions);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setSelectedQuestions(next);
  };

  const handleImport = () => {
    if (!questions) return;
    const selected = questions.filter((_, i) => selectedQuestions.has(i));
    if (selected.length === 0) {
      toast('error', 'Select at least one question to import');
      return;
    }
    onImport(selected, topic);
    onClose();
  };

  const difficultyConfig = {
    Easy: 'bg-[var(--color-success)]/10 text-[var(--color-success)] border-[var(--color-success)]/20',
    Medium: 'bg-[var(--color-warning)]/10 text-[var(--color-warning)] border-[var(--color-warning)]/20',
    Hard: 'bg-[var(--color-danger)]/10 text-[var(--color-danger)] border-[var(--color-danger)]/20'
  };

  return (
    <div className="fixed inset-0 bg-[var(--color-surface-dim)]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--color-outline-variant)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--color-brand-primary-container)]/20 rounded-2xl flex items-center justify-center">
              <Sparkles size={20} className="text-[var(--color-brand-primary)]" />
            </div>
            <div>
              <h2 className="text-[var(--color-on-surface)] font-bold text-lg">AI Quiz Generator</h2>
              <p className="text-[var(--color-on-surface-variant)] text-xs">Generate questions on any topic with Gemini AI</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] transition-colors p-1">
            <X size={22} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Topic Input */}
          <div>
            <label className="block text-xs font-bold text-[var(--color-on-surface-variant)] uppercase tracking-widest mb-2">
              Topic *
            </label>
            <input
              type="text"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleGenerate()}
              placeholder="e.g. Python List Comprehensions, REST API Design..."
              className="w-full bg-[var(--color-surface-container-high)]/80 border border-[var(--color-outline-variant)] rounded-2xl px-4 py-3 text-[var(--color-on-surface)] placeholder-[var(--color-on-surface-variant)] focus:outline-none focus:border-[var(--color-brand-primary)] transition-colors text-sm"
            />
          </div>

          {/* Config Row */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-[var(--color-on-surface-variant)] uppercase tracking-widest mb-2">Difficulty</label>
              <div className="flex gap-1">
                {['Easy', 'Medium', 'Hard'].map(d => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`flex-1 py-2 rounded-xl text-[11px] font-bold border transition-all ${
                      difficulty === d
                        ? difficultyConfig[d as keyof typeof difficultyConfig]
                        : 'bg-[var(--color-surface-container-high)] border-[var(--color-outline-variant)] text-[var(--color-on-surface-variant)] hover:border-[var(--color-outline-variant)]'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--color-on-surface-variant)] uppercase tracking-widest mb-2">Questions</label>
              <input
                type="number"
                value={numQuestions}
                onChange={e => setNumQuestions(Math.max(1, Math.min(15, parseInt(e.target.value) || 5)))}
                min={1}
                max={15}
                className="w-full bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)] rounded-xl px-3 py-2.5 text-[var(--color-on-surface)] text-sm focus:outline-none focus:border-[var(--color-brand-primary)] text-center font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--color-on-surface-variant)] uppercase tracking-widest mb-2">Language</label>
              <select
                value={language}
                onChange={e => setLanguage(e.target.value)}
                className="w-full bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)] rounded-xl px-3 py-2.5 text-[var(--color-on-surface)] text-sm focus:outline-none focus:border-[var(--color-brand-primary)]"
              >
                {['English', 'Hindi', 'Spanish', 'French', 'German'].map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--color-on-surface-variant)] uppercase tracking-widest mb-2">Type</label>
              <select
                value={questionType}
                onChange={e => setQuestionType(e.target.value)}
                className="w-full bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)] rounded-xl px-3 py-2.5 text-[var(--color-on-surface)] text-sm focus:outline-none focus:border-[var(--color-brand-primary)]"
              >
                <option value="mcq_single">Multiple choice</option>
                <option value="true_false">True / False</option>
                <option value="short_answer">Short answer (brief)</option>
                <option value="essay">Essay</option>
              </select>
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={loading || !topic.trim()}
            className="w-full py-3.5 bg-[var(--color-brand-primary-container)] hover:bg-[var(--color-brand-primary-container)] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-[var(--color-brand-primary)]/20"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Generating with Gemini AI...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                Generate Questions
              </>
            )}
          </button>

          {/* Generated Questions */}
          <AnimatePresence>
            {questions && questions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-[var(--color-on-surface)]">{questions.length} questions generated</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedQuestions(new Set(questions.map((_, i) => i)))}
                      className="text-xs text-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)] font-bold"
                    >
                      Select All
                    </button>
                    <span className="text-[var(--color-on-surface-variant)]">·</span>
                    <button
                      onClick={() => setSelectedQuestions(new Set())}
                      className="text-xs text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface-variant)] font-bold"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                {questions.map((q, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => toggleQuestion(i)}
                    className={`p-4 rounded-2xl border transition-all ${
                      editIndex === i 
                        ? 'bg-[var(--color-surface-container-high)] border-[var(--color-brand-primary)] ring-2 ring-[var(--color-brand-primary)]/20' 
                        : selectedQuestions.has(i)
                        ? 'bg-[var(--color-brand-primary-container)]/40 border-[var(--color-brand-primary)]/30 hover:border-[var(--color-brand-primary)]/50'
                        : 'bg-[var(--color-surface-container-high)]/30 border-[var(--color-outline-variant)]/50 opacity-60 hover:opacity-100'
                    }`}
                  >
                    {editIndex === i ? (
                      <div className="space-y-3" onClick={e => e.stopPropagation()}>
                        <textarea
                          value={editData?.question}
                          onChange={e => setEditData({ ...editData!, question: e.target.value })}
                          className="w-full bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] rounded-xl px-3 py-2 text-[var(--color-on-surface)] text-sm focus:border-[var(--color-brand-primary)] focus:outline-none h-20"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          {editData?.options.map((opt, oi) => (
                            <div key={oi} className="flex items-center gap-2">
                              <input
                                type="text"
                                value={opt}
                                onChange={e => {
                                  const next = [...editData!.options];
                                  next[oi] = e.target.value;
                                  setEditData({ ...editData!, options: next });
                                }}
                                className="flex-1 bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] rounded-lg px-2 py-1.5 text-xs text-[var(--color-on-surface)] focus:border-[var(--color-brand-primary)] focus:outline-none"
                              />
                              <input
                                type="radio"
                                checked={editData?.correct_answer === opt}
                                onChange={() => setEditData({ ...editData!, correct_answer: opt })}
                                className="text-[var(--color-brand-primary)]"
                              />
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2 justify-end pt-2">
                          <button onClick={() => setEditIndex(null)} className="text-xs font-bold text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] px-3 py-1.5">Cancel</button>
                          <button onClick={saveEdit} className="bg-[var(--color-brand-primary-container)] text-white text-xs font-bold px-4 py-1.5 rounded-lg hover:bg-[var(--color-brand-primary-container)]">Save Changes</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-3">
                        <div className={`w-5 h-5 rounded-lg border-2 shrink-0 mt-0.5 flex items-center justify-center transition-all ${
                          selectedQuestions.has(i)
                            ? 'bg-[var(--color-brand-primary-container)] border-[var(--color-brand-primary)]'
                            : 'border-[var(--color-outline-variant)]'
                        }`}>
                          {selectedQuestions.has(i) && <CheckCircle2 size={12} className="text-[var(--color-on-surface)]" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="text-sm text-[var(--color-on-surface)] font-medium leading-snug">
                              <span className="text-[var(--color-on-surface-variant)] mr-1">{i + 1}.</span> {q.question}
                            </p>
                            <button 
                              onClick={(e) => startEdit(e, i)}
                              className="text-[10px] font-bold text-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)] uppercase tracking-tighter shrink-0 bg-[var(--color-brand-primary-container)]/10 px-2 py-0.5 rounded border border-[var(--color-brand-primary)]/20"
                            >
                              Edit
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-2">
                            {q.options.map((opt, oi) => (
                              <span
                                key={oi}
                                className={`text-xs px-2 py-1 rounded-lg ${
                                  opt === q.correct_answer
                                    ? 'text-[var(--color-success)] font-medium'
                                    : 'text-[var(--color-on-surface-variant)]'
                                }`}
                              >
                                {String.fromCharCode(65 + oi)}. {opt}
                              </span>
                            ))}
                          </div>
                          {q.explanation && (
                            <p className="text-xs text-[var(--color-on-surface-variant)] italic line-clamp-1">{q.explanation}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        {questions && questions.length > 0 && (
          <div className="p-4 border-t border-[var(--color-outline-variant)] shrink-0 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-[var(--color-surface-container-high)] hover:bg-[var(--color-surface-bright)] text-[var(--color-on-surface)] rounded-2xl font-bold transition-all border border-[var(--color-outline-variant)]"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={selectedQuestions.size === 0}
              className="flex-1 py-3 bg-[var(--color-brand-primary-container)] hover:bg-[var(--color-brand-primary-container)] disabled:opacity-50 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-[var(--color-brand-primary)]/20"
            >
              <Plus size={18} />
              Import {selectedQuestions.size} Question{selectedQuestions.size !== 1 ? 's' : ''}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
