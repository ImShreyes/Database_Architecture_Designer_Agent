from typing import List, Optional, Union, Literal
from pydantic import BaseModel, Field
from datetime import datetime

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
    indexes: List[IndexDefinition] 
    foreignKeys: List[ForeignKeyDefinition] 
    comment: Optional[str] = None 

    class Config:
        populate_by_name = True

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

class ProcedureParameter(BaseModel):
    name: str 
    type: ColumnType 
    direction: Literal["IN", "OUT", "INOUT"] 
    defaultValue: Optional[str] = None 

class StoredProcedureDefinition(BaseModel):
    id: str 
    name: str 
    parameters: List[ProcedureParameter] 
    returnType: Optional[Union[ColumnType, Literal["void", "table"]]] = None
    body: str 
    language: Optional[Literal["sql", "plpgsql", "plsql"]] = None 
    comment: Optional[str] = None 

class SchemaDefinition(BaseModel):
    id: str 
    name: str 
    description: str 
    dialect: SQLDialect 
    tables: List[TableDefinition] 
    relationships: List[RelationshipDefinition] 
    storedProcedures: List[StoredProcedureDefinition] 
    createdAt: str 
    updatedAt: str 

class GenerateSchemaRequest(BaseModel):
    prompt: str 
    dialect: SQLDialect 
    additionalContext: Optional[str] = None 

class GenerateSchemaResponse(BaseModel):
    schema_data: Optional[SchemaDefinition] = Field(None, alias="schema") 
    success: bool 
    error: Optional[str] = None 

    class Config:
        populate_by_name = True
