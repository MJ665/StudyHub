import React, { useState, useCallback, useEffect } from 'react';
import { X, Code, AlignLeft, Database, Plus, Loader2, Copy, Check, ChevronLeft, ChevronRight, Upload, AlertCircle, CheckCircle2 } from 'lucide-react';
import ApiService from '../../services/ApiService';
import { useToast } from '../ui/Toast';
import QuestionBuilder from '../quiz/QuestionBuilder';

// Suggestions are now fetched dynamically from the database using ApiService.getTopics()
// Question authoring is handled by the live JSON builder (QuestionBuilder);
// the legacy TEXT/JSON textarea validators were removed.

export default function BankCreationModal({ user, courses: coursesProp, onClose, onCreated }: any) {
  const courses = Array.isArray(coursesProp) ? coursesProp : [];
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [copyLabel, setCopyLabel] = useState<'Copy Prompt' | 'Copied!'>('Copy Prompt');
  const [chapterInput, setChapterInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [topicSuggestions, setTopicSuggestions] = useState<string[]>([]);

  const [difficulties, setDifficulties] = useState<string[]>([]);

  useEffect(() => {
    ApiService.getSystemConfig().then(config => {
      const levels = config.difficulty_levels || [];
      setDifficulties(levels);
      if (levels.length > 0 && !levels.includes(bankDiff)) {
        setBankDiff(levels[1] || levels[0]);
      }
    }).catch(err => console.error("Failed to load config", err));

    ApiService.getTopics()
      .then(res => setTopicSuggestions(res))
      .catch(err => console.error("Failed to load topics", err));
  }, []);

  // Step 1: Bank Metadata (all dynamic, no hardcoded values)
  const [bankCourseId, setBankCourseId] = useState<number | ''>(courses.length > 0 ? courses[0].id : '');
  const [bankName, setBankName] = useState('');
  const [bankDiff, setBankDiff] = useState('Medium');
  const [sprintName, setSprintName] = useState('');
  const [description, setDescription] = useState('');

  // Step 2: Quiz Settings
  const [timePerQuestion, setTimePerQuestion] = useState(30);
  const [showTimer, setShowTimer] = useState(true);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleOptions, setShuffleOptions] = useState(false);
  const [allowDescriptive, setAllowDescriptive] = useState(true);
  const [targetCount, setTargetCount] = useState(10);
  const [isOrgPublic, setIsOrgPublic] = useState(true);

  // Step 3: Questions
  // Canonical questions authored via the live JSON builder (source of truth).
  const [builderQuestions, setBuilderQuestions] = useState<any[]>([]);

  const [quickReferences, setQuickReferences] = useState('');

  const filteredSuggestions = (topicSuggestions || []).filter(c =>
    chapterInput.trim() && c.toLowerCase().includes(chapterInput.toLowerCase()) && c !== chapterInput
  );

  const generatePrompt = useCallback(() => {
    const topic = chapterInput || 'the selected topic';
    return `Generate ${targetCount} strictly separate MCQ questions about ${topic} with a ${bankDiff} difficulty level. Output STRICTLY as a raw JSON object with two keys: "questions" (array of objects) and "quick_references" (array of {title: string, content: string}). 
    
    NO markdown code blocks, NO backticks, and NO explanatory text before or after the JSON.
    
    Each question object must have: "question" (string), "options" (array of exactly 4 strings), "answer" (string), "difficulty" (string), "user_description" (strictly empty string "").
    
    The "quick_references" should contain 5-8 key syntax snippets relevant to ${topic}. If no specific syntax is relevant, keep it as an empty array [].

JSON Format:
{
  "questions": [
    {
      "question": "Example question?",
      "options": ["A", "B", "C", "D"],
      "answer": "A",
      "difficulty": "${bankDiff}",
      "user_description": ""
    }
  ],
  "quick_references": [
    { "title": "cmd", "content": "description" }
  ]
}`;
  }, [chapterInput, bankDiff, targetCount]);

  const handleCopyPrompt = () => {
    const text = generatePrompt();
    try {
      navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
    }
    setCopyLabel('Copied!');
    setTimeout(() => setCopyLabel('Copy Prompt'), 2500);
  };

  const handleSubmit = async () => {
    if (!bankCourseId || !bankName) {
      if (toast) toast.error('Bank Name and Course are required.');
      return;
    }

    setLoading(true);
    try {
      let parsedQuestions: any[] = [];
      let finalQuickRefs: any[] = [];

      // Parse Quick Refs if provided (expecting format Key: Value)
      if (quickReferences.trim()) {
        finalQuickRefs = quickReferences.split('\n').filter(l => l.includes(':')).map(l => {
          const [title, content] = l.split(':');
          return { title: title.trim(), content: content.trim() };
        });
      }

      // Canonical questions come from the live JSON builder (form ⟷ JSON).
      parsedQuestions = (builderQuestions || [])
        .filter((item: any) => item && (item.question || '').trim())
        .map((item: any) => ({
          question: item.question,
          question_type: item.question_type || 'mcq_single',
          content_format: item.content_format || 'text',
          options: Array.isArray(item.options) ? item.options.filter((o: string) => o !== undefined) : [],
          answer: item.answer || item.options?.[0] || '',
          correct_options: Array.isArray(item.correct_options) ? item.correct_options : undefined,
          model_answer: item.model_answer || undefined,
          rubric: item.rubric || undefined,
          media_urls: Array.isArray(item.media_urls) && item.media_urls.length ? item.media_urls : undefined,
          points: item.points || 1,
          difficulty: item.difficulty || bankDiff,
          user_description: item.user_description || '',
          explanation: item.explanation || undefined,
          has_code: !!item.has_code || (item.content_format === 'code') || String(item.question || '').includes('```'),
          code_language: item.code_language || null,
        }));

      if (parsedQuestions.length === 0) throw new Error('Add at least one question with a stem before creating the bank.');

      await ApiService.createQuestionBank({
        name: bankName,
        course_id: Number(bankCourseId),
        created_by: user.id,
        difficulty: bankDiff,
        sprint_name: sprintName || null,
        chapter: chapterInput || null,
        description: description || null,
        time_per_question: timePerQuestion,
        show_timer: showTimer,
        shuffle: shuffleQuestions,
        shuffle_options: shuffleOptions,
        allow_descriptive: allowDescriptive,
        is_org_public: isOrgPublic,
        max_questions: parsedQuestions.length,
        quick_references: finalQuickRefs.length > 0 ? finalQuickRefs : (quickReferences ? finalQuickRefs : null),
        questions: parsedQuestions
      });

      if (toast) toast.success(`✓ Bank created with ${parsedQuestions.length} questions!`);
      onCreated();
    } catch (e: any) {
      if (toast) toast.error(e.message || 'Failed to create bank');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 w-full max-w-2xl shadow-2xl relative my-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <Database className="text-indigo-400" size={22} />
            <div>
              <h3 className="text-xl font-bold text-white">Create Question Bank</h3>
              <p className="text-xs text-slate-500">Step {step} of 3 — {['Bank Details', 'Quiz Settings', 'Add Questions'][step - 1]}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-1.5">
              {[1, 2, 3].map(s => (
                <div key={s} className={`h-1.5 rounded-full transition-all duration-300 ${s === step ? 'w-6 bg-indigo-500' : s < step ? 'w-4 bg-emerald-500' : 'w-4 bg-slate-700'}`} />
              ))}
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X size={22} /></button>
          </div>
        </div>

        {courses.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-rose-400 font-bold mb-2">No Courses Available</p>
            <p className="text-slate-400 text-sm">Ask your Admin to create a course first.</p>
          </div>
        ) : (
          <>
            {/* ── STEP 1: Bank Metadata ── */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 font-bold uppercase mb-1">Course *</label>
                    <select value={bankCourseId} onChange={e => setBankCourseId(Number(e.target.value))} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-indigo-500">
                      {courses.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 font-bold uppercase mb-1">Bank Name *</label>
                    <input value={bankName} onChange={e => setBankName(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-indigo-500" placeholder="e.g. Kubernetes Deep Dive" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 font-bold uppercase mb-1">Sprint / Week Name</label>
                    <input value={sprintName} onChange={e => setSprintName(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-indigo-500" placeholder="e.g. Week 3" />
                  </div>
                  <div className="relative">
                    <label className="block text-xs text-slate-400 font-bold uppercase mb-1">Chapter / Topic</label>
                    <input
                      value={chapterInput}
                      onChange={e => { setChapterInput(e.target.value); setShowSuggestions(true); }}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-indigo-500"
                      placeholder="Type any topic (e.g. Docker, Python...)"
                    />
                    {showSuggestions && filteredSuggestions.length > 0 && (
                      <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-xl max-h-40 overflow-y-auto">
                        {filteredSuggestions.map(s => (
                          <button key={s} type="button" onMouseDown={() => { setChapterInput(s); setShowSuggestions(false); }} className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700 first:rounded-t-xl last:rounded-b-xl">
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 font-bold uppercase mb-1">Difficulty</label>
                    <select value={bankDiff} onChange={e => setBankDiff(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-indigo-500">
                      {difficulties.map(d => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs text-slate-400 font-bold uppercase mb-1">Description (Optional)</label>
                    <input value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-indigo-500" placeholder="Brief description..." />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs text-slate-400 font-bold uppercase mb-1">Quick References (Optional)</label>
                    <textarea value={quickReferences} onChange={e => setQuickReferences(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-indigo-500 h-24 text-sm" placeholder="Title: Content (one per line)&#10;declare -r: Read-only variable&#10;declare -i: Integer attribute" />
                  </div>
                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl">
                      <div className="flex gap-3 items-center">
                        <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                           <CheckCircle2 size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-white">Global Enterprise Visibility</p>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight italic">Content will be accessible to all groups & verticals</p>
                        </div>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={isOrgPublic} 
                        onChange={e => setIsOrgPublic(e.target.checked)} 
                        className="w-5 h-5 accent-indigo-500 cursor-pointer" 
                      />
                    </div>
                  </div>
                </div>
                <button onClick={() => { if (!bankName || !bankCourseId) { if (toast) toast.error('Bank Name and Course are required.'); return; } setStep(2); }} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20">
                  Next: Quiz Settings <ChevronRight size={18} />
                </button>
              </div>
            )}

            {/* ── STEP 2: Quiz Settings ── */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 font-bold uppercase mb-1">Time per Question (sec)</label>
                    <input type="number" value={timePerQuestion} onChange={e => setTimePerQuestion(Math.max(5, parseInt(e.target.value) || 30))} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-indigo-500" min={5} />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 font-bold uppercase mb-1">Target Question Count</label>
                    <input type="number" value={targetCount} onChange={e => setTargetCount(Math.max(1, parseInt(e.target.value) || 10))} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-indigo-500" min={1} />
                    <p className="text-xs text-slate-600 mt-1">Used in the AI prompt in Step 3</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    { label: 'Show Timer', sub: 'Display countdown for each question', val: showTimer, set: setShowTimer },
                    { label: 'Shuffle Questions', sub: 'Randomize order each attempt', val: shuffleQuestions, set: setShuffleQuestions },
                    { label: 'Shuffle Answer Options', sub: 'Randomize option order each attempt', val: shuffleOptions, set: setShuffleOptions },
                    { label: 'Allow Descriptive Notes', sub: 'Students write reasoning notes during quiz', val: allowDescriptive, set: setAllowDescriptive },
                  ].map(({ label, sub, val, set }) => (
                    <div key={label} className="flex items-center justify-between p-4 bg-slate-800/60 rounded-xl border border-slate-700">
                      <div><p className="font-bold text-white text-sm">{label}</p><p className="text-xs text-slate-500 mt-0.5">{sub}</p></div>
                      <input type="checkbox" checked={val} onChange={e => set(e.target.checked)} className="w-5 h-5 accent-indigo-500 cursor-pointer" />
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setStep(1)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"><ChevronLeft size={18} /> Back</button>
                  <button onClick={() => setStep(3)} className="flex-[2] bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20">Next: Add Questions <ChevronRight size={18} /></button>
                </div>
              </div>
            )}

            {/* ── STEP 3: Questions ── */}
            {step === 3 && (
              <div className="space-y-4">

                {/* AI Prompt Copy Box */}
                <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-bold text-slate-300 flex items-center gap-2"><Upload size={14} className="text-indigo-400" /> AI Prompt Generator</p>
                    <button type="button" onClick={handleCopyPrompt} className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-bold transition-all ${copyLabel === 'Copied!' ? 'bg-emerald-600 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}>
                      {copyLabel === 'Copied!' ? <Check size={12} /> : <Copy size={12} />}{copyLabel}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Generates prompt for <span className="text-indigo-400 font-semibold">{targetCount} {bankDiff}</span> questions{chapterInput ? <> about <span className="text-indigo-400 font-semibold">{chapterInput}</span></> : ''}. Paste the AI output below.
                  </p>
                </div>

                {/* Live JSON builder — the single canonical authoring surface.
                    Paste AI output into the JSON pane, or build via the form. */}
                <QuestionBuilder questions={builderQuestions} onChange={setBuilderQuestions} />
                <p className="text-[11px] text-slate-500">{builderQuestions.filter((q: any) => (q?.question || '').trim()).length} question(s) ready.</p>

                <div className="flex gap-3 pt-1">
                  <button onClick={() => setStep(2)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"><ChevronLeft size={18} /> Back</button>
                  <button disabled={loading} onClick={handleSubmit} className="flex-[2] py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 disabled:opacity-50">
                    {loading ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
                    {loading ? 'Creating...' : 'Create Question Bank'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
