import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { 
  Network, 
  ZoomIn,
  ZoomOut,
  Hand,
  MousePointer2,
  Grid,
  Maximize2,
} from 'lucide-react';
import { useSchemaStore, useCompiledMermaid } from '../../store/schemaStore';
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
  const [scale, setScale] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

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

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.3));
  const handleResetZoom = () => { setScale(1); setPanOffset({ x: 0, y: 0 }); };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isPanning) {
      setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning && e.buttons === 1) {
      setPanOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setScale(prev => Math.max(0.3, Math.min(3, prev + delta)));
    }
  };

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
    <>
      {/* Floating Toolbar */}
      <div className="absolute top-4 right-[50%] translate-x-[50%] z-20 bg-[#12141a]/90 backdrop-blur border border-[#2d3139] rounded-2xl px-4 py-2 flex items-center gap-4 shadow-xl select-none">
        <button
          onClick={handleZoomIn}
          className="text-slate-400 hover:text-white transition-colors p-1"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="text-slate-400 hover:text-white transition-colors p-1"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="text-[10px] text-slate-500 font-mono min-w-[3rem] text-center">
          {Math.round(scale * 100)}%
        </span>
        <div className="w-px h-4 bg-surface-600"></div>
        <button
          onClick={() => setIsPanning(!isPanning)}
          className={`transition-colors p-1 ${isPanning ? 'text-blue-500' : 'text-slate-400 hover:text-white'}`}
          title="Pan"
        >
          <Hand className="w-4 h-4" />
        </button>
        <button
          onClick={() => setIsPanning(false)}
          className={`transition-colors p-1 ${!isPanning ? 'text-blue-500' : 'text-slate-400 hover:text-white'}`}
          title="Select"
        >
          <MousePointer2 className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-surface-600"></div>
        <button
          onClick={handleResetZoom}
          className="text-slate-400 hover:text-white transition-colors p-1"
          title="Reset View"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Diagram Canvas */}
      <div
        ref={containerRef}
        className={`w-full h-full overflow-hidden flex items-center justify-center ${isPanning ? 'cursor-grab active:cursor-grabbing' : ''}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onWheel={handleWheel}
        style={{
          backgroundImage: 'radial-gradient(#2d3139 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      >
        <div
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${scale})`,
            transformOrigin: 'center center',
            transition: isPanning ? 'none' : 'transform 0.2s ease',
          }}
          className="[&>svg]:max-w-[90%] [&>svg]:h-auto"
          dangerouslySetInnerHTML={{ __html: svgContent }}
        />
      </div>
    </>
  );
};

type TabType = 'diagram' | 'queries' | 'views' | 'triggers';

