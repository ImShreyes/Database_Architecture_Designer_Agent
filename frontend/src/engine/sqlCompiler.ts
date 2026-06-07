// SQL Compiler - Converts Schema JSON to SQL DDL statements
import type {
  SchemaDefinition,
  TableDefinition,
  ColumnDefinition,
  StoredProcedureDefinition,
  FunctionDefinition,
  ViewDefinition,
  TriggerDefinition,
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
  sqlite: {
    integer: 'INTEGER',
    bigint: 'INTEGER',
    smallint: 'INTEGER',
    serial: 'INTEGER',  // SQLite uses INTEGER PRIMARY KEY for auto-increment
    bigserial: 'INTEGER',
    varchar: 'TEXT',
    text: 'TEXT',
    char: 'TEXT',
    boolean: 'INTEGER',
    date: 'TEXT',
    timestamp: 'TEXT',
    timestamptz: 'TEXT',
    time: 'TEXT',
    decimal: 'REAL',
    numeric: 'REAL',
    float: 'REAL',
    double: 'REAL',
    json: 'TEXT',
    jsonb: 'TEXT',
    uuid: 'TEXT',
    blob: 'BLOB',
    enum: 'TEXT',
  },
  sqlserver: {
    integer: 'INT',
    bigint: 'BIGINT',
    smallint: 'SMALLINT',
    serial: 'INT IDENTITY(1,1)',
    bigserial: 'BIGINT IDENTITY(1,1)',
    varchar: 'NVARCHAR',
    text: 'NVARCHAR(MAX)',
    char: 'NCHAR',
    boolean: 'BIT',
    date: 'DATE',
    timestamp: 'DATETIME2',
    timestamptz: 'DATETIMEOFFSET',
    time: 'TIME',
    decimal: 'DECIMAL',
    numeric: 'NUMERIC',
    float: 'FLOAT',
    double: 'FLOAT(53)',
    json: 'NVARCHAR(MAX)',
    jsonb: 'NVARCHAR(MAX)',
    uuid: 'UNIQUEIDENTIFIER',
    blob: 'VARBINARY(MAX)',
    enum: 'NVARCHAR(50)',
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

    // Transaction start
    if (this.dialect !== 'mysql') {
      sections.push('BEGIN;');
    }

    // Create schema (PostgreSQL only)
    if (this.dialect === 'postgresql' && this.schema.tables.some(t => t.schema)) {
      sections.push(this.generateSchemaStatements());
    }

    // Create enum types (PostgreSQL only)
    if (this.dialect === 'postgresql') {
      const enumSection = this.generateEnumTypes();
      if (enumSection) sections.push(enumSection);
    }

    // Drop existing tables (reverse order for FK dependencies)
    const dropSection = this.generateDropStatements();
    if (dropSection) sections.push(dropSection);

    // Create tables
    sections.push(this.generateTables());

    // Create indexes
    const indexSection = this.generateIndexes();
    if (indexSection) sections.push(indexSection);

    // Create foreign key constraints (after all tables exist)
    const fkSection = this.generateForeignKeys();
    if (fkSection) sections.push(fkSection);

    // Create check constraints
    const checkSection = this.generateCheckConstraints();
    if (checkSection) sections.push(checkSection);

    // Create junction tables for many-to-many relationships
    const junctionSection = this.generateJunctionTables();
    if (junctionSection) sections.push(junctionSection);

    // Create functions (before procedures/triggers that may reference them)
    const fnSection = this.generateFunctions();
    if (fnSection) sections.push(fnSection);

    // Create stored procedures
    const procSection = this.generateStoredProcedures();
    if (procSection) sections.push(procSection);

    // Create views (after tables exist)
    const viewSection = this.generateViews();
    if (viewSection) sections.push(viewSection);

    // Create triggers (after functions and tables exist)
    const triggerSection = this.generateTriggers();
    if (triggerSection) sections.push(triggerSection);

    // Transaction end
    if (this.dialect !== 'mysql') {
      sections.push('COMMIT;');
    }

    return sections.filter(s => s.trim()).join('\n\n');
  }

  private generateHeader(): string {
    const dialectNames: Record<SQLDialect, string> = {
      postgresql: 'PostgreSQL',
      mysql: 'MySQL',
      sqlite: 'SQLite',
      sqlserver: 'SQL Server',
    };
    return `-- ============================================
-- Database Schema: ${this.schema.name}
-- Dialect: ${dialectNames[this.dialect]}
-- Generated: ${new Date().toISOString()}
-- Description: ${this.schema.description || 'Auto-generated schema'}
-- Tables: ${this.schema.tables.length}
-- Views: ${this.schema.views?.length || 0}
-- Functions: ${this.schema.functions?.length || 0}
-- Stored Procedures: ${this.schema.storedProcedures?.length || 0}
-- Triggers: ${this.schema.triggers?.length || 0}
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
          enums.push(`DO $$ BEGIN\n  CREATE TYPE ${typeName} AS ENUM (${values});\nEXCEPTION\n  WHEN duplicate_object THEN NULL;\nEND $$;`);
        }
      });
    });

    return enums.length > 0 
      ? `-- Enum Types\n${enums.join('\n\n')}` 
      : '';
  }

  private generateDropStatements(): string {
    const drops: string[] = [];

    // Drop views first
    if (this.schema.views?.length) {
      this.schema.views.forEach(view => {
        const viewName = view.schema
          ? `${this.quote(view.schema)}.${this.quote(view.name)}`
          : this.quote(view.name);
        if (view.isMaterialized && this.dialect === 'postgresql') {
          drops.push(`DROP MATERIALIZED VIEW IF EXISTS ${viewName} CASCADE;`);
        } else {
          drops.push(`DROP VIEW IF EXISTS ${viewName} CASCADE;`);
        }
      });
    }

    // Drop tables in reverse order (to handle FK dependencies)
    const reversedTables = [...this.schema.tables].reverse();
    reversedTables.forEach(table => {
      const tableName = table.schema
        ? `${this.quote(table.schema)}.${this.quote(table.name)}`
        : this.quote(table.name);
      if (this.dialect === 'sqlserver') {
        drops.push(`IF OBJECT_ID('${table.name}', 'U') IS NOT NULL DROP TABLE ${tableName};`);
      } else {
        drops.push(`DROP TABLE IF EXISTS ${tableName} CASCADE;`);
      }
    });

    return drops.length > 0
      ? `-- Drop existing objects (for re-runnability)\n${drops.join('\n')}`
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
      columnDefs.push(`  CONSTRAINT ${this.quote(`pk_${table.name}`)} PRIMARY KEY (${pkColNames})`);
    }

    // Inline check constraints for non-PostgreSQL (where ALTER TABLE is less common)
    if (this.dialect === 'sqlite' && table.checkConstraints?.length) {
      table.checkConstraints.forEach(chk => {
        columnDefs.push(`  CONSTRAINT ${this.quote(chk.name)} CHECK (${chk.expression})`);
      });
    }

    lines.push(columnDefs.join(',\n'));

    const engineSuffix = this.dialect === 'mysql' ? ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4' : '';
    lines.push(`)${engineSuffix};`);

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

    // MySQL table/column comments are inline, so handled in generateColumn for mysql

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

    // MySQL inline comment
    if (this.dialect === 'mysql' && column.comment) {
      parts.push(`COMMENT '${this.escapeString(column.comment)}'`);
    }

    return parts.join(' ');
  }

  private getColumnType(column: ColumnDefinition, table: TableDefinition): string {
    const baseType = typeMapping[this.dialect]?.[column.type] || column.type.toUpperCase();

    // Handle special cases
    if (column.type === 'varchar' || column.type === 'char') {
      if (this.dialect === 'sqlite') return 'TEXT';
      const length = column.length || 255;
      return `${baseType}(${length})`;
    }

    if (column.type === 'decimal' || column.type === 'numeric') {
      if (this.dialect === 'sqlite') return 'REAL';
      const precision = column.precision || 10;
      const scale = column.scale || 2;
      return `${baseType}(${precision}, ${scale})`;
    }

    if (column.type === 'enum') {
      if (this.dialect === 'postgresql') {
        return `${table.name}_${column.name}_enum`;
      } else if (this.dialect === 'mysql') {
        const values = (column.enumValues || []).map(v => `'${v}'`).join(', ');
        return `ENUM(${values})`;
      } else {
        // SQLite/SQL Server: use CHECK constraint approach
        return baseType;
      }
    }

    return baseType;
  }

  private formatDefaultValue(column: ColumnDefinition): string {
    const value = column.defaultValue;

    if (value === null) return 'NULL';
    if (typeof value === 'boolean') {
      if (this.dialect === 'mysql') return value ? '1' : '0';
      if (this.dialect === 'sqlite') return value ? '1' : '0';
      return value ? 'TRUE' : 'FALSE';
    }
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'string') {
      // Check for SQL functions
      const upper = value.toUpperCase();
      if (upper.includes('CURRENT_TIMESTAMP') ||
          upper.includes('NOW()') ||
          upper.includes('UUID') ||
          upper.includes('GEN_RANDOM') ||
          upper.includes('GETDATE') ||
          upper.includes('NEWID')) {
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
          `CREATE ${unique}INDEX IF NOT EXISTS ${this.quote(index.name)} ON ${tableName}${indexType} (${columns});`
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

  private generateCheckConstraints(): string {
    const checks: string[] = [];

    this.schema.tables.forEach(table => {
      if (!table.checkConstraints?.length) return;
      if (this.dialect === 'sqlite') return; // Already inline for SQLite

      const tableName = table.schema
        ? `${this.quote(table.schema)}.${this.quote(table.name)}`
        : this.quote(table.name);

      table.checkConstraints.forEach(chk => {
        checks.push(`ALTER TABLE ${tableName}\n  ADD CONSTRAINT ${this.quote(chk.name)} CHECK (${chk.expression});`);
      });
    });

    return checks.length > 0
      ? `-- Check Constraints\n${checks.join('\n\n')}`
      : '';
  }

  private generateJunctionTables(): string {
    const junctions: string[] = [];

    this.schema.relationships
      .filter(r => r.cardinality === 'many-to-many' && r.junctionTable)
      .forEach(rel => {
        const jt = rel.junctionTable!;
        // Skip if junction table already exists in tables array
        if (this.schema.tables.some(t => t.name === jt.name)) return;

        const jtName = this.quote(jt.name);
        const intType = this.dialect === 'postgresql' ? 'INTEGER' : 
                        this.dialect === 'sqlserver' ? 'INT' :
                        this.dialect === 'sqlite' ? 'INTEGER' : 'INT';
        const defaultTs = this.dialect === 'sqlserver' ? 'GETDATE()' : 'CURRENT_TIMESTAMP';
        
        const sql = `-- Junction table for ${rel.sourceTable} <-> ${rel.targetTable}
CREATE TABLE ${jtName} (
  ${this.quote(jt.sourceColumn)} ${intType} NOT NULL,
  ${this.quote(jt.targetColumn)} ${intType} NOT NULL,
  ${this.quote('created_at')} ${typeMapping[this.dialect].timestamp} DEFAULT ${defaultTs},
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

  // ==================== Functions ====================

  private generateFunctions(): string {
    if (!this.schema.functions?.length) return '';

    const fns = this.schema.functions.map(fn => {
      if (this.dialect === 'postgresql') {
        return this.generatePostgresFunction(fn);
      } else if (this.dialect === 'mysql') {
        return this.generateMySQLFunction(fn);
      } else if (this.dialect === 'sqlserver') {
        return this.generateSQLServerFunction(fn);
      }
      // SQLite doesn't support user-defined functions via SQL
      return `-- Function ${fn.name}: Not supported in SQLite (requires application-level UDF)`;
    });

    return `-- Functions\n${fns.join('\n\n')}`;
  }

  private generatePostgresFunction(fn: FunctionDefinition): string {
    const params = fn.parameters
      .map(p => `${p.name} ${typeMapping.postgresql[p.type] || p.type.toUpperCase()}`)
      .join(', ');

    const returnType = this.mapReturnType(fn.returnType, 'postgresql');
    const language = fn.language || 'plpgsql';

    return `-- ${fn.comment || fn.name}
CREATE OR REPLACE FUNCTION ${this.quote(fn.name)}(${params})
RETURNS ${returnType}
LANGUAGE ${language}
${fn.isDeterministic ? 'IMMUTABLE' : 'VOLATILE'}
AS $$
${fn.body}
$$;`;
  }

  private generateMySQLFunction(fn: FunctionDefinition): string {
    const params = fn.parameters
      .map(p => `${p.name} ${typeMapping.mysql[p.type] || p.type.toUpperCase()}`)
      .join(', ');

    const returnType = this.mapReturnType(fn.returnType, 'mysql');
    const deterministic = fn.isDeterministic ? 'DETERMINISTIC' : 'NOT DETERMINISTIC';

    return `-- ${fn.comment || fn.name}
DELIMITER //
CREATE FUNCTION ${this.quote(fn.name)}(${params})
RETURNS ${returnType}
${deterministic}
BEGIN
${fn.body}
END //
DELIMITER ;`;
  }

  private generateSQLServerFunction(fn: FunctionDefinition): string {
    const params = fn.parameters
      .map(p => `@${p.name} ${typeMapping.sqlserver[p.type] || p.type.toUpperCase()}`)
      .join(', ');

    const returnType = this.mapReturnType(fn.returnType, 'sqlserver');

    return `-- ${fn.comment || fn.name}
CREATE OR ALTER FUNCTION ${this.quote(fn.name)}(${params})
RETURNS ${returnType}
AS
BEGIN
${fn.body}
END;`;
  }

  // ==================== Stored Procedures ====================

  private generateStoredProcedures(): string {
    if (!this.schema.storedProcedures?.length) return '';

    const procs = this.schema.storedProcedures.map(proc => {
      if (this.dialect === 'postgresql') {
        return this.generatePostgresProcedure(proc);
      } else if (this.dialect === 'mysql') {
        return this.generateMySQLProcedure(proc);
      } else if (this.dialect === 'sqlserver') {
        return this.generateSQLServerProcedure(proc);
      }
      return `-- Procedure ${proc.name}: Not supported in SQLite`;
    });

    return `-- Stored Procedures\n${procs.join('\n\n')}`;
  }

  private generatePostgresProcedure(proc: StoredProcedureDefinition): string {
    const params = proc.parameters
      .map(p => `${p.direction !== 'IN' ? p.direction + ' ' : ''}${p.name} ${typeMapping.postgresql[p.type] || p.type.toUpperCase()}`)
      .join(', ');

    const returnType = proc.returnType 
      ? this.mapReturnType(proc.returnType, 'postgresql')
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
      .map(p => `${p.direction} ${p.name} ${typeMapping.mysql[p.type] || p.type.toUpperCase()}`)
      .join(', ');

    return `-- ${proc.comment || proc.name}
DELIMITER //
CREATE PROCEDURE ${this.quote(proc.name)}(${params})
BEGIN
${proc.body}
END //
DELIMITER ;`;
  }

  private generateSQLServerProcedure(proc: StoredProcedureDefinition): string {
    const params = proc.parameters
      .map(p => `@${p.name} ${typeMapping.sqlserver[p.type] || p.type.toUpperCase()}${p.direction === 'OUT' || p.direction === 'INOUT' ? ' OUTPUT' : ''}`)
      .join(', ');

    return `-- ${proc.comment || proc.name}
CREATE OR ALTER PROCEDURE ${this.quote(proc.name)}
  ${params}
AS
BEGIN
  SET NOCOUNT ON;
${proc.body}
END;`;
  }

  // ==================== Views ====================

  private generateViews(): string {
    if (!this.schema.views?.length) return '';

    const views = this.schema.views.map(view => {
      const viewName = view.schema
        ? `${this.quote(view.schema)}.${this.quote(view.name)}`
        : this.quote(view.name);

      const lines: string[] = [];
      if (view.comment) {
        lines.push(`-- ${view.comment}`);
      }

      if (view.isMaterialized && this.dialect === 'postgresql') {
        lines.push(`CREATE MATERIALIZED VIEW ${viewName} AS`);
      } else if (this.dialect === 'sqlserver') {
        lines.push(`CREATE OR ALTER VIEW ${viewName} AS`);
      } else {
        lines.push(`CREATE OR REPLACE VIEW ${viewName} AS`);
      }

      lines.push(`${view.query};`);

      // Add comment for PostgreSQL
      if (this.dialect === 'postgresql' && view.comment) {
        const viewType = view.isMaterialized ? 'MATERIALIZED VIEW' : 'VIEW';
        lines.push(`COMMENT ON ${viewType} ${viewName} IS '${this.escapeString(view.comment)}';`);
      }

      return lines.join('\n');
    });

    return `-- Views\n${views.join('\n\n')}`;
  }

  // ==================== Triggers ====================

  private generateTriggers(): string {
    if (!this.schema.triggers?.length) return '';

    const triggers = this.schema.triggers.map(trigger => {
      if (this.dialect === 'postgresql') {
        return this.generatePostgresTrigger(trigger);
      } else if (this.dialect === 'mysql') {
        return this.generateMySQLTrigger(trigger);
      } else if (this.dialect === 'sqlserver') {
        return this.generateSQLServerTrigger(trigger);
      } else if (this.dialect === 'sqlite') {
        return this.generateSQLiteTrigger(trigger);
      }
      return '';
    });

    return `-- Triggers\n${triggers.join('\n\n')}`;
  }

  private generatePostgresTrigger(trigger: TriggerDefinition): string {
    const lines: string[] = [];
    if (trigger.comment) {
      lines.push(`-- ${trigger.comment}`);
    }

    // If there's a function body but no functionName, create the trigger function
    if (trigger.body && !trigger.functionName) {
      const fnName = `fn_${trigger.name}`;
      lines.push(`CREATE OR REPLACE FUNCTION ${this.quote(fnName)}()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  ${trigger.body}
END;
$$;`);
      lines.push('');

      lines.push(`CREATE OR REPLACE TRIGGER ${this.quote(trigger.name)}`);
      lines.push(`  ${trigger.timing} ${trigger.event}`);
      lines.push(`  ON ${this.quote(trigger.tableName)}`);
      lines.push(`  FOR EACH ${trigger.forEachRow !== false ? 'ROW' : 'STATEMENT'}`);
      if (trigger.condition) {
        lines.push(`  WHEN (${trigger.condition})`);
      }
      lines.push(`  EXECUTE FUNCTION ${this.quote(fnName)}();`);
    } else {
      const fnRef = trigger.functionName || `fn_${trigger.name}`;
      lines.push(`CREATE OR REPLACE TRIGGER ${this.quote(trigger.name)}`);
      lines.push(`  ${trigger.timing} ${trigger.event}`);
      lines.push(`  ON ${this.quote(trigger.tableName)}`);
      lines.push(`  FOR EACH ${trigger.forEachRow !== false ? 'ROW' : 'STATEMENT'}`);
      if (trigger.condition) {
        lines.push(`  WHEN (${trigger.condition})`);
      }
      lines.push(`  EXECUTE FUNCTION ${this.quote(fnRef)}();`);
    }

    return lines.join('\n');
  }

  private generateMySQLTrigger(trigger: TriggerDefinition): string {
    const lines: string[] = [];
    if (trigger.comment) {
      lines.push(`-- ${trigger.comment}`);
    }

    lines.push('DELIMITER //');
    lines.push(`CREATE TRIGGER ${this.quote(trigger.name)}`);
    lines.push(`  ${trigger.timing} ${trigger.event}`);
    lines.push(`  ON ${this.quote(trigger.tableName)}`);
    lines.push(`  FOR EACH ROW`);
    lines.push(`BEGIN`);
    lines.push(`  ${trigger.body}`);
    lines.push(`END //`);
    lines.push('DELIMITER ;');

    return lines.join('\n');
  }

  private generateSQLServerTrigger(trigger: TriggerDefinition): string {
    const lines: string[] = [];
    if (trigger.comment) {
      lines.push(`-- ${trigger.comment}`);
    }

    lines.push(`CREATE OR ALTER TRIGGER ${this.quote(trigger.name)}`);
    lines.push(`  ON ${this.quote(trigger.tableName)}`);
    lines.push(`  ${trigger.timing === 'INSTEAD OF' ? 'INSTEAD OF' : 'AFTER'} ${trigger.event}`);
    lines.push(`AS`);
    lines.push(`BEGIN`);
    lines.push(`  SET NOCOUNT ON;`);
    lines.push(`  ${trigger.body}`);
    lines.push(`END;`);

    return lines.join('\n');
  }

  private generateSQLiteTrigger(trigger: TriggerDefinition): string {
    const lines: string[] = [];
    if (trigger.comment) {
      lines.push(`-- ${trigger.comment}`);
    }

    lines.push(`CREATE TRIGGER IF NOT EXISTS ${this.quote(trigger.name)}`);
    lines.push(`  ${trigger.timing} ${trigger.event}`);
    lines.push(`  ON ${this.quote(trigger.tableName)}`);
    lines.push(`  FOR EACH ROW`);
    if (trigger.condition) {
      lines.push(`  WHEN ${trigger.condition}`);
    }
    lines.push(`BEGIN`);
    lines.push(`  ${trigger.body}`);
    lines.push(`END;`);

    return lines.join('\n');
  }

  // ==================== Helpers ====================

  private mapReturnType(returnType: string, dialect: SQLDialect): string {
    if (returnType === 'void') return 'VOID';
    if (returnType === 'table') return 'TABLE';
    if (returnType === 'boolean') {
      return dialect === 'mysql' ? 'TINYINT(1)' : 
             dialect === 'sqlserver' ? 'BIT' : 'BOOLEAN';
    }
    if (returnType === 'trigger') return 'TRIGGER';
    return typeMapping[dialect]?.[returnType as ColumnType] || returnType.toUpperCase();
  }

  private quote(identifier: string): string {
    if (this.dialect === 'postgresql') {
      return `"${identifier}"`;
    } else if (this.dialect === 'sqlserver') {
      return `[${identifier}]`;
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
