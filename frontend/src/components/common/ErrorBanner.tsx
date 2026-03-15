import { AlertCircle, X } from 'lucide-react';
import { useSchemaStore, useError } from '../../store/schemaStore';

export const ErrorBanner = () => {
  const error = useError();
  const setError = useSchemaStore((state) => state.setError);

  if (!error) return null;

  return (
    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3 animate-slide-up">
      <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <h4 className="font-medium text-red-300">Error</h4>
        <p className="text-sm text-red-400/80 mt-1">{error}</p>
      </div>
      <button
        onClick={() => setError(null)}
        className="p-1 rounded hover:bg-red-500/20 text-red-400 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default ErrorBanner;
