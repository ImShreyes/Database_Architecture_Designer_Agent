from typing import List, Optional, Union, Literal
from pydantic import BaseModel, Field

# Types matching frontend
SQLDialect = Literal["mysql", "postgresql", "sqlite", "sqlserver"]
ColumnType = Literal[
    "integer", "bigint", "smallint", "serial", "bigserial",
    "varchar", "text", "char", "boolean", "date", "timestamp",
    "timestamptz", "time", "decimal", "numeric", "float",
    "double", "json", "jsonb", "uuid", "blob", "enum"
]
Cardinality = Literal["one-to-one", "one-to-many", "many-to-many"]
OnDeleteAction = Literal["CASCADE", "SET NULL", "SET DEFAULT", "RESTRICT", "NO ACTION"]

# ==================== Column & Index Definitions ====================

class ColumnDefinition(BaseModel):
    id: str  
    name: str 
    type: ColumnType
    length: Optional[int] = None
    precision: Optional[int] = None
    scale: Optional[int] = None
    isPrimaryKey: bool
    isNullable: bool
    isUnique: bool
    defaultValue: Optional[Union[str, int, bool]] = None
    enumValues: Optional[List[str]] = None
    comment: Optional[str] = None

class IndexDefinition(BaseModel):
    id: str
    name: str 
    columns: List[str] 
    isUnique: bool 
    type: Optional[Literal["btree", "hash", "gin", "gist"]] = None 

class CheckConstraintDefinition(BaseModel):
    id: str
    name: str
    expression: str  # e.g., "amount > 0" or "status IN ('active', 'inactive')"
    comment: Optional[str] = None

# ==================== Foreign Key & Table Definitions ====================

class ForeignKeyDefinition(BaseModel):
    id: str 
    constraintName: str 
    columnName: str 
    referencedTable: str 
    referencedColumn: str 
    onDelete: OnDeleteAction 
    onUpdate: Optional[OnDeleteAction] = None 

class TableDefinition(BaseModel):
    id: str 
    name: str 
    schema_name: Optional[str] = Field(None, alias="schema") 
    columns: List[ColumnDefinition] 
    indexes: List[IndexDefinition] = []
    foreignKeys: List[ForeignKeyDefinition] = []
    checkConstraints: List[CheckConstraintDefinition] = []
    comment: Optional[str] = None 

    class Config:
        populate_by_name = True

# ==================== Relationship Definition ====================

class JunctionTable(BaseModel):
    name: str 
    sourceColumn: str 
    targetColumn: str 

class RelationshipDefinition(BaseModel):
    id: str 
    name: str 
    sourceTable: str 
    sourceColumn: str 
    targetTable: str 
    targetColumn: str 
    cardinality: Cardinality 
    onDelete: OnDeleteAction 
    junctionTable: Optional[JunctionTable] = None 

# ==================== Stored Procedure Definition ====================

class ProcedureParameter(BaseModel):
    name: str 
    type: ColumnType 
    direction: Literal["IN", "OUT", "INOUT"] 
    defaultValue: Optional[str] = None 

class StoredProcedureDefinition(BaseModel):
    id: str 
    name: str 
    parameters: List[ProcedureParameter] = []
    returnType: Optional[Union[ColumnType, Literal["void", "table"]]] = None
    body: str 
    language: Optional[Literal["sql", "plpgsql", "plsql"]] = None 
    comment: Optional[str] = None 

# ==================== Function Definition ====================

class FunctionParameter(BaseModel):
    name: str
    type: ColumnType
    defaultValue: Optional[str] = None

class FunctionDefinition(BaseModel):
    id: str
    name: str
    parameters: List[FunctionParameter] = []
    returnType: Union[ColumnType, Literal["void", "table", "boolean", "trigger"]]
    body: str  # SQL function body
    language: Optional[Literal["sql", "plpgsql", "plsql", "tsql"]] = None
    isDeterministic: bool = False  # For MySQL optimization hints
    comment: Optional[str] = None

# ==================== View Definition ====================

class ViewDefinition(BaseModel):
    id: str
    name: str
    schema_name: Optional[str] = Field(None, alias="schema")
    query: str  # The SELECT statement that defines the view
    isMaterialized: bool = False  # PostgreSQL materialized views
    columns: Optional[List[str]] = None  # Optional explicit column list
    comment: Optional[str] = None

    class Config:
        populate_by_name = True

# ==================== Trigger Definition ====================

class TriggerDefinition(BaseModel):
    id: str
    name: str
    tableName: str  # The table the trigger is attached to
    timing: Literal["BEFORE", "AFTER", "INSTEAD OF"]
    event: Literal["INSERT", "UPDATE", "DELETE"]  # Single event per trigger for clarity
    forEachRow: bool = True
    body: str  # The trigger function body or inline SQL
    functionName: Optional[str] = None  # PostgreSQL: references a function
    condition: Optional[str] = None  # Optional WHEN condition
    comment: Optional[str] = None

# ==================== Full Schema Definition ====================

class SchemaDefinition(BaseModel):
    id: str 
    name: str 
    description: str 
    dialect: SQLDialect 
    tables: List[TableDefinition] 
    relationships: List[RelationshipDefinition] 
    storedProcedures: List[StoredProcedureDefinition] = []
    functions: List[FunctionDefinition] = []
    views: List[ViewDefinition] = []
    triggers: List[TriggerDefinition] = []
    createdAt: str 
    updatedAt: str 

# ==================== API Request/Response ====================

class GenerateSchemaRequest(BaseModel):
    prompt: str 
    dialect: SQLDialect 
    additionalContext: Optional[str] = None
    complexityLevel: Optional[Literal["simple", "standard", "enterprise"]] = "standard"

class RefineSchemaRequest(BaseModel):
    schema_data: SchemaDefinition = Field(..., alias="schema")
    refinementPrompt: str

    class Config:
        populate_by_name = True

class GenerateSchemaResponse(BaseModel):
    schema_data: Optional[SchemaDefinition] = Field(None, alias="schema") 
    success: bool 
    error: Optional[str] = None
    warnings: Optional[List[str]] = None  # Validation warnings

    class Config:
        populate_by_name = True
