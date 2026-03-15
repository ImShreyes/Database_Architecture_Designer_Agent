import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { 
  Network, 
  ZoomIn,
  ZoomOut,
  Hand,
  MousePointer2,
  Grid
} from 'lucide-react';
import { useCompiledMermaid } from '../../store/schemaStore';
import { SQLEditor } from '../SQLEditor';

// Initialize Mermaid with Dark Theme
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    primaryColor: '#1e293b',
    primaryTextColor: '#f8fafc',
    primaryBorderColor: '#334155',
    lineColor: '#3b82f6',
    secondaryColor: '#0ea5e9',
    tertiaryColor: '#1e293b',
    background: 'transparent',
    mainBkg: '#1e293b',
    nodeBorder: '#334155',
    clusterBkg: '#0f172a',
    titleColor: '#f8fafc',
    edgeLabelBackground: '#1e293b',
    fontFamily: 'Inter, system-ui, sans-serif'
  },
  er: {
    useMaxWidth: true,
    layoutDirection: 'TB',
    minEntityWidth: 200,
    minEntityHeight: 100,
  },
});

const MermaidDiagram = ({ diagram }: { diagram: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [svgContent, setSvgContent] = useState<string>('');

  useEffect(() => {
    const renderDiagram = async () => {
      if (!diagram || !containerRef.current) return;

      try {
        setError(null);
        const id = `mermaid-${Date.now()}`;
        const { svg } = await mermaid.render(id, diagram);
        setSvgContent(svg);
      } catch (err) {
        console.error('Mermaid render error:', err);
        setError(err instanceof Error ? err.message : 'Failed to render diagram');
      }
    };

    renderDiagram();
  }, [diagram]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-500 text-sm p-4">
        <p>Diagram rendering error: {error}</p>
      </div>
    );
  }

  if (!diagram) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-4">
        <Network className="w-16 h-16 opacity-30" />
        <p className="text-sm">Generate a schema to view the ER diagram</p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="w-full h-full overflow-auto flex items-center justify-center [&>svg]:max-w-[90%] [&>svg]:h-auto"
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
};

export const SchemaVisualizer = () => {
  const compiledMermaid = useCompiledMermaid();
  const [activeTab, setActiveTab] = useState<'diagram' | 'queries'>('diagram');

  return (
    <div className="flex flex-col h-full w-full relative">
      {/* Top Navigation Bar inside Workspace */}
      <div className="flex items-center justify-between px-6 pt-4 relative z-10 w-full">
        <div className="flex items-center gap-6 border-b-2 border-transparent w-full">
          <button 
            onClick={() => setActiveTab('diagram')}
            className={`pb-3 text-sm font-medium transition-colors ${
              activeTab === 'diagram' 
                ? 'text-blue-500 border-b-2 border-blue-500' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ER Diagram
          </button>
          <button 
            onClick={() => setActiveTab('queries')}
            className={`pb-3 text-sm font-medium transition-colors ${
              activeTab === 'queries' 
                ? 'text-blue-500 border-b-2 border-blue-500' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            DDL Queries
          </button>
        </div>
      </div>

      {activeTab === 'diagram' && (
        <>
          {/* Floating Toolbar */}
          <div className="absolute top-20 right-[50%] translate-x-[50%] z-20 bg-[#12141a]/90 backdrop-blur border border-[#2d3139] rounded-2xl px-4 py-2 flex items-center gap-4 shadow-xl select-none">
            <button className="text-slate-400 hover:text-white transition-colors p-1" title="Zoom In">
              <ZoomIn className="w-4 h-4" />
            </button>
            <button className="text-slate-400 hover:text-white transition-colors p-1" title="Zoom Out">
              <ZoomOut className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-surface-600"></div>
            <button className="text-slate-400 hover:text-white transition-colors p-1" title="Pan">
              <Hand className="w-4 h-4" />
            </button>
            <button className="text-blue-500 p-1" title="Select">
              <MousePointer2 className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-surface-600"></div>
            <button className="text-slate-400 hover:text-white transition-colors p-1" title="Toggle Grid">
              <Grid className="w-4 h-4" />
            </button>
          </div>

          {/* Canvas Area with Dot Grid */}
          <div 
            className="flex-1 w-full relative overflow-hidden" 
            style={{
              backgroundImage: 'radial-gradient(#2d3139 1px, transparent 1px)',
              backgroundSize: '24px 24px'
            }}
          >
            <MermaidDiagram diagram={compiledMermaid} />
          </div>
        </>
      )}

      {activeTab === 'queries' && (
        <div className="flex-1 overflow-auto p-6">
          <SQLEditor />
        </div>
      )}

      {/* Status Bar */}
      <div className="h-10 border-t border-surface-700 bg-[#0f1117] flex items-center justify-between px-4 text-xs text-slate-400 select-none relative z-10 w-full">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
            <span>AI Engine: High-Performance v2.0</span>
          </div>
          <span>Schema synchronized just now</span>
        </div>
        
        <div className="flex items-center gap-4">
          <span>Tables: 6 | Relations: 5 | Constraints: 12</span>
          <button className="flex items-center gap-2 hover:text-slate-200 transition-colors">
            <span className="w-3.5 h-3.5 flex items-center justify-center rounded-full border border-current">👁</span>
            Preview SQL
          </button>
        </div>
      </div>
    </div>
  );
};

export default SchemaVisualizer;
