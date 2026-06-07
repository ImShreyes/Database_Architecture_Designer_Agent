// Mermaid Compiler - Converts Schema JSON to Mermaid ER Diagram syntax
import type {
  SchemaDefinition,
  TableDefinition,
  RelationshipDefinition,
  Cardinality,
  ColumnDefinition,
} from './types';

// Mermaid ER relationship notation
// ||--|| : exactly one
// ||--o{ : zero or more (one-to-many)
// }o--o{ : zero or more on both sides (many-to-many)
// ||--|{ : one or more

const cardinalityMapping: Record<Cardinality, { left: string; right: string }> = {
  'one-to-one': { left: '||', right: '||' },
  'one-to-many': { left: '||', right: 'o{' },
  'many-to-many': { left: '}o', right: 'o{' },
};

export class MermaidCompiler {
  private schema: SchemaDefinition;

  constructor(schema: SchemaDefinition) {
    this.schema = schema;
  }

  compile(): string {
    const lines: string[] = [];

    // ER Diagram header
    lines.push('erDiagram');

    // Add table definitions with their columns
    this.schema.tables.forEach(table => {
      lines.push(...this.generateTableDefinition(table));
    });

    // Add view definitions as special entities
    if (this.schema.views?.length) {
      lines.push('');
      lines.push('    %% Views');
      this.schema.views.forEach(view => {
        lines.push(...this.generateViewDefinition(view));
      });
    }

    // Add relationship lines
    this.schema.relationships.forEach(rel => {
      lines.push(this.generateRelationship(rel));
    });

    // Also generate relationships from foreign keys if not already in relationships
    this.generateImplicitRelationships().forEach(rel => {
      lines.push(rel);
    });

    // Generate view-to-table relationships
    if (this.schema.views?.length) {
      this.generateViewRelationships().forEach(rel => {
        lines.push(rel);
      });
    }

    return lines.join('\n');
  }

  private generateTableDefinition(table: TableDefinition): string[] {
    const lines: string[] = [];
    
    // Table block
    lines.push(`    ${this.sanitizeName(table.name)} {`);
    
    // Add columns
    table.columns.forEach(col => {
      const colLine = this.generateColumnLine(col, table);
      lines.push(`        ${colLine}`);
    });
    
    lines.push('    }');
    
    return lines;
  }

  private generateViewDefinition(view: import('./types').ViewDefinition): string[] {
    const lines: string[] = [];
    const viewName = this.sanitizeName(view.name);
    
    // View block — shown with a note indicating it's a view
    lines.push(`    ${viewName} {`);
    
    if (view.columns?.length) {
      view.columns.forEach(col => {
        lines.push(`        varchar ${this.sanitizeName(col)} "VIEW"`);
      });
    } else {
      // Parse column names from query if possible (basic approach)
      lines.push(`        text query "${view.isMaterialized ? 'MATERIALIZED VIEW' : 'VIEW'}"`);
    }
    
    lines.push('    }');
    
    return lines;
  }

  private generateColumnLine(column: ColumnDefinition, table: TableDefinition): string {
    const type = this.mapColumnType(column);
    const name = this.sanitizeName(column.name);
    
    // Build attribute markers
    const markers: string[] = [];
    if (column.isPrimaryKey) markers.push('PK');
    if (column.isUnique && !column.isPrimaryKey) markers.push('UK');
    
    // Check if this column is a foreign key
    const isFk = table.foreignKeys?.some(fk => fk.columnName === column.name);
    if (isFk) markers.push('FK');
    
    const markerStr = markers.length > 0 ? ` "${markers.join(',')}"` : '';
    
    return `${type} ${name}${markerStr}`;
  }

