import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { XCircle, Trophy, Sparkles, Send, BrainCircuit, Timer } from 'lucide-react';
import ApiService from '../../services/ApiService';
import { useToast } from '../ui/Toast';

export default function DailyChallengeModal({ challenge, onClose, onSuccess }: any) {
  const { toast } = useToast();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const question = challenge.question;

  const handleSubmit = async () => {
    if (!selectedOption) return;
    
    setIsSubmitting(true);
    try {
      const payload = {
        bank_id: question.bank_id,
        is_daily_challenge: true,
        answers: [
          {
            question_id: question.id,
            user_answer: selectedOption
          }
        ]
      };
      
      const res = await ApiService.submitAttempt(payload);
      setResult(res);
      if (onSuccess) onSuccess(res);
    } catch (err: any) {
      toast.error(err.message);
    } finally {

      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-lg bg-white dark:bg-[var(--color-surface-dim)] rounded-3xl shadow-2xl overflow-hidden border border-[var(--color-outline-variant)] dark:border-[var(--color-outline-variant)]"
      >
        {/* Header decoration */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-[var(--color-brand-primary-container)] via-[var(--color-brand-secondary)] to-pink-500 opacity-10 dark:opacity-20" />
        
        <div className="p-8 relative">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[var(--color-brand-primary-container)] dark:bg-[var(--color-brand-primary-container)]/40 rounded-2xl text-[var(--color-brand-primary)] dark:text-[var(--color-brand-primary)]">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-[var(--color-on-surface-variant)] dark:text-[var(--color-on-surface)]">Daily Challenge</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-semibold px-2 py-0.5 bg-[var(--color-surface-container-highest)] dark:bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)] rounded-full">
                    {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    question.difficulty === 'Hard' ? 'bg-[var(--color-danger)] text-[var(--color-danger)]' : 
                    question.difficulty === 'Medium' ? 'bg-[var(--color-warning)] text-[var(--color-warning)]' : 'bg-[var(--color-success)] text-[var(--color-success)]'
                  }`}>
                    {question.difficulty}
                  </span>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-[var(--color-surface-container-highest)] dark:hover:bg-[var(--color-surface-container)] rounded-full transition-colors">
              <XCircle className="w-6 h-6 text-[var(--color-on-surface-variant)]" />
            </button>
          </div>

          <AnimatePresence mode="wait">
            {!result ? (
              <motion.div
                key="question"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="bg-[var(--color-surface-container-highest)] dark:bg-[var(--color-surface-container)]/50 p-6 rounded-2xl mb-6 border border-[var(--color-outline-variant)] dark:border-[var(--color-outline-variant)]">
                   <p className="text-[var(--color-on-surface-variant)] dark:text-[var(--color-on-surface)] leading-relaxed font-medium">
                     {question.question}
                   </p>
                </div>

                <div className="space-y-3">
                  {question.options.map((opt: string, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedOption(opt)}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 group relative overflow-hidden ${
                        selectedOption === opt 
                          ? 'border-[var(--color-brand-primary)] bg-[var(--color-brand-primary-container)]/50 dark:bg-[var(--color-brand-primary-container)]/20' 
                          : 'border-[var(--color-outline-variant)] dark:border-[var(--color-outline-variant)] hover:border-[var(--color-brand-primary)] dark:hover:border-[var(--color-brand-primary)]'
                      }`}
                    >
                      <div className="flex items-center gap-3 relative z-10">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                          selectedOption === opt ? 'bg-[var(--color-brand-primary-container)] text-white' : 'bg-[var(--color-surface-container-highest)] dark:bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)]'
                        }`}>
                          {String.fromCharCode(65 + idx)}
                        </div>
                        <span className={`text-sm ${selectedOption === opt ? 'text-[var(--color-brand-primary)] dark:text-[var(--color-brand-primary)] font-semibold' : 'text-[var(--color-on-surface-variant)] dark:text-[var(--color-on-surface-variant)]'}`}>
                          {opt}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="mt-8">
                  <button
                    onClick={handleSubmit}
                    disabled={!selectedOption || isSubmitting}
                    className="w-full py-4 bg-[var(--color-brand-primary-container)] hover:bg-[var(--color-brand-primary-container)] disabled:bg-[var(--color-surface-container-highest)] dark:disabled:bg-[var(--color-surface-container)] text-white rounded-2xl font-bold shadow-lg shadow-[var(--color-brand-primary)] dark:shadow-none transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? 'Verifying...' : (
                      <>
                        <Send className="w-5 h-5" />
                        Submit Answer
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-6"
              >
                <div className="flex justify-center mb-6">
                  <div className={`p-6 rounded-full ${result.score > 0 ? 'bg-[var(--color-success)] text-[var(--color-success)]' : 'bg-[var(--color-danger)] text-[var(--color-danger)]'}`}>
                    {result.score > 0 ? <Trophy className="w-16 h-16" /> : <BrainCircuit className="w-16 h-16" />}
                  </div>
                </div>
                
                <h3 className="text-2xl font-black text-[var(--color-on-surface-variant)] dark:text-[var(--color-on-surface)] mb-2">
                  {result.score > 0 ? 'Outstanding!' : 'Not quite right'}
                </h3>
                <p className="text-[var(--color-on-surface-variant)] dark:text-[var(--color-on-surface-variant)] mb-8">
                  {result.score > 0 
                    ? "You've mastered today's challenge and earned your daily points." 
                    : "Try again tomorrow! Review the topic in your study banks."}
                </p>

                <div className="bg-[var(--color-surface-container-highest)] dark:bg-[var(--color-surface-container)]/50 rounded-2xl p-4 flex justify-around mb-8 border border-[var(--color-outline-variant)] dark:border-[var(--color-outline-variant)]">
                  <div className="text-center">
                    <p className="text-[10px] uppercase font-bold text-[var(--color-on-surface-variant)] mb-1">Score</p>
                    <p className="text-xl font-black text-[var(--color-on-surface-variant)] dark:text-[var(--color-on-surface)]">{result.score}/1</p>
                  </div>
                  <div className="text-center border-l border-[var(--color-outline-variant)] dark:border-[var(--color-outline-variant)] pl-8">
                    <p className="text-[10px] uppercase font-bold text-[var(--color-on-surface-variant)] mb-1">Time</p>
                    <p className="text-xl font-black text-[var(--color-on-surface-variant)] dark:text-[var(--color-on-surface)]">{result.time_taken || 0}s</p>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="w-full py-4 bg-[var(--color-surface-dim)] dark:bg-white text-[var(--color-on-surface)] dark:text-[var(--color-on-surface-variant)] rounded-2xl font-bold transition-all active:scale-[0.98]"
                >
                  Return to Dashboard
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
