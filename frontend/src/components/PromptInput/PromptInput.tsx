import { useState } from 'react';
import { Loader2, Sparkles, Zap, ChevronDown, Lightbulb } from 'lucide-react';
import { useSchemaStore } from '../../store/schemaStore';
import { api } from '../../services/api';
import type { SQLDialect } from '../../engine/types';

const DIALECT_OPTIONS: { value: SQLDialect; label: string }[] = [
  { value: 'postgresql', label: 'PostgreSQL' },
  { value: 'mysql', label: 'MySQL' },
  { value: 'sqlite', label: 'SQLite' },
  { value: 'sqlserver', label: 'SQL Server' },
];

const COMPLEXITY_OPTIONS = [
  { value: 'simple', label: 'Simple', desc: '8-12 tables' },
  { value: 'standard', label: 'Standard', desc: '12-20 tables' },
  { value: 'enterprise', label: 'Enterprise', desc: '20-35 tables' },
] as const;

const EXAMPLE_PROMPTS = [
  "E-commerce platform with users, products, orders, reviews, payments, and inventory management",
  "Hospital management system with patients, doctors, appointments, prescriptions, billing, and lab results",
  "Social media platform with users, posts, comments, likes, followers, messages, and notifications",
  "Learning management system with courses, students, instructors, enrollments, assignments, and grades",
  "Banking system with accounts, transactions, loans, cards, branches, and customer KYC",
];

export const PromptInput = () => {
  const userPrompt = useSchemaStore((state) => state.userPrompt);
  const setUserPrompt = useSchemaStore((state) => state.setUserPrompt);
  const setSchema = useSchemaStore((state) => state.setSchema);
  const isGenerating = useSchemaStore((state) => state.isGenerating);
  const setGenerating = useSchemaStore((state) => state.setGenerating);
  const setError = useSchemaStore((state) => state.setError);
  const selectedDialect = useSchemaStore((state) => state.selectedDialect);
  const setSelectedDialect = useSchemaStore((state) => state.setSelectedDialect);

  const [complexity, setComplexity] = useState<'simple' | 'standard' | 'enterprise'>('standard');
  const [showExamples, setShowExamples] = useState(false);

  const handleGenerate = async () => {
    if (!userPrompt.trim()) {
      setError('Please enter a description of your application');
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const generatedSchema = await api.generateSchema(
        userPrompt,
        selectedDialect,
        undefined,
        complexity,
      );
      setSchema(generatedSchema);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate schema');
    } finally {
      setGenerating(false);
    }
  };

  const handleExampleClick = (example: string) => {
    setUserPrompt(example);
    setShowExamples(false);
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-blue-500" />
        <h2 className="text-[13px] font-bold text-blue-500 tracking-widest uppercase">
          AI PROMPT WORKSPACE
        </h2>
      </div>

      {/* Dialect & Complexity Selectors */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1">
          <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1 block">
            Database
          </label>
          <div className="relative">
            <select
              value={selectedDialect}
              onChange={(e) => setSelectedDialect(e.target.value as SQLDialect)}
              className="w-full bg-[#1a1d24] text-slate-200 text-sm border border-[#2d3139] rounded-lg px-3 py-2 appearance-none cursor-pointer hover:border-blue-500/50 transition-colors focus:outline-none focus:border-blue-500"
              disabled={isGenerating}
            >
              {DIALECT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        <div className="flex-1">
          <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1 block">
            Complexity
          </label>
          <div className="relative">
            <select
              value={complexity}
              onChange={(e) => setComplexity(e.target.value as typeof complexity)}
              className="w-full bg-[#1a1d24] text-slate-200 text-sm border border-[#2d3139] rounded-lg px-3 py-2 appearance-none cursor-pointer hover:border-blue-500/50 transition-colors focus:outline-none focus:border-blue-500"
              disabled={isGenerating}
            >
              {COMPLEXITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} ({opt.desc})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Prompt Input */}
      <div className="bg-[#12141a] rounded-xl border border-blue-500/30 p-4 shadow-[0_0_15px_rgba(59,130,246,0.1)] focus-within:border-blue-500 focus-within:shadow-[0_0_20px_rgba(59,130,246,0.2)] transition-all">
        <textarea
          value={userPrompt}
          onChange={(e) => setUserPrompt(e.target.value)}
          placeholder="Describe your application in detail. For example: 'E-commerce platform with users, products, orders, payments, reviews, and inventory tracking.'"
          className="w-full h-32 bg-transparent text-sm text-slate-200 placeholder-slate-500 resize-none focus:outline-none"
          disabled={isGenerating}
        />
        
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-4 text-slate-500">
            <button
              onClick={() => setShowExamples(!showExamples)}
              className="flex items-center gap-1.5 hover:text-blue-400 transition-colors text-xs"
              title="Show example prompts"
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Examples</span>
            </button>
          </div>
          
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !userPrompt.trim()}
            className="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-medium px-5 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 fill-white" />
                Generate
              </>
            )}
          </button>
        </div>
      </div>

      {/* Example Prompts Dropdown */}
      {showExamples && (
        <div className="mt-2 bg-[#12141a] border border-[#2d3139] rounded-xl p-2 space-y-1 animate-fade-in">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold px-2 py-1">
            Click to use an example prompt
          </p>
          {EXAMPLE_PROMPTS.map((example, i) => (
            <button
              key={i}
              onClick={() => handleExampleClick(example)}
              className="w-full text-left text-xs text-slate-400 hover:text-slate-200 hover:bg-[#1a1d24] rounded-lg px-3 py-2.5 transition-colors"
            >
              {example}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default PromptInput;
