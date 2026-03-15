import { Header, ErrorBanner } from '../components/common';
import { PromptInput } from '../components/PromptInput';
import { SchemaVisualizer } from '../components/SchemaVisualizer';
import { useTables } from '../store/schemaStore';
import { Table as TableIcon } from 'lucide-react';

export function EditorApp() {
  const tables = useTables();

  return (
    <div className="h-screen flex flex-col bg-[#0b0c10] overflow-hidden text-slate-300">
      <Header />

      <main className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-[340px] border-r border-surface-700 bg-[#12141a] flex flex-col overflow-y-auto">
          <ErrorBanner />
          
          <div className="p-4 space-y-6 flex-1">
            <PromptInput />

            {/* Active Schema Entities */}
            {tables.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-slate-400 tracking-wider uppercase mb-2">
                  Active Schema Entities
                </h3>
                
                <div className="space-y-1">
                  {tables.map((table, index) => (
                    <div 
                      key={table.id}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer ${
                        index === 0 ? 'bg-[#1a1d24] border border-[#2d3139]' : 'hover:bg-[#1a1d24]/50 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <TableIcon className={`w-4 h-4 ${index === 0 ? 'text-blue-500' : 'text-slate-500'}`} />
                        <span className={`text-sm font-medium ${index === 0 ? 'text-slate-200' : ''}`}>{table.name}</span>
                      </div>
                      {index === 0 && (
                        <span className="text-[10px] uppercase font-bold tracking-wider bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded">Core</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Workspace Area */}
        <div className="flex-1 flex flex-col bg-[#050608] relative">
          <SchemaVisualizer />
        </div>
      </main>
    </div>
  );
}
