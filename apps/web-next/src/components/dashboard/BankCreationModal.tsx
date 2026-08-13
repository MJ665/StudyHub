import React, { useState, useCallback, useEffect } from 'react';
import { X, Code, AlignLeft, Database, Plus, Loader2, Copy, Check, ChevronLeft, ChevronRight, Upload, AlertCircle, CheckCircle2, Eye, ChevronDown } from 'lucide-react';
import ApiService from '../../services/ApiService';
import { useToast } from '../ui/Toast';
import QuestionBuilder from '../quiz/QuestionBuilder';
import RichContent from '../common/RichContent';

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
  const [showPreview, setShowPreview] = useState(false);

  const filteredSuggestions = (topicSuggestions || []).filter(c =>
    chapterInput.trim() && c.toLowerCase().includes(chapterInput.toLowerCase()) && c !== chapterInput
  );

  const generatePrompt = useCallback(() => {
    const topic = chapterInput || 'the selected topic';
    return `Generate ${targetCount} strictly separate questions about ${topic} with ${bankDiff} difficulty. Mix diverse question types: mcq_single, mcq_multiple, true_false, short_answer, essay, coding, and config where applicable. Output STRICTLY as a raw JSON object with two keys: "questions" (array of objects) and "quick_references" (array of {title: string, content: string}).

NO markdown code blocks, NO backticks, NO explanatory text before or after the JSON.

Each question object MUST have:
- question (string): The question stem
- question_type (string): One of: mcq_single | mcq_multiple | true_false | short_answer | essay | coding | config
- content_format (string): One of: text | markdown | latex | code
- options (array of strings): REQUIRED for mcq_single/mcq_multiple (4+ options), true_false gets ["True", "False"]. Empty for others.
- answer (string): The correct answer (for mcq_single/true_false). For mcq_multiple, return a single string and use correct_options array instead.
- correct_options (array of integers, optional): For mcq_multiple, indices of correct options (e.g., [0, 2])
- points (integer, optional): Default 1
- difficulty (string): Use "${bankDiff}"
- media_urls (array of strings, optional): URLs to images/code examples if relevant
- explanation (string, optional): Explanation of the correct answer
- model_answer (string, optional): For essay/short_answer, a model response
- user_description (string): ALWAYS empty string ""

JSON Format Example:
{
  "questions": [
    {
      "question": "What is an async function in JavaScript?",
      "question_type": "mcq_single",
      "content_format": "text",
      "options": ["A function declared with async keyword", "A function with callbacks", "A promise constructor", "A middleware pattern"],
      "answer": "A function declared with async keyword",
      "points": 1,
      "difficulty": "${bankDiff}",
      "media_urls": [],
      "user_description": ""
    },
    {
      "question": "Select ALL correct statements about promises:",
      "question_type": "mcq_multiple",
      "content_format": "text",
      "options": ["Promises are immutable", "Promises can be rejected", "Promises can settle multiple times", "Promises chain via .then()"],
      "answer": "",
      "correct_options": [0, 1, 3],
      "points": 2,
      "difficulty": "${bankDiff}",
      "user_description": ""
    },
    {
      "question": "async/await was introduced in ES2017.",
      "question_type": "true_false",
      "content_format": "text",
      "options": ["True", "False"],
      "answer": "True",
      "points": 1,
      "difficulty": "${bankDiff}",
      "user_description": ""
    },
    {
      "question": "Write a function that delays execution by N milliseconds.",
      "question_type": "short_answer",
      "content_format": "text",
      "options": [],
      "answer": "",
      "points": 2,
      "difficulty": "${bankDiff}",
      "model_answer": "const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));",
      "user_description": ""
    },
    {
      "question": "Explain when you would use Promise.race() over Promise.all().",
      "question_type": "essay",
      "content_format": "text",
      "options": [],
      "answer": "",
      "points": 3,
      "difficulty": "${bankDiff}",
      "model_answer": "Use Promise.race() when you need the first settled promise (e.g., timeout scenarios). Use Promise.all() when all promises must resolve.",
      "user_description": ""
    },
    {
      "question": "Write a fetch wrapper with timeout.",
      "question_type": "coding",
      "content_format": "code",
      "options": [],
      "answer": "",
      "points": 4,
      "difficulty": "${bankDiff}",
      "model_answer": "async function fetchWithTimeout(url, timeout = 5000) {\\n  const controller = new AbortController();\\n  const id = setTimeout(() => controller.abort(), timeout);\\n  try {\\n    return await fetch(url, { signal: controller.signal });\\n  } finally {\\n    clearTimeout(id);\\n  }\\n}",
      "user_description": ""
    }
  ],
  "quick_references": [
    { "title": "async syntax", "content": "async function name() { await promise; }" },
    { "title": "Promise states", "content": "pending → fulfilled/rejected (immutable)" }
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
    <div className="fixed inset-0 bg-[var(--color-surface-dim)]/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 overflow-y-auto">
      <div className="bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] rounded-3xl p-6 md:p-8 w-full max-w-2xl shadow-2xl relative my-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <Database className="text-[var(--color-brand-primary)]" size={22} />
            <div>
              <h3 className="text-xl font-bold text-[var(--color-on-surface)]">Create Question Bank</h3>
              <p className="text-xs text-[var(--color-on-surface-variant)]">Step {step} of 3 — {['Bank Details', 'Quiz Settings', 'Add Questions'][step - 1]}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-1.5">
              {[1, 2, 3].map(s => (
                <div key={s} className={`h-1.5 rounded-full transition-all duration-300 ${s === step ? 'w-6 bg-[var(--color-brand-primary-container)]' : s < step ? 'w-4 bg-[var(--color-success)]' : 'w-4 bg-[var(--color-surface-bright)]'}`} />
              ))}
            </div>
            <button onClick={onClose} className="text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] transition-colors"><X size={22} /></button>
          </div>
        </div>

        {courses.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-[var(--color-danger)] font-bold mb-2">No Courses Available</p>
            <p className="text-[var(--color-on-surface-variant)] text-sm">Ask your Admin to create a course first.</p>
          </div>
        ) : (
          <>
            {/* ── STEP 1: Bank Metadata ── */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-[var(--color-on-surface-variant)] font-bold uppercase mb-1">Course *</label>
                    <select value={bankCourseId} onChange={e => setBankCourseId(Number(e.target.value))} className="w-full bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)] rounded-xl p-3 text-[var(--color-on-surface)] focus:ring-2 focus:ring-[var(--color-brand-primary)]">
                      {courses.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--color-on-surface-variant)] font-bold uppercase mb-1">Bank Name *</label>
                    <input value={bankName} onChange={e => setBankName(e.target.value)} className="w-full bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)] rounded-xl p-3 text-[var(--color-on-surface)] focus:ring-2 focus:ring-[var(--color-brand-primary)]" placeholder="e.g. Kubernetes Deep Dive" />
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--color-on-surface-variant)] font-bold uppercase mb-1">Sprint / Week Name</label>
                    <input value={sprintName} onChange={e => setSprintName(e.target.value)} className="w-full bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)] rounded-xl p-3 text-[var(--color-on-surface)] focus:ring-2 focus:ring-[var(--color-brand-primary)]" placeholder="e.g. Week 3" />
                  </div>
                  <div className="relative">
                    <label className="block text-xs text-[var(--color-on-surface-variant)] font-bold uppercase mb-1">Chapter / Topic</label>
                    <input
                      value={chapterInput}
                      onChange={e => { setChapterInput(e.target.value); setShowSuggestions(true); }}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                      className="w-full bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)] rounded-xl p-3 text-[var(--color-on-surface)] focus:ring-2 focus:ring-[var(--color-brand-primary)]"
                      placeholder="Type any topic (e.g. Docker, Python...)"
                    />
                    {showSuggestions && filteredSuggestions.length > 0 && (
                      <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)] rounded-xl shadow-xl max-h-40 overflow-y-auto">
                        {filteredSuggestions.map(s => (
                          <button key={s} type="button" onMouseDown={() => { setChapterInput(s); setShowSuggestions(false); }} className="w-full text-left px-4 py-2.5 text-sm text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-bright)] first:rounded-t-xl last:rounded-b-xl">
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--color-on-surface-variant)] font-bold uppercase mb-1">Difficulty</label>
                    <select value={bankDiff} onChange={e => setBankDiff(e.target.value)} className="w-full bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)] rounded-xl p-3 text-[var(--color-on-surface)] focus:ring-2 focus:ring-[var(--color-brand-primary)]">
                      {difficulties.map(d => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs text-[var(--color-on-surface-variant)] font-bold uppercase mb-1">Description (Optional)</label>
                    <input value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)] rounded-xl p-3 text-[var(--color-on-surface)] focus:ring-2 focus:ring-[var(--color-brand-primary)]" placeholder="Brief description..." />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs text-[var(--color-on-surface-variant)] font-bold uppercase mb-1">Quick References (Optional)</label>
                    <textarea value={quickReferences} onChange={e => setQuickReferences(e.target.value)} className="w-full bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)] rounded-xl p-3 text-[var(--color-on-surface)] focus:ring-2 focus:ring-[var(--color-brand-primary)] h-24 text-sm" placeholder="Title: Content (one per line)&#10;declare -r: Read-only variable&#10;declare -i: Integer attribute" />
                  </div>
                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between p-4 bg-[var(--color-brand-primary-container)]/5 border border-[var(--color-brand-primary)]/20 rounded-2xl">
                      <div className="flex gap-3 items-center">
                        <div className="p-2 bg-[var(--color-brand-primary-container)]/20 rounded-lg text-[var(--color-brand-primary)]">
                           <CheckCircle2 size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-[var(--color-on-surface)]">Global Enterprise Visibility</p>
                          <p className="text-[10px] text-[var(--color-on-surface-variant)] font-bold uppercase tracking-tight italic">Content will be accessible to all groups & verticals</p>
                        </div>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={isOrgPublic} 
                        onChange={e => setIsOrgPublic(e.target.checked)} 
                        className="w-5 h-5 accent-[var(--color-brand-primary)] cursor-pointer" 
                      />
                    </div>
                  </div>
                </div>
                <button onClick={() => { if (!bankName || !bankCourseId) { if (toast) toast.error('Bank Name and Course are required.'); return; } setStep(2); }} className="w-full bg-[var(--color-brand-primary-container)] hover:bg-[var(--color-brand-primary-container)] text-white py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-[var(--color-brand-primary)]/20">
                  Next: Quiz Settings <ChevronRight size={18} />
                </button>
              </div>
            )}

            {/* ── STEP 2: Quiz Settings ── */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-[var(--color-on-surface-variant)] font-bold uppercase mb-1">Time per Question (sec)</label>
                    <input type="number" value={timePerQuestion} onChange={e => setTimePerQuestion(Math.max(5, parseInt(e.target.value) || 30))} className="w-full bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)] rounded-xl p-3 text-[var(--color-on-surface)] focus:ring-2 focus:ring-[var(--color-brand-primary)]" min={5} />
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--color-on-surface-variant)] font-bold uppercase mb-1">Target Question Count</label>
                    <input type="number" value={targetCount} onChange={e => setTargetCount(Math.max(1, parseInt(e.target.value) || 10))} className="w-full bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)] rounded-xl p-3 text-[var(--color-on-surface)] focus:ring-2 focus:ring-[var(--color-brand-primary)]" min={1} />
                    <p className="text-xs text-[var(--color-on-surface-variant)] mt-1">Used in the AI prompt in Step 3</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    { label: 'Show Timer', sub: 'Display countdown for each question', val: showTimer, set: setShowTimer },
                    { label: 'Shuffle Questions', sub: 'Randomize order each attempt', val: shuffleQuestions, set: setShuffleQuestions },
                    { label: 'Shuffle Answer Options', sub: 'Randomize option order each attempt', val: shuffleOptions, set: setShuffleOptions },
                    { label: 'Allow Descriptive Notes', sub: 'Students write reasoning notes during quiz', val: allowDescriptive, set: setAllowDescriptive },
                  ].map(({ label, sub, val, set }) => (
                    <div key={label} className="flex items-center justify-between p-4 bg-[var(--color-surface-container-high)]/60 rounded-xl border border-[var(--color-outline-variant)]">
                      <div><p className="font-bold text-[var(--color-on-surface)] text-sm">{label}</p><p className="text-xs text-[var(--color-on-surface-variant)] mt-0.5">{sub}</p></div>
                      <input type="checkbox" checked={val} onChange={e => set(e.target.checked)} className="w-5 h-5 accent-[var(--color-brand-primary)] cursor-pointer" />
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setStep(1)} className="flex-1 bg-[var(--color-surface-container-high)] hover:bg-[var(--color-surface-bright)] text-[var(--color-on-surface)] py-3 rounded-xl font-bold flex items-center justify-center gap-2"><ChevronLeft size={18} /> Back</button>
                  <button onClick={() => setStep(3)} className="flex-[2] bg-[var(--color-brand-primary-container)] hover:bg-[var(--color-brand-primary-container)] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-[var(--color-brand-primary)]/20">Next: Add Questions <ChevronRight size={18} /></button>
                </div>
              </div>
            )}

            {/* ── STEP 3: Questions ── */}
            {step === 3 && (
              <div className="space-y-4">

                {/* AI Prompt Copy Box */}
                <div className="bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)] rounded-2xl p-4">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-bold text-[var(--color-on-surface-variant)] flex items-center gap-2"><Upload size={14} className="text-[var(--color-brand-primary)]" /> AI Prompt Generator</p>
                    <button type="button" onClick={handleCopyPrompt} className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-bold transition-all ${copyLabel === 'Copied!' ? 'bg-[var(--color-success)] text-[var(--color-surface-dim)]' : 'bg-[var(--color-brand-primary-container)] hover:bg-[var(--color-brand-primary-container)] text-white'}`}>
                      {copyLabel === 'Copied!' ? <Check size={12} /> : <Copy size={12} />}{copyLabel}
                    </button>
                  </div>
                  <p className="text-xs text-[var(--color-on-surface-variant)] leading-relaxed">
                    Generates prompt for <span className="text-[var(--color-brand-primary)] font-semibold">{targetCount} {bankDiff}</span> questions{chapterInput ? <> about <span className="text-[var(--color-brand-primary)] font-semibold">{chapterInput}</span></> : ''}. Paste the AI output below.
                  </p>
                </div>

                {/* Live JSON builder — the single canonical authoring surface.
                    Paste AI output into the JSON pane, or build via the form. */}
                <QuestionBuilder questions={builderQuestions} onChange={setBuilderQuestions} />
                <p className="text-[11px] text-[var(--color-on-surface-variant)]">{builderQuestions.filter((q: any) => (q?.question || '').trim()).length} question(s) ready.</p>

                {/* Preview all questions panel */}
                {builderQuestions.filter((q: any) => (q?.question || '').trim()).length > 0 && (
                  <div className="mt-4 bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)] rounded-2xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowPreview(!showPreview)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--color-surface-bright)] transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Eye size={16} className="text-[var(--color-brand-primary)]" />
                        <span className="text-sm font-bold text-[var(--color-on-surface)]">Preview All Questions</span>
                        <span className="text-xs text-[var(--color-on-surface-variant)] ml-2">
                          ({builderQuestions.filter((q: any) => (q?.question || '').trim()).length})
                        </span>
                      </div>
                      <ChevronDown size={18} className={`transition-transform ${showPreview ? 'rotate-180' : ''}`} />
                    </button>

                    {showPreview && (
                      <div className="border-t border-[var(--color-outline-variant)] p-4 space-y-4 max-h-[400px] overflow-y-auto">
                        {builderQuestions.map((q: any, idx: number) => {
                          if (!(q?.question || '').trim()) return null;
                          const fmt = q.content_format || 'text';
                          const TYPE_LABEL: Record<string, string> = {
                            mcq_single: 'Single choice',
                            mcq_multiple: 'Multiple choice',
                            mcq_multi: 'Multiple choice',
                            true_false: 'True/False',
                            short_answer: 'Short answer',
                            essay: 'Essay',
                            coding: 'Coding',
                            config: 'Configuration',
                          };
                          return (
                            <div key={idx} className="pb-4 border-b border-[var(--color-outline-variant)] last:border-b-0">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-bold text-[var(--color-on-surface-variant)]">Q{idx + 1}</span>
                                <span className="text-[10px] bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)] px-2 py-0.5 rounded font-bold">
                                  {TYPE_LABEL[q.question_type] || q.question_type}
                                </span>
                                {q.points && <span className="text-[10px] text-[var(--color-on-surface-variant)]">{q.points}pt</span>}
                              </div>
                              <div className="text-sm text-[var(--color-on-surface)] mb-2 leading-relaxed">
                                <RichContent content={q.question} format={fmt} mediaUrls={q.media_urls} />
                              </div>
                              {['mcq_single', 'mcq_multiple', 'mcq_multi', 'true_false'].includes(q.question_type) && q.options && (
                                <div className="space-y-1.5 ml-2">
                                  {q.options.map((opt: string, oi: number) => {
                                    const isCorrect = q.question_type === 'mcq_multiple' || q.question_type === 'mcq_multi'
                                      ? (q.correct_options || []).includes(oi)
                                      : q.answer === opt;
                                    return (
                                      <div key={oi} className={`text-xs px-2 py-1 rounded ${isCorrect ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]' : 'text-[var(--color-on-surface-variant)]'}`}>
                                        <span className="font-bold">{String.fromCharCode(65 + oi)}.</span> <RichContent content={opt} format={fmt} />
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <button onClick={() => setStep(2)} className="flex-1 bg-[var(--color-surface-container-high)] hover:bg-[var(--color-surface-bright)] text-[var(--color-on-surface)] py-3 rounded-xl font-bold flex items-center justify-center gap-2"><ChevronLeft size={18} /> Back</button>
                  <button disabled={loading} onClick={handleSubmit} className="flex-[2] py-3 px-4 bg-[var(--color-brand-primary-container)] hover:bg-[var(--color-brand-primary-container)] text-white font-bold rounded-xl transition-all shadow-lg shadow-[var(--color-brand-primary)]/30 flex items-center justify-center gap-2 disabled:opacity-50">
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