export const SchemaVisualizer = () => {
  const compiledMermaid = useCompiledMermaid();
  const schema = useSchemaStore((state) => state.schema);
  const [activeTab, setActiveTab] = useState<TabType>('diagram');

  // Dynamic counts
  const tableCount = schema?.tables?.length ?? 0;
  const relationCount = schema?.relationships?.length ?? 0;
  const viewCount = schema?.views?.length ?? 0;
  const triggerCount = schema?.triggers?.length ?? 0;
  const fnCount = (schema?.functions?.length ?? 0) + (schema?.storedProcedures?.length ?? 0);
  const fkCount = schema?.tables?.reduce((sum, t) => sum + (t.foreignKeys?.length ?? 0), 0) ?? 0;
  const indexCount = schema?.tables?.reduce((sum, t) => sum + (t.indexes?.length ?? 0), 0) ?? 0;

  const tabs: { key: TabType; label: string; count?: number }[] = [
    { key: 'diagram', label: 'ER Diagram' },
    { key: 'queries', label: 'DDL Queries' },
    { key: 'views', label: 'Views & Functions', count: viewCount + fnCount },
    { key: 'triggers', label: 'Triggers', count: triggerCount },
  ];

  return (
    <div className="flex flex-col h-full w-full relative">
      {/* Top Navigation Bar inside Workspace */}
      <div className="flex items-center justify-between px-6 pt-4 relative z-10 w-full">
        <div className="flex items-center gap-6 border-b-2 border-transparent w-full">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === tab.key 
                  ? 'text-blue-500 border-b-2 border-blue-500' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full font-mono">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'diagram' && (
        <div className="flex-1 w-full relative overflow-hidden">
          <MermaidDiagram diagram={compiledMermaid} />
        </div>
      )}

      {activeTab === 'queries' && (
        <div className="flex-1 overflow-auto p-6">
          <SQLEditor />
        </div>
      )}

      {activeTab === 'views' && (
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {(!schema?.views?.length && !schema?.functions?.length && !schema?.storedProcedures?.length) ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-4">
              <p className="text-sm">No views, functions, or procedures in this schema</p>
            </div>
          ) : (
            <>
              {/* Views */}
              {schema?.views?.map((view) => (
                <div key={view.id} className="bg-[#12141a] rounded-xl border border-[#2d3139] p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded">
                      {view.isMaterialized ? 'Materialized View' : 'View'}
                    </span>
                    <h3 className="text-sm font-semibold text-slate-200">{view.name}</h3>
                  </div>
                  {view.comment && <p className="text-xs text-slate-400 mb-2">{view.comment}</p>}
                  <pre className="text-xs text-slate-300 bg-[#0f1117] rounded-lg p-3 overflow-auto font-mono">
                    {view.query}
                  </pre>
                </div>
              ))}

              {/* Functions */}
              {schema?.functions?.map((fn) => (
                <div key={fn.id} className="bg-[#12141a] rounded-xl border border-[#2d3139] p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded">
                      Function
                    </span>
                    <h3 className="text-sm font-semibold text-slate-200">{fn.name}</h3>
                    <span className="text-[10px] text-slate-500">→ {fn.returnType}</span>
                  </div>
                  {fn.comment && <p className="text-xs text-slate-400 mb-2">{fn.comment}</p>}
                  <pre className="text-xs text-slate-300 bg-[#0f1117] rounded-lg p-3 overflow-auto font-mono">
                    {fn.body}
                  </pre>
                </div>
              ))}

              {/* Stored Procedures */}
              {schema?.storedProcedures?.map((proc) => (
                <div key={proc.id} className="bg-[#12141a] rounded-xl border border-[#2d3139] p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded">
                      Stored Procedure
                    </span>
                    <h3 className="text-sm font-semibold text-slate-200">{proc.name}</h3>
                  </div>
                  {proc.comment && <p className="text-xs text-slate-400 mb-2">{proc.comment}</p>}
                  {proc.parameters.length > 0 && (
                    <div className="flex gap-2 flex-wrap mb-2">
                      {proc.parameters.map((p, i) => (
                        <span key={i} className="text-[10px] bg-[#1a1d24] text-slate-400 px-2 py-0.5 rounded font-mono">
                          {p.direction} {p.name}: {p.type}
                        </span>
                      ))}
                    </div>
                  )}
                  <pre className="text-xs text-slate-300 bg-[#0f1117] rounded-lg p-3 overflow-auto font-mono">
                    {proc.body}
                  </pre>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {activeTab === 'triggers' && (
        <div className="flex-1 overflow-auto p-6 space-y-4">
          {!schema?.triggers?.length ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-4">
              <p className="text-sm">No triggers in this schema</p>
            </div>
          ) : (
            schema.triggers.map((trigger) => (
              <div key={trigger.id} className="bg-[#12141a] rounded-xl border border-[#2d3139] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider bg-red-500/10 text-red-400 px-2 py-0.5 rounded">
                    Trigger
                  </span>
                  <h3 className="text-sm font-semibold text-slate-200">{trigger.name}</h3>
                </div>
                <div className="flex gap-2 flex-wrap mb-2">
                  <span className="text-[10px] bg-[#1a1d24] text-slate-400 px-2 py-0.5 rounded font-mono">
                    {trigger.timing} {trigger.event}
                  </span>
                  <span className="text-[10px] bg-[#1a1d24] text-slate-400 px-2 py-0.5 rounded font-mono">
                    ON {trigger.tableName}
                  </span>
                  <span className="text-[10px] bg-[#1a1d24] text-slate-400 px-2 py-0.5 rounded font-mono">
                    {trigger.forEachRow !== false ? 'FOR EACH ROW' : 'FOR EACH STATEMENT'}
                  </span>
                </div>
                {trigger.comment && <p className="text-xs text-slate-400 mb-2">{trigger.comment}</p>}
                <pre className="text-xs text-slate-300 bg-[#0f1117] rounded-lg p-3 overflow-auto font-mono">
                  {trigger.body}
                </pre>
              </div>
            ))
          )}
        </div>
      )}

      {/* Dynamic Status Bar */}
      <div className="h-10 border-t border-surface-700 bg-[#0f1117] flex items-center justify-between px-4 text-xs text-slate-400 select-none relative z-10 w-full">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
            <span>AI Engine: LangGraph Pipeline v2.0</span>
          </div>
          {schema && (
            <span>
              Schema: <span className="text-slate-200 font-medium">{schema.name}</span>
              {' '}• Dialect: <span className="text-slate-200 font-medium">{schema.dialect}</span>
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          {schema ? (
            <span>
              Tables: <span className="text-slate-200 font-medium">{tableCount}</span>
              {' | '}Relations: <span className="text-slate-200 font-medium">{relationCount}</span>
              {' | '}FKs: <span className="text-slate-200 font-medium">{fkCount}</span>
              {' | '}Indexes: <span className="text-slate-200 font-medium">{indexCount}</span>
              {viewCount > 0 && <>{' | '}Views: <span className="text-slate-200 font-medium">{viewCount}</span></>}
              {triggerCount > 0 && <>{' | '}Triggers: <span className="text-slate-200 font-medium">{triggerCount}</span></>}
            </span>
          ) : (
            <span className="text-slate-500">No schema loaded</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default SchemaVisualizer;
