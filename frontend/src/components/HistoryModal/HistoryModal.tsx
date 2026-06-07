import { useState, useEffect } from 'react';
import { X, Clock, Database, Loader2 } from 'lucide-react';
import { api } from '../../services/api';
import type { SavedSchema } from '../../services/api';
import { useSchemaStore } from '../../store/schemaStore';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HistoryModal = ({ isOpen, onClose }: HistoryModalProps) => {
  const [schemas, setSchemas] = useState<SavedSchema[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const setSchema = useSchemaStore(state => state.setSchema);
  const setUserPrompt = useSchemaStore(state => state.setUserPrompt);

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen]);

  const loadHistory = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getSchemas();
      setSchemas(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (saved: SavedSchema) => {
    setSchema(saved.schema_data);
    setUserPrompt(saved.prompt);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-[#12141a] border border-[#2d3139] rounded-xl shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between p-5 border-b border-[#2d3139]">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-500" />
            Schema History
          </h2>
          <button 
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
              <p>Loading history...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">
              {error}
            </div>
          ) : schemas.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Database className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium text-slate-300">No history found</p>
              <p className="text-sm mt-1">Generate a schema to see it here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {schemas.map((saved) => (
                <div 
                  key={saved.id}
                  onClick={() => handleSelect(saved)}
                  className="p-4 rounded-lg border border-[#2d3139] bg-[#1a1d24] hover:bg-[#20252e] hover:border-blue-500/50 cursor-pointer transition-all group"
                >
                  <p className="text-sm text-slate-200 line-clamp-2 mb-3">
                    {saved.prompt}
                  </p>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1.5">
                        <Database className="w-3.5 h-3.5" />
                        {saved.schema_data?.tables?.length || 0} Tables
                      </span>
                      <span className="uppercase px-2 py-0.5 rounded-full bg-surface-700 text-[10px] font-bold tracking-wider">
                        {saved.dialect}
                      </span>
                    </div>
                    <span>{new Date(saved.created_at).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
