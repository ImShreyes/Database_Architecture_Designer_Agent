import { useEffect, useRef, useState } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-sql';
import { Copy, Check, Download } from 'lucide-react';
import { useCompiledSQL, useSchema } from '../../store/schemaStore';

export const SQLEditor = () => {
  const compiledSQL = useCompiledSQL();
  const schema = useSchema();
  const codeRef = useRef<HTMLElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (codeRef.current && compiledSQL) {
      Prism.highlightElement(codeRef.current);
    }
  }, [compiledSQL]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(compiledSQL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDownload = () => {
      const blob = new Blob([compiledSQL], { type: 'text/sql' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'schema.sql';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };

  if (!schema) {
      return (
          <div className="card h-[600px] flex items-center justify-center text-slate-400">
              <p>Generated SQL will appear here</p>
          </div>
      )
  }

  return (
    <div className="card h-[600px] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
        <h3 className="font-bold text-slate-800">
          Generated SQL Schema
        </h3>
        
        <div className="flex items-center gap-2">
            <button
                onClick={handleDownload}
                className="btn-primary text-sm px-4 py-1.5 h-auto rounded flex items-center gap-2"
            >
                <Download className="w-3.5 h-3.5" />
                Download SQL File
            </button>
            <button
            onClick={handleCopy}
            className="btn-secondary text-sm px-4 py-1.5 h-auto rounded flex items-center gap-2"
            >
            {copied ? (
                <>
                <Check className="w-3.5 h-3.5 text-green-500" />
                <span className="text-green-600">Copied</span>
                </>
            ) : (
                <>
                <Copy className="w-3.5 h-3.5" />
                Copy to Clipboard
                </>
            )}
            </button>
        </div>
      </div>

      {/* Code Content */}
      <div className="flex-1 overflow-auto bg-[#1e293b]"> {/* Dark background for code */}
        <div className="relative">
          {/* Line Numbers */}
          <div className="absolute left-0 top-0 bottom-0 w-12 bg-[#0f172a] border-r border-slate-700">
            <div className="p-4 font-mono text-sm text-slate-500 text-right select-none">
              {compiledSQL.split('\n').map((_, i) => (
                <div key={i} className="leading-6">
                  {i + 1}
                </div>
              ))}
            </div>
          </div>
          
          {/* Code */}
          <pre className="font-mono text-sm p-4 pl-16 text-slate-200">
            <code ref={codeRef} className="language-sql">
              {compiledSQL}
            </code>
          </pre>
        </div>
      </div>
    </div>
  );
};

export default SQLEditor;
