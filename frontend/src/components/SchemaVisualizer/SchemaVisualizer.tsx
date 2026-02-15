import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { 
  Network, 
  Table as TableIcon, 
  ChevronRight, 
  ChevronDown,
  Key,
  Link,
  Trash2,
  Edit2,
  RefreshCw
} from 'lucide-react';
import { 
  useSchemaStore, 
  useCompiledMermaid, 
  useTables, 
  useRelationships 
} from '../../store/schemaStore';
import type { TableDefinition, RelationshipDefinition, Cardinality } from '../../engine/types';

// Initialize Mermaid with Light Theme
mermaid.initialize({
  startOnLoad: false,
  theme: 'base',
  themeVariables: {
    primaryColor: '#eff6ff',
    primaryTextColor: '#1e293b',
    primaryBorderColor: '#3b82f6',
    lineColor: '#64748b',
    secondaryColor: '#ffffff',
    tertiaryColor: '#f8fafc',
    background: '#ffffff',
    mainBkg: '#ffffff',
    nodeBorder: '#3b82f6',
    clusterBkg: '#f1f5f9',
    titleColor: '#1e293b',
    edgeLabelBackground: '#ffffff',
  },
  er: {
    useMaxWidth: true,
  },
});

// Mermaid Diagram Component
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
      <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4">
        <Network className="w-16 h-16 opacity-50" />
        <p className="text-lg">No schema to visualize</p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="w-full h-full overflow-auto p-4 flex items-center justify-center bg-white"
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
};

// Tree Node for Tables (Keeping functionality but updating styles)
interface TreeNodeProps {
  table: TableDefinition;
  isExpanded: boolean;
  isSelected: boolean;
  onToggle: () => void;
  onSelect: () => void;
}

const TableTreeNode = ({ 
  table, 
  isExpanded, 
  isSelected, 
  onToggle, 
  onSelect 
}: TreeNodeProps) => {
  return (
    <div className="animate-fade-in">
      <div 
        className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all duration-150 ${
            isSelected ? 'bg-primary-50 text-primary-700' : 'hover:bg-slate-50'
        }`}
        onClick={onSelect}
      >
        <button 
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          className="p-0.5 hover:bg-slate-100 rounded transition-colors"
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-400" />
          )}
        </button>
        <TableIcon className="w-4 h-4 text-primary-500" />
        <span className="font-medium text-slate-700">{table.name}</span>
        <span className="text-xs text-slate-400 ml-auto">
          {table.columns.length} cols
        </span>
      </div>

      {isExpanded && (
        <div className="ml-6 pl-3 border-l border-slate-200 space-y-1 py-1">
          {table.columns.map((column) => (
            <div 
              key={column.id}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all"
            >
              {column.isPrimaryKey && (
                <Key className="w-3.5 h-3.5 text-yellow-500" />
              )}
              {!column.isPrimaryKey && (
                <div className="w-3.5 h-3.5 rounded border border-slate-300" />
              )}
              <span className="font-mono">{column.name}</span>
              <span className="text-xs text-slate-400 ml-auto">
                {column.type}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Main Schema Visualizer Component
export const SchemaVisualizer = () => {
  const compiledMermaid = useCompiledMermaid();
  const tables = useTables();
  const relationships = useRelationships();
  const { 
    selectedTableId, 
    selectTable, 
  } = useSchemaStore();

  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  
  // Tab state could be used to toggle tree view if needed, but screenshot focus is Diagram
  const [activeTab, setActiveTab] = useState<'diagram' | 'tree'>('diagram');

  const toggleExpanded = (tableId: string) => {
    setExpandedTables((prev) => {
      const next = new Set(prev);
      if (next.has(tableId)) {
        next.delete(tableId);
      } else {
        next.add(tableId);
      }
      return next;
    });
  };

  useEffect(() => {
    if (tables.length > 0) {
      setExpandedTables(new Set(tables.map((t) => t.id)));
    }
  }, [tables]);

  return (
    <div className="card flex flex-col h-[600px] overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
           Database Schema Diagram
        </h3>
        
        <div className="flex items-center gap-2">
            <button className="btn-primary text-sm px-4 py-1.5 h-auto rounded">
                <Edit2 className="w-3.5 h-3.5 mr-1" />
                Edit
            </button>
            <button className="btn-secondary text-sm px-4 py-1.5 h-auto rounded">
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                Refresh
            </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden bg-white relative">
         <MermaidDiagram diagram={compiledMermaid} />
         
         {/* Toggle for Tree View (Optional / Hidden in screenshot but useful) */}
         <div className="absolute bottom-4 right-4">
             {/* Could add zoom controls here */}
         </div>
      </div>
    </div>
  );
};

export default SchemaVisualizer;
