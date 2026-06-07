// Schema Intermediate Representation (IR) Types
// This is the core data structure that the AI generates and the UI manipulates

export type SQLDialect = "mysql" | "postgresql" | "sqlite" | "sqlserver";

export type ColumnType =
  | "integer"
  | "bigint"
  | "smallint"
  | "serial"
  | "bigserial"
  | "varchar"
  | "text"
  | "char"
  | "boolean"
  | "date"
  | "timestamp"
  | "timestamptz"
  | "time"
  | "decimal"
  | "numeric"
  | "float"
  | "double"
  | "json"
  | "jsonb"
  | "uuid"
  | "blob"
  | "enum";

export type Cardinality = "one-to-one" | "one-to-many" | "many-to-many";

export type OnDeleteAction =
  | "CASCADE"
  | "SET NULL"
  | "SET DEFAULT"
  | "RESTRICT"
  | "NO ACTION";

// ==================== Column & Index Definitions ====================

export interface ColumnDefinition {
  id: string;
  name: string;
  type: ColumnType;
  length?: number; // For varchar, char
  precision?: number; // For decimal, numeric
  scale?: number; // For decimal, numeric
  isPrimaryKey: boolean;
  isNullable: boolean;
  isUnique: boolean;
  defaultValue?: string | number | boolean | null;
  enumValues?: string[]; // For enum type
  comment?: string;
}

export interface IndexDefinition {
  id: string;
  name: string;
  columns: string[]; // Column names
  isUnique: boolean;
  type?: "btree" | "hash" | "gin" | "gist"; // PostgreSQL specific
}

export interface CheckConstraintDefinition {
  id: string;
  name: string;
  expression: string; // e.g., "amount > 0"
  comment?: string;
}

// ==================== Foreign Key & Table Definitions ====================

export interface ForeignKeyDefinition {
  id: string;
  constraintName: string;
  columnName: string;
  referencedTable: string;
  referencedColumn: string;
  onDelete: OnDeleteAction;
  onUpdate?: OnDeleteAction;
}

export interface TableDefinition {
  id: string;
  name: string;
  schema?: string; // For PostgreSQL schemas
  columns: ColumnDefinition[];
  indexes: IndexDefinition[];
  foreignKeys: ForeignKeyDefinition[];
  checkConstraints?: CheckConstraintDefinition[];
  comment?: string;
}

// ==================== Relationship Definition ====================

export interface RelationshipDefinition {
  id: string;
  name: string; // Descriptive name like "user_writes_posts"
  sourceTable: string;
  sourceColumn: string;
  targetTable: string;
  targetColumn: string;
  cardinality: Cardinality;
  onDelete: OnDeleteAction;
  // For many-to-many, this defines the junction table
  junctionTable?: {
    name: string;
    sourceColumn: string;
    targetColumn: string;
  };
}

// ==================== Stored Procedure Definition ====================

export interface ProcedureParameter {
  name: string;
  type: ColumnType;
  direction: "IN" | "OUT" | "INOUT";
  defaultValue?: string;
}

export interface StoredProcedureDefinition {
  id: string;
  name: string;
  parameters: ProcedureParameter[];
  returnType?: ColumnType | "void" | "table";
  body: string; // SQL body
  language?: "sql" | "plpgsql" | "plsql"; // For PostgreSQL
  comment?: string;
}

// ==================== Function Definition ====================

export interface FunctionParameter {
  name: string;
  type: ColumnType;
  defaultValue?: string;
}

export interface FunctionDefinition {
  id: string;
  name: string;
  parameters: FunctionParameter[];
  returnType: ColumnType | "void" | "table" | "boolean" | "trigger";
  body: string; // SQL function body
  language?: "sql" | "plpgsql" | "plsql" | "tsql";
  isDeterministic?: boolean; // MySQL optimization hint
  comment?: string;
}

// ==================== View Definition ====================

export interface ViewDefinition {
  id: string;
  name: string;
  schema?: string; // For PostgreSQL schemas
  query: string; // The SELECT statement defining the view
  isMaterialized?: boolean; // PostgreSQL materialized views
  columns?: string[]; // Optional explicit column list
  comment?: string;
}

// ==================== Trigger Definition ====================

export interface TriggerDefinition {
  id: string;
  name: string;
  tableName: string; // The table the trigger is attached to
  timing: "BEFORE" | "AFTER" | "INSTEAD OF";
  event: "INSERT" | "UPDATE" | "DELETE";
  forEachRow?: boolean;
  body: string; // Trigger function body or inline SQL
  functionName?: string; // PostgreSQL: references a function
  condition?: string; // Optional WHEN condition
  comment?: string;
}

// ==================== Full Schema Definition ====================

export interface SchemaDefinition {
  id: string;
  name: string;
  description: string;
  dialect: SQLDialect;
  tables: TableDefinition[];
  relationships: RelationshipDefinition[];
  storedProcedures: StoredProcedureDefinition[];
  functions: FunctionDefinition[];
  views: ViewDefinition[];
  triggers: TriggerDefinition[];
  createdAt: string;
  updatedAt: string;
}

// ==================== UI State Types ====================

export interface SchemaState {
  schema: SchemaDefinition | null;
  compiledSQL: string;
  compiledMermaid: string;
  isLoading: boolean;
  error: string | null;
  selectedTableId: string | null;
  selectedRelationshipId: string | null;
}

// ==================== API Request/Response Types ====================

export interface GenerateSchemaRequest {
  prompt: string;
  dialect: SQLDialect;
  additionalContext?: string;
  complexityLevel?: "simple" | "standard" | "enterprise";
}

export interface RefineSchemaRequest {
  schema: SchemaDefinition;
  refinementPrompt: string;
}

export interface GenerateSchemaResponse {
  schema: SchemaDefinition;
  success: boolean;
  error?: string;
  warnings?: string[];
}

// ==================== Utility Functions ====================

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function createEmptySchema(
  dialect: SQLDialect = "postgresql",
): SchemaDefinition {
  return {
    id: generateId(),
    name: "New Schema",
    description: "",
    dialect,
    tables: [],
    relationships: [],
    storedProcedures: [],
    functions: [],
    views: [],
    triggers: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
