// SQL Compiler - Converts Schema JSON to SQL DDL statements
import type {
  SchemaDefinition,
  TableDefinition,
  ColumnDefinition,
  StoredProcedureDefinition,
  SQLDialect,
  ColumnType,
} from './types';

// Type mapping for different SQL dialects
const typeMapping: Record<SQLDialect, Record<ColumnType, string>> = {
  postgresql: {
    integer: 'INTEGER',
    bigint: 'BIGINT',
    smallint: 'SMALLINT',
    serial: 'SERIAL',
    bigserial: 'BIGSERIAL',
    varchar: 'VARCHAR',
    text: 'TEXT',
    char: 'CHAR',
    boolean: 'BOOLEAN',
    date: 'DATE',
    timestamp: 'TIMESTAMP',
    timestamptz: 'TIMESTAMPTZ',
    time: 'TIME',
    decimal: 'DECIMAL',
    numeric: 'NUMERIC',
    float: 'REAL',
    double: 'DOUBLE PRECISION',
    json: 'JSON',
    jsonb: 'JSONB',
    uuid: 'UUID',
    blob: 'BYTEA',
    enum: 'VARCHAR', // PostgreSQL uses CREATE TYPE for enums
  },
  mysql: {
    integer: 'INT',
    bigint: 'BIGINT',
    smallint: 'SMALLINT',
    serial: 'INT AUTO_INCREMENT',
    bigserial: 'BIGINT AUTO_INCREMENT',
    varchar: 'VARCHAR',
    text: 'TEXT',
    char: 'CHAR',
    boolean: 'TINYINT(1)',
    date: 'DATE',
    timestamp: 'TIMESTAMP',
    timestamptz: 'TIMESTAMP',
    time: 'TIME',
    decimal: 'DECIMAL',
    numeric: 'NUMERIC',
    float: 'FLOAT',
    double: 'DOUBLE',
    json: 'JSON',
    jsonb: 'JSON',
    uuid: 'CHAR(36)',
    blob: 'BLOB',
    enum: 'ENUM',
  },
};

export class SQLCompiler {
  private dialect: SQLDialect;
  private schema: SchemaDefinition;

  constructor(schema: SchemaDefinition) {
    this.schema = schema;
    this.dialect = schema.dialect;
  }

  compile(): string {
    const sections: string[] = [];

    // Header comment
    sections.push(this.generateHeader());

    // Create schema (PostgreSQL only)
    if (this.dialect === 'postgresql' && this.schema.tables.some(t => t.schema)) {
      sections.push(this.generateSchemaStatements());
    }

    // Create enum types (PostgreSQL only)
    if (this.dialect === 'postgresql') {
      const enumSection = this.generateEnumTypes();
      if (enumSection) sections.push(enumSection);
    }

    // Create tables
    sections.push(this.generateTables());

    // Create indexes
    const indexSection = this.generateIndexes();
    if (indexSection) sections.push(indexSection);

    // Create foreign key constraints (after all tables exist)
    const fkSection = this.generateForeignKeys();
    if (fkSection) sections.push(fkSection);

    // Create junction tables for many-to-many relationships
    const junctionSection = this.generateJunctionTables();
    if (junctionSection) sections.push(junctionSection);

    // Create stored procedures
    const procSection = this.generateStoredProcedures();
    if (procSection) sections.push(procSection);

    return sections.filter(s => s.trim()).join('\n\n');
  }

  private generateHeader(): string {
    const dialectName = this.dialect === 'postgresql' ? 'PostgreSQL' : 'MySQL';
    return `-- ============================================
-- Database Schema: ${this.schema.name}
-- Dialect: ${dialectName}
-- Generated: ${new Date().toISOString()}
-- Description: ${this.schema.description || 'Auto-generated schema'}
-- ============================================`;
  }

  private generateSchemaStatements(): string {
    const schemas = new Set<string>();
    this.schema.tables.forEach(t => {
      if (t.schema && t.schema !== 'public') {
        schemas.add(t.schema);
      }
    });

    if (schemas.size === 0) return '';

    return Array.from(schemas)
      .map(s => `CREATE SCHEMA IF NOT EXISTS ${this.quote(s)};`)
      .join('\n');
  }

  private generateEnumTypes(): string {
    const enums: string[] = [];
    
    this.schema.tables.forEach(table => {
      table.columns.forEach(col => {
        if (col.type === 'enum' && col.enumValues && col.enumValues.length > 0) {
          const typeName = `${table.name}_${col.name}_enum`;
          const values = col.enumValues.map(v => `'${v}'`).join(', ');
          enums.push(`CREATE TYPE ${typeName} AS ENUM (${values});`);
        }
      });
    });

    return enums.length > 0 
      ? `-- Enum Types\n${enums.join('\n')}` 
      : '';
  }

