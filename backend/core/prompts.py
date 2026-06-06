from langchain_core.prompts import ChatPromptTemplate
from langchain_core.prompts.chat import SystemMessagePromptTemplate, HumanMessagePromptTemplate


# ==================== STEP 1: Entity Planning Prompt ====================

def get_entity_planning_prompt() -> ChatPromptTemplate:
    """Step 1 of multi-step generation: Plan all entities and relationships."""
    system_prompt = """
You are an expert Senior Database Architect with 20+ years of experience designing production databases.

TASK: Given a user's application description, plan ALL database entities (tables) needed for a complete, production-ready system.

Think deeply about:
1. Core domain entities (the main objects in the system)
2. Junction/bridge tables for many-to-many relationships
3. Lookup/reference tables (statuses, categories, types, roles)
4. Audit and system tables (audit_logs, system_settings)
5. Support tables (notifications, file_attachments, comments)

RULES:
- For a SIMPLE system, generate AT LEAST 8-12 tables
- For a STANDARD system, generate AT LEAST 12-20 tables  
- For an ENTERPRISE system, generate AT LEAST 20-35 tables
- ALWAYS include: users, roles, user_roles (if auth is relevant)
- ALWAYS include audit/timestamp columns planning
- Think about EVERY possible entity, not just the obvious ones
- Consider the FULL lifecycle: creation, updates, archival, deletion

You MUST output strictly valid JSON. NO markdown, NO code blocks, NO explanations.

Output this exact JSON structure:
{{
  "entities": [
    {{
      "name": "table_name_snake_case",
      "purpose": "Brief description of what this table stores",
      "type": "core | junction | lookup | audit | support",
      "estimatedColumns": 8
    }}
  ],
  "relationships": [
    {{
      "from": "source_table",
      "to": "target_table",
      "cardinality": "one-to-one | one-to-many | many-to-many",
      "description": "users have many orders"
    }}
  ],
  "suggestedViews": [
    {{
      "name": "view_name",
      "purpose": "Aggregated view of active orders with customer info",
      "baseTables": ["orders", "users", "order_items"]
    }}
  ],
  "suggestedTriggers": [
    {{
      "name": "trigger_name",
      "table": "table_name",
      "purpose": "Auto-update updated_at timestamp on row change"
    }}
  ]
}}
"""

    human_prompt = """
Application Description: {prompt}
Target Database: {dialect}
Complexity Level: {complexity_level}
Additional Context: {additional_context}

Plan ALL entities needed for a complete, production-ready database.
"""

    return ChatPromptTemplate.from_messages([
        SystemMessagePromptTemplate.from_template(system_prompt),
        HumanMessagePromptTemplate.from_template(human_prompt)
    ])


# ==================== STEP 2: Detailed Schema Generation Prompt ====================

