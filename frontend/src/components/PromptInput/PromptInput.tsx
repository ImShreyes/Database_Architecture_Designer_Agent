import { Loader2, Sparkles, Paperclip, History, Zap } from 'lucide-react';
import { useSchemaStore } from '../../store/schemaStore';
import { api } from '../../services/api';

export const PromptInput = () => {
  const userPrompt = useSchemaStore((state) => state.userPrompt);
  const setUserPrompt = useSchemaStore((state) => state.setUserPrompt);
  const setSchema = useSchemaStore((state) => state.setSchema);
  const isGenerating = useSchemaStore((state) => state.isGenerating);
  const setGenerating = useSchemaStore((state) => state.setGenerating);
  const setError = useSchemaStore((state) => state.setError);
  
  const dialect = 'postgresql';

  const handleGenerate = async () => {
    if (!userPrompt.trim()) {
      setError('Please enter a description of your application');
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const generatedSchema = await api.generateSchema(userPrompt, dialect);
      setSchema(generatedSchema);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate schema');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-blue-500" />
        <h2 className="text-[13px] font-bold text-blue-500 tracking-widest uppercase">
          AI PROMPT WORKSPACE
        </h2>
      </div>

      <div className="bg-[#12141a] rounded-xl border border-blue-500/30 p-4 shadow-[0_0_15px_rgba(59,130,246,0.1)] focus-within:border-blue-500 focus-within:shadow-[0_0_20px_rgba(59,130,246,0.2)] transition-all">
        <textarea
          value={userPrompt}
          onChange={(e) => setUserPrompt(e.target.value)}
          placeholder="Create a full e-commerce backend with users, orders, products, and reviews."
          className="w-full h-32 bg-transparent text-sm text-slate-200 placeholder-slate-500 resize-none focus:outline-none"
          disabled={isGenerating}
        />
        
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-4 text-slate-500">
            <button className="hover:text-slate-300 transition-colors hidden md:block">
              <Paperclip className="w-4 h-4" />
            </button>
            <button className="hover:text-slate-300 transition-colors hidden md:block">
              <History className="w-4 h-4" />
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
    </div>
  );
};

export default PromptInput;