  private generateTables(): string {
    const tables = this.schema.tables.map(table => this.generateTable(table));
    return `-- Tables\n${tables.join('\n\n')}`;
  }

  private generateTable(table: TableDefinition): string {
    const lines: string[] = [];
    const tableName = table.schema 
      ? `${this.quote(table.schema)}.${this.quote(table.name)}`
      : this.quote(table.name);

    // Table comment
    if (table.comment) {
      lines.push(`-- ${table.comment}`);
    }

    lines.push(`CREATE TABLE ${tableName} (`);

    // Columns
    const columnDefs = table.columns.map(col => this.generateColumn(col, table));
    
    // Primary key constraint
    const pkColumns = table.columns.filter(c => c.isPrimaryKey);
    if (pkColumns.length > 0) {
      const pkColNames = pkColumns.map(c => this.quote(c.name)).join(', ');
      columnDefs.push(`  PRIMARY KEY (${pkColNames})`);
    }

    lines.push(columnDefs.join(',\n'));
    lines.push(')' + (this.dialect === 'mysql' ? ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4' : '') + ';');

    // Table and column comments (PostgreSQL style)
    if (this.dialect === 'postgresql') {
      if (table.comment) {
        lines.push(`COMMENT ON TABLE ${tableName} IS '${this.escapeString(table.comment)}';`);
      }
      table.columns.forEach(col => {
        if (col.comment) {
          lines.push(`COMMENT ON COLUMN ${tableName}.${this.quote(col.name)} IS '${this.escapeString(col.comment)}';`);
        }
      });
    }

    return lines.join('\n');
  }

  private generateColumn(column: ColumnDefinition, table: TableDefinition): string {
    const parts: string[] = [];
    
    // Column name
    parts.push(`  ${this.quote(column.name)}`);

    // Data type
    const dataType = this.getColumnType(column, table);
    parts.push(dataType);

    // NOT NULL
    if (!column.isNullable && !column.isPrimaryKey) {
      parts.push('NOT NULL');
    }

    // UNIQUE
    if (column.isUnique && !column.isPrimaryKey) {
      parts.push('UNIQUE');
    }

    // DEFAULT
    if (column.defaultValue !== undefined && column.defaultValue !== null) {
      parts.push(`DEFAULT ${this.formatDefaultValue(column)}`);
    }

    return parts.join(' ');
  }

  private getColumnType(column: ColumnDefinition, table: TableDefinition): string {
    const baseType = typeMapping[this.dialect][column.type];

    // Handle special cases
    if (column.type === 'varchar' || column.type === 'char') {
      const length = column.length || 255;
      return `${baseType}(${length})`;
    }

    if (column.type === 'decimal' || column.type === 'numeric') {
      const precision = column.precision || 10;
      const scale = column.scale || 2;
      return `${baseType}(${precision}, ${scale})`;
    }

    if (column.type === 'enum') {
      if (this.dialect === 'postgresql') {
        return `${table.name}_${column.name}_enum`;
      } else {
        // MySQL ENUM
        const values = (column.enumValues || []).map(v => `'${v}'`).join(', ');
        return `ENUM(${values})`;
      }
    }

    return baseType;
  }

  private formatDefaultValue(column: ColumnDefinition): string {
    const value = column.defaultValue;

    if (value === null) return 'NULL';
    if (typeof value === 'boolean') {
      return this.dialect === 'mysql' ? (value ? '1' : '0') : (value ? 'TRUE' : 'FALSE');
    }
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'string') {
      // Check for SQL functions
      if (value.toUpperCase().includes('CURRENT_TIMESTAMP') ||
          value.toUpperCase().includes('NOW()') ||
          value.toUpperCase().includes('UUID')) {
        return value;
      }
      return `'${this.escapeString(value)}'`;
    }
    return String(value);
  }

  private generateIndexes(): string {
    const indexes: string[] = [];

    this.schema.tables.forEach(table => {
      const tableName = table.schema 
        ? `${this.quote(table.schema)}.${this.quote(table.name)}`
        : this.quote(table.name);

      table.indexes.forEach(index => {
        const unique = index.isUnique ? 'UNIQUE ' : '';
        const columns = index.columns.map(c => this.quote(c)).join(', ');
        
        let indexType = '';
        if (this.dialect === 'postgresql' && index.type && index.type !== 'btree') {
          indexType = ` USING ${index.type.toUpperCase()}`;
        }

        indexes.push(
          `CREATE ${unique}INDEX ${this.quote(index.name)} ON ${tableName}${indexType} (${columns});`
        );
      });
    });

    return indexes.length > 0 
      ? `-- Indexes\n${indexes.join('\n')}` 
      : '';
  }

  private generateForeignKeys(): string {
    const fks: string[] = [];

    this.schema.tables.forEach(table => {
      const tableName = table.schema 
        ? `${this.quote(table.schema)}.${this.quote(table.name)}`
        : this.quote(table.name);

      table.foreignKeys.forEach(fk => {
        const refTable = this.quote(fk.referencedTable);
        const constraint = `ALTER TABLE ${tableName}
  ADD CONSTRAINT ${this.quote(fk.constraintName)}
  FOREIGN KEY (${this.quote(fk.columnName)})
  REFERENCES ${refTable} (${this.quote(fk.referencedColumn)})
  ON DELETE ${fk.onDelete}${fk.onUpdate ? ` ON UPDATE ${fk.onUpdate}` : ''};`;
        fks.push(constraint);
      });
    });

    return fks.length > 0 
      ? `-- Foreign Key Constraints\n${fks.join('\n\n')}` 
      : '';
  }

  private generateJunctionTables(): string {
    const junctions: string[] = [];

    this.schema.relationships
      .filter(r => r.cardinality === 'many-to-many' && r.junctionTable)
      .forEach(rel => {
        const jt = rel.junctionTable!;
        const jtName = this.quote(jt.name);
        
        const sql = `-- Junction table for ${rel.sourceTable} <-> ${rel.targetTable}
CREATE TABLE ${jtName} (
  ${this.quote(jt.sourceColumn)} ${this.dialect === 'postgresql' ? 'INTEGER' : 'INT'} NOT NULL,
  ${this.quote(jt.targetColumn)} ${this.dialect === 'postgresql' ? 'INTEGER' : 'INT'} NOT NULL,
  created_at TIMESTAMP DEFAULT ${this.dialect === 'postgresql' ? 'CURRENT_TIMESTAMP' : 'CURRENT_TIMESTAMP'},
  PRIMARY KEY (${this.quote(jt.sourceColumn)}, ${this.quote(jt.targetColumn)}),
  FOREIGN KEY (${this.quote(jt.sourceColumn)}) REFERENCES ${this.quote(rel.sourceTable)} (${this.quote(rel.sourceColumn)}) ON DELETE CASCADE,
  FOREIGN KEY (${this.quote(jt.targetColumn)}) REFERENCES ${this.quote(rel.targetTable)} (${this.quote(rel.targetColumn)}) ON DELETE CASCADE
)${this.dialect === 'mysql' ? ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4' : ''};`;
        
        junctions.push(sql);
      });

    return junctions.length > 0 
      ? `-- Junction Tables (Many-to-Many)\n${junctions.join('\n\n')}` 
      : '';
  }

  private generateStoredProcedures(): string {
    if (this.schema.storedProcedures.length === 0) return '';

    const procs = this.schema.storedProcedures.map(proc => {
      if (this.dialect === 'postgresql') {
        return this.generatePostgresFunction(proc);
      } else {
        return this.generateMySQLProcedure(proc);
      }
    });

    return `-- Stored Procedures and Functions\n${procs.join('\n\n')}`;
  }

  private generatePostgresFunction(proc: StoredProcedureDefinition): string {
    const params = proc.parameters
      .map(p => `${p.name} ${p.direction !== 'IN' ? p.direction + ' ' : ''}${typeMapping.postgresql[p.type]}`)
      .join(', ');

    const returnType = proc.returnType 
      ? proc.returnType === 'void' 
        ? 'VOID' 
        : proc.returnType === 'table' 
          ? 'TABLE' 
          : typeMapping.postgresql[proc.returnType as ColumnType]
      : 'VOID';

    const language = proc.language || 'plpgsql';

    return `-- ${proc.comment || proc.name}
CREATE OR REPLACE FUNCTION ${this.quote(proc.name)}(${params})
RETURNS ${returnType}
LANGUAGE ${language}
AS $$
${proc.body}
$$;`;
  }

  private generateMySQLProcedure(proc: StoredProcedureDefinition): string {
    const params = proc.parameters
      .map(p => `${p.direction} ${p.name} ${typeMapping.mysql[p.type]}`)
      .join(', ');

    return `-- ${proc.comment || proc.name}
DELIMITER //
CREATE PROCEDURE ${this.quote(proc.name)}(${params})
BEGIN
${proc.body}
END //
DELIMITER ;`;
  }

  private quote(identifier: string): string {
    if (this.dialect === 'postgresql') {
      return `"${identifier}"`;
    } else {
      return `\`${identifier}\``;
    }
  }

  private escapeString(str: string): string {
    return str.replace(/'/g, "''");
  }
}

// Convenience function
export function compileSQL(schema: SchemaDefinition): string {
  const compiler = new SQLCompiler(schema);
  return compiler.compile();
}