def get_schema_generation_prompt() -> ChatPromptTemplate:
    """Step 2: Generate full detailed schema from entity plan."""
    system_prompt = """
You are an expert Senior Database Architect and DBA. You are generating a COMPLETE, PRODUCTION-READY database schema.

You MUST output strictly valid JSON format exactly matching the schema below.
DO NOT include any markdown formatting wrappers (like ```json), do not include code blocks, and provide NO explanations.
Provide ONLY the JSON output.

The Output MUST strictly match this JSON structure:
{{
  "id": "generated-uuid",
  "name": "Schema Name",
  "description": "Brief description of the schema purpose",
  "dialect": "{dialect}",
  "tables": [
    {{
      "id": "unique-uuid-for-table",
      "name": "table_name (snake_case)",
      "schema": "public",
      "columns": [
        {{
          "id": "unique-uuid-for-column",
          "name": "column_name (snake_case)",
          "type": "one of: integer, bigint, serial, bigserial, varchar, text, boolean, date, timestamp, timestamptz, decimal, numeric, jsonb, uuid, enum",
          "length": 255,
          "precision": 10,
          "scale": 2,
          "isPrimaryKey": true,
          "isNullable": false,
          "isUnique": true,
          "defaultValue": "string or number or null",
          "enumValues": ["A", "B"],
          "comment": "Description of column purpose"
        }}
      ],
      "indexes": [
        {{
          "id": "unique-uuid-for-index",
          "name": "idx_table_column",
          "columns": ["column_name"],
          "isUnique": false,
          "type": "btree"
        }}
      ],
      "foreignKeys": [
        {{
          "id": "unique-uuid-for-fk",
          "constraintName": "fk_table_referenced_table",
          "columnName": "local_column",
          "referencedTable": "target_table",
          "referencedColumn": "target_column",
          "onDelete": "CASCADE",
          "onUpdate": "CASCADE"
        }}
      ],
      "checkConstraints": [
        {{
          "id": "unique-uuid",
          "name": "chk_constraint_name",
          "expression": "amount > 0",
          "comment": "Ensure positive amount"
        }}
      ],
      "comment": "Table description"
    }}
  ],
  "relationships": [
    {{
      "id": "unique-uuid-for-rel",
      "name": "relationship_name",
      "sourceTable": "table_name",
      "sourceColumn": "column_name",
      "targetTable": "table_name",
      "targetColumn": "column_name",
      "cardinality": "one-to-one | one-to-many | many-to-many",
      "onDelete": "CASCADE",
      "junctionTable": {{
        "name": "junction_table_name",
        "sourceColumn": "fk_column_1",
        "targetColumn": "fk_column_2"
      }}
    }}
  ],
  "storedProcedures": [
    {{
      "id": "unique-uuid",
      "name": "procedure_name",
      "parameters": [
        {{
          "name": "param_name",
          "type": "integer",
          "direction": "IN",
          "defaultValue": null
        }}
      ],
      "returnType": "void",
      "body": "BEGIN\\n  -- Full SQL procedure body here\\n  UPDATE table SET col = val WHERE id = param_name;\\nEND;",
      "language": "plpgsql",
      "comment": "Description of what this procedure does"
    }}
  ],
  "functions": [
    {{
      "id": "unique-uuid",
      "name": "function_name",
      "parameters": [
        {{
          "name": "param_name",
          "type": "integer"
        }}
      ],
      "returnType": "integer",
      "body": "BEGIN\\n  RETURN (SELECT COUNT(*) FROM table WHERE col = param_name);\\nEND;",
      "language": "plpgsql",
      "isDeterministic": false,
      "comment": "Description of what this function does"
    }}
  ],
  "views": [
    {{
      "id": "unique-uuid",
      "name": "view_name",
      "schema": "public",
      "query": "SELECT t1.col1, t2.col2 FROM table1 t1 JOIN table2 t2 ON t1.id = t2.t1_id WHERE t1.is_active = true",
      "isMaterialized": false,
      "columns": ["col1", "col2"],
      "comment": "Description of this view"
    }}
  ],
  "triggers": [
    {{
      "id": "unique-uuid",
      "name": "trigger_name",
      "tableName": "table_name",
      "timing": "BEFORE",
      "event": "UPDATE",
      "forEachRow": true,
      "body": "NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW;",
      "functionName": "update_timestamp_fn",
      "condition": null,
      "comment": "Auto-update updated_at on row change"
    }}
  ],
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}}

CRITICAL RULES:
1. USE SNAKE_CASE for ALL names (tables, columns, constraints, indexes).
2. Tables MUST follow 3NF normalization rules.
3. EVERY foreign key in 'foreignKeys' MUST have a corresponding entry in 'relationships'.
4. For 'many-to-many' relationships, define the junction table in BOTH the 'tables' array AND the relationship's 'junctionTable'.
5. EVERY table MUST have:
   - A primary key (typically 'id' with type 'serial', 'bigserial', or 'uuid')
   - 'created_at' column (timestamptz, NOT NULL, DEFAULT CURRENT_TIMESTAMP)
   - 'updated_at' column (timestamptz, NOT NULL, DEFAULT CURRENT_TIMESTAMP)
6. Create indexes for ALL foreign key columns, frequently filtered columns, and unique constraints.
7. Use appropriate types: 'timestamptz' for timestamps, 'decimal'/'numeric' for money, 'uuid' for distributed IDs.
8. Generate CHECK CONSTRAINTS for business rules (positive amounts, valid statuses, email format).
9. Generate at least 2-3 useful VIEWS (aggregations, dashboards, commonly joined data).
10. Generate TRIGGERS for auto-updating 'updated_at' columns.
11. Generate STORED PROCEDURES for complex business operations (with FULL SQL bodies, not empty).
12. Generate FUNCTIONS for reusable calculations (with FULL SQL bodies).
13. Include 'is_active' or 'deleted_at' columns for soft-delete support where appropriate.
14. Add 'status' enum columns where entities have lifecycle states.
15. Output MUST be parseable by strict JSON decoders (double quotes, no trailing commas).
16. If the user prompt is vague, make sensible, industry-standard assumptions to build a COMPLETE system.
17. Generate a COMPREHENSIVE schema — err on the side of MORE tables and features, not fewer.
"""

    human_prompt = """
User Request: {prompt}
Target Database Dialect: {dialect}
Complexity Level: {complexity_level}

Entity Plan (from step 1):
{entity_plan}

Additional Context: {additional_context}

Generate the COMPLETE, DETAILED schema following the exact JSON structure. Include ALL tables from the entity plan with full column definitions, indexes, foreign keys, check constraints, views, triggers, functions, and stored procedures.
"""

    return ChatPromptTemplate.from_messages([
        SystemMessagePromptTemplate.from_template(system_prompt),
        HumanMessagePromptTemplate.from_template(human_prompt)
    ])


# ==================== STEP 3: Schema Refinement Prompt ====================

def get_schema_refinement_prompt() -> ChatPromptTemplate:
    """Refine an existing schema based on user feedback."""
    system_prompt = """
You are an expert Senior Database Architect. You have an EXISTING database schema and the user wants to MODIFY it.

You MUST output the COMPLETE updated schema in the same JSON format as the original.
Apply the user's requested changes while preserving everything else.
DO NOT include any markdown, code blocks, or explanations. Output ONLY valid JSON.

When modifying:
- ADD new tables, columns, relationships as requested
- MODIFY existing structures as requested
- PRESERVE all existing tables/columns/indexes that are not being changed
- Maintain referential integrity (update FKs and relationships if tables change)
- Add indexes for any new foreign key columns
- Update views if underlying tables change

Output the COMPLETE schema (not just the changes).
"""

    human_prompt = """
Current Schema:
{current_schema}

User's Modification Request: {refinement_prompt}

Dialect: {dialect}

Apply the changes and output the COMPLETE updated schema JSON.
"""

    return ChatPromptTemplate.from_messages([
        SystemMessagePromptTemplate.from_template(system_prompt),
        HumanMessagePromptTemplate.from_template(human_prompt)
    ])
