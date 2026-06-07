"""
Schema Validator & Repair Service

Post-processes LLM-generated schemas to fix common issues:
- Missing created_at/updated_at columns
- Missing indexes for foreign key columns
- Orphan foreign key references
- Missing UUIDs/IDs
- Duplicate table names
- Relationship inference from FKs
"""

import uuid
from typing import List, Dict, Any, Optional, Tuple
from core.models import (
    SchemaDefinition, TableDefinition, ColumnDefinition,
    IndexDefinition, ForeignKeyDefinition, RelationshipDefinition,
    CheckConstraintDefinition
)


class SchemaValidator:
    """Validates and repairs LLM-generated schemas."""
    
    def __init__(self):
        self.warnings: List[str] = []

    def validate_and_repair(self, schema_dict: dict) -> Tuple[dict, List[str]]:
        """
        Main entry point. Takes a raw schema dict from LLM and returns
        a cleaned, validated version with a list of warnings.
        """
        self.warnings = []
        
        # Ensure all required top-level fields exist
        schema_dict = self._ensure_top_level_fields(schema_dict)
        
        # Deduplicate tables
        schema_dict = self._deduplicate_tables(schema_dict)
        
        # Fix all tables
        table_names = set()
        for table in schema_dict.get("tables", []):
            self._ensure_table_fields(table)
            self._ensure_audit_columns(table)
            self._ensure_primary_key(table)
            self._auto_generate_fk_indexes(table)
            self._fill_missing_ids(table)
            table_names.add(table.get("name", ""))
        
        # Validate FK references
        self._validate_fk_references(schema_dict, table_names)
        
        # Infer missing relationships from FKs
        self._infer_relationships(schema_dict)
        
        # Fill missing IDs in all collections
        for key in ["relationships", "storedProcedures", "functions", "views", "triggers"]:
            for item in schema_dict.get(key, []):
                if not item.get("id"):
                    item["id"] = str(uuid.uuid4())
        
        return schema_dict, self.warnings

    def _ensure_top_level_fields(self, schema: dict) -> dict:
        """Ensure all top-level fields exist with sensible defaults."""
        defaults = {
            "id": str(uuid.uuid4()),
            "name": "Generated Schema",
            "description": "AI-generated database schema",
            "tables": [],
            "relationships": [],
            "storedProcedures": [],
            "functions": [],
            "views": [],
            "triggers": [],
        }
        
        for key, default_val in defaults.items():
            if key not in schema or schema[key] is None:
                schema[key] = default_val
                if key not in ("id", "name", "description"):
                    self.warnings.append(f"Missing '{key}' field — added empty default")
        
        return schema

    def _deduplicate_tables(self, schema: dict) -> dict:
        """Remove duplicate table definitions (by name)."""
        seen = {}
        unique_tables = []
        
        for table in schema.get("tables", []):
            name = table.get("name", "").lower()
            if name in seen:
                self.warnings.append(f"Duplicate table '{name}' removed")
            else:
                seen[name] = True
                unique_tables.append(table)
        
        schema["tables"] = unique_tables
        return schema

    def _ensure_table_fields(self, table: dict):
        """Ensure a table has all required sub-arrays."""
        if "columns" not in table or not table["columns"]:
            table["columns"] = []
            self.warnings.append(f"Table '{table.get('name', '?')}' has no columns")
        
        if "indexes" not in table:
            table["indexes"] = []
        if "foreignKeys" not in table:
            table["foreignKeys"] = []
        if "checkConstraints" not in table:
            table["checkConstraints"] = []

    def _ensure_audit_columns(self, table: dict):
        """Add created_at and updated_at if missing."""
        col_names = {c.get("name", "").lower() for c in table.get("columns", [])}
        table_name = table.get("name", "unknown")
        
        if "created_at" not in col_names:
            table["columns"].append({
                "id": str(uuid.uuid4()),
                "name": "created_at",
                "type": "timestamptz",
                "isPrimaryKey": False,
                "isNullable": False,
                "isUnique": False,
                "defaultValue": "CURRENT_TIMESTAMP",
                "comment": "Record creation timestamp"
            })
            self.warnings.append(f"Added 'created_at' to table '{table_name}'")
        
        if "updated_at" not in col_names:
            table["columns"].append({
                "id": str(uuid.uuid4()),
                "name": "updated_at",
                "type": "timestamptz",
                "isPrimaryKey": False,
                "isNullable": False,
                "isUnique": False,
                "defaultValue": "CURRENT_TIMESTAMP",
                "comment": "Record last update timestamp"
            })
            self.warnings.append(f"Added 'updated_at' to table '{table_name}'")

    def _ensure_primary_key(self, table: dict):
        """Ensure at least one column is marked as primary key."""
        has_pk = any(c.get("isPrimaryKey", False) for c in table.get("columns", []))
        
        if not has_pk and table.get("columns"):
            # Check if there's a column named 'id'
            for col in table["columns"]:
                if col.get("name", "").lower() == "id":
                    col["isPrimaryKey"] = True
                    col["isNullable"] = False
                    col["isUnique"] = True
                    self.warnings.append(f"Marked 'id' as PK in table '{table.get('name', '?')}'")
                    return
            
            # If no 'id' column, add one
            table["columns"].insert(0, {
                "id": str(uuid.uuid4()),
                "name": "id",
                "type": "serial",
                "isPrimaryKey": True,
                "isNullable": False,
                "isUnique": True,
                "comment": "Primary key (auto-generated)"
            })
            self.warnings.append(f"Added missing 'id' PK column to table '{table.get('name', '?')}'")

    def _auto_generate_fk_indexes(self, table: dict):
        """Create indexes for all FK columns if not already indexed."""
        existing_index_cols = set()
        for idx in table.get("indexes", []):
            for col in idx.get("columns", []):
                existing_index_cols.add(col.lower())
        
        table_name = table.get("name", "unknown")
        
        for fk in table.get("foreignKeys", []):
            fk_col = fk.get("columnName", "")
            if fk_col.lower() not in existing_index_cols:
                idx_name = f"idx_{table_name}_{fk_col}"
                table["indexes"].append({
                    "id": str(uuid.uuid4()),
                    "name": idx_name,
                    "columns": [fk_col],
                    "isUnique": False,
                    "type": "btree"
                })
                existing_index_cols.add(fk_col.lower())
                self.warnings.append(f"Added index '{idx_name}' for FK column '{fk_col}' in '{table_name}'")

    def _fill_missing_ids(self, table: dict):
        """Fill in missing UUIDs for table and its children."""
        if not table.get("id"):
            table["id"] = str(uuid.uuid4())
        
        for col in table.get("columns", []):
            if not col.get("id"):
                col["id"] = str(uuid.uuid4())
        
        for idx in table.get("indexes", []):
            if not idx.get("id"):
                idx["id"] = str(uuid.uuid4())
        
        for fk in table.get("foreignKeys", []):
            if not fk.get("id"):
                fk["id"] = str(uuid.uuid4())
        
        for chk in table.get("checkConstraints", []):
            if not chk.get("id"):
                chk["id"] = str(uuid.uuid4())

    def _validate_fk_references(self, schema: dict, table_names: set):
        """Check that all FK references point to existing tables."""
        for table in schema.get("tables", []):
            for fk in table.get("foreignKeys", []):
                ref_table = fk.get("referencedTable", "")
                if ref_table.lower() not in {t.lower() for t in table_names}:
                    self.warnings.append(
                        f"FK '{fk.get('constraintName', '?')}' in table "
                        f"'{table.get('name', '?')}' references non-existent "
                        f"table '{ref_table}'"
                    )

    def _infer_relationships(self, schema: dict):
        """Infer relationships from FKs if the relationships array is empty or incomplete."""
        existing_rels = set()
        for rel in schema.get("relationships", []):
            key = f"{rel.get('sourceTable', '')}-{rel.get('targetTable', '')}"
            existing_rels.add(key)
            key_rev = f"{rel.get('targetTable', '')}-{rel.get('sourceTable', '')}"
            existing_rels.add(key_rev)
        
        for table in schema.get("tables", []):
            for fk in table.get("foreignKeys", []):
                ref_table = fk.get("referencedTable", "")
                table_name = table.get("name", "")
                
                key = f"{ref_table}-{table_name}"
                key_rev = f"{table_name}-{ref_table}"
                
                if key not in existing_rels and key_rev not in existing_rels:
                    schema["relationships"].append({
                        "id": str(uuid.uuid4()),
                        "name": f"{ref_table}_has_{table_name}",
                        "sourceTable": ref_table,
                        "sourceColumn": fk.get("referencedColumn", "id"),
                        "targetTable": table_name,
                        "targetColumn": fk.get("columnName", ""),
                        "cardinality": "one-to-many",
                        "onDelete": fk.get("onDelete", "CASCADE")
                    })
                    existing_rels.add(key)
                    self.warnings.append(
                        f"Inferred relationship: {ref_table} -> {table_name}"
                    )


# Singleton instance
schema_validator = SchemaValidator()