  private mapColumnType(column: ColumnDefinition): string {
    // Map our types to simpler Mermaid-friendly types
    const typeMap: Record<string, string> = {
      integer: 'int',
      bigint: 'bigint',
      smallint: 'smallint',
      serial: 'serial',
      bigserial: 'bigserial',
      varchar: 'varchar',
      text: 'text',
      char: 'char',
      boolean: 'boolean',
      date: 'date',
      timestamp: 'timestamp',
      timestamptz: 'timestamptz',
      time: 'time',
      decimal: 'decimal',
      numeric: 'numeric',
      float: 'float',
      double: 'double',
      json: 'json',
      jsonb: 'jsonb',
      uuid: 'uuid',
      blob: 'blob',
      enum: 'enum',
    };

    return typeMap[column.type] || column.type;
  }

  private generateRelationship(rel: RelationshipDefinition): string {
    const { left, right } = cardinalityMapping[rel.cardinality];
    const sourceName = this.sanitizeName(rel.sourceTable);
    const targetName = this.sanitizeName(rel.targetTable);
    
    // Format: Entity1 ||--o{ Entity2 : relationship_name
    const relationName = rel.name 
      ? this.sanitizeRelationName(rel.name)
      : this.generateRelationName(rel.sourceTable, rel.targetTable);
    
    return `    ${sourceName} ${left}--${right} ${targetName} : "${relationName}"`;
  }

  private generateImplicitRelationships(): string[] {
    const lines: string[] = [];
    const existingRels = new Set(
      this.schema.relationships.map(r => `${r.sourceTable}-${r.targetTable}`)
    );

    // Look for foreign keys that don't have explicit relationships
    this.schema.tables.forEach(table => {
      table.foreignKeys?.forEach(fk => {
        const relKey = `${table.name}-${fk.referencedTable}`;
        const reverseKey = `${fk.referencedTable}-${table.name}`;
        
        if (!existingRels.has(relKey) && !existingRels.has(reverseKey)) {
          // Default to one-to-many for FK relationships
          const sourceName = this.sanitizeName(fk.referencedTable);
          const targetName = this.sanitizeName(table.name);
          const relationName = `has_${table.name}`;
          
          lines.push(`    ${sourceName} ||--o{ ${targetName} : "${relationName}"`);
          existingRels.add(relKey);
        }
      });
    });

    return lines;
  }

  private generateViewRelationships(): string[] {
    const lines: string[] = [];
    const tableNames = new Set(this.schema.tables.map(t => t.name));
    
    this.schema.views?.forEach(view => {
      // Try to extract table references from the view query
      const query = view.query.toLowerCase();
      
      this.schema.tables.forEach(table => {
        // Simple heuristic: check if the table name appears in the view query
        const tableLower = table.name.toLowerCase();
        if (query.includes(tableLower)) {
          const viewName = this.sanitizeName(view.name);
          const tblName = this.sanitizeName(table.name);
          lines.push(`    ${tblName} ||--o{ ${viewName} : "referenced_by"`);
        }
      });
    });

    return lines;
  }

  private sanitizeName(name: string): string {
    // Mermaid entity names should be alphanumeric with underscores
    return name.replace(/[^a-zA-Z0-9_]/g, '_');
  }

  private sanitizeRelationName(name: string): string {
    // Relationship labels can have spaces but should be simple
    return name.replace(/[^a-zA-Z0-9_ ]/g, '_');
  }

  private generateRelationName(source: string, target: string): string {
    // Generate a descriptive relationship name
    return `${source}_to_${target}`;
  }
}

// Convenience function
export function compileMermaid(schema: SchemaDefinition): string {
  const compiler = new MermaidCompiler(schema);
  return compiler.compile();
}

// Extended Mermaid output with styling
export function compileMermaidWithTheme(
  schema: SchemaDefinition, 
  theme: 'default' | 'dark' | 'forest' | 'neutral' = 'default'
): string {
  const diagram = compileMermaid(schema);
  
  // Add Mermaid configuration for theming
  const config = `%%{init: {'theme': '${theme}'}}%%\n`;
  
  return config + diagram;
}
