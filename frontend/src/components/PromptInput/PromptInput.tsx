import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { SQLDialect } from '../../engine/types';
import { useSchemaStore } from '../../store/schemaStore';
import { api } from '../../services/api';

export const PromptInput = () => {
  const { 
    userPrompt, 
    setUserPrompt, 
    setSchema, 
    isGenerating, 
    setGenerating, 
    setError,
    schema
  } = useSchemaStore();
  
  const [dialect, setDialect] = useState<SQLDialect>('postgresql');

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

  const handleDialectChange = (newDialect: SQLDialect) => {
    setDialect(newDialect);
    if (schema) {
      useSchemaStore.getState().setDialect(newDialect);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 animate-fade-in">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900">
          Generate Database Architecture
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Enter your prompt
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              placeholder="Design a database for an e-commerce store with users, products, orders, and payments."
              className="flex-1 input"
              disabled={isGenerating}
            />
            <div className="md:w-64">
                <select
                    value={dialect}
                    onChange={(e) => handleDialectChange(e.target.value as SQLDialect)}
                    className="input cursor-pointer"
                    disabled={isGenerating}
                >
                    <option value="" disabled>Select DB Dialect</option>
                    <option value="postgresql">PostgreSQL</option>
                    <option value="mysql">MySQL</option>
                    <option value="sqlite">SQLite</option>
                    <option value="sqlserver">SQL Server</option>
                </select>
            </div>
        </div>
        
        <div>
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !userPrompt.trim()}
              className="btn-primary w-full md:w-40"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Generating...
                </>
              ) : (
                'Generate'
              )}
            </button>
        </div>
      </div>
    </div>
  );
};

export default PromptInput;
