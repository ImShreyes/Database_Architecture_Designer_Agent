"""
AI Service — Multi-Step Schema Generation with LangGraph

Pipeline:
  Step 1: Entity Planning (plan tables, relationships, views, triggers)
  Step 2: Detailed Schema Generation (full columns, indexes, FKs, procedures)
  Step 3: Validation & Repair (post-processing to fix LLM mistakes)
"""

import os
import json
import uuid
import re
import datetime
from typing import Optional, TypedDict, Annotated, Any
from dotenv import load_dotenv

from core.models import SchemaDefinition
from core.prompts import (
    get_entity_planning_prompt,
    get_schema_generation_prompt,
    get_schema_refinement_prompt,
)
from services.schema_validator import schema_validator

from langchain_core.output_parsers import JsonOutputParser
from langgraph.graph import StateGraph, START, END

# Load environment variables
load_dotenv()


# ==================== LangGraph State ====================

class SchemaGenState(TypedDict):
    """State that flows through the LangGraph pipeline."""
    prompt: str
    dialect: str
    complexity_level: str
    additional_context: str
    entity_plan: str          # JSON string from Step 1
    schema_dict: dict         # Raw schema dict from Step 2
    validated_schema: dict    # Post-validated schema dict
    warnings: list            # Validation warnings
    error: Optional[str]


# ==================== AI Service ====================

class AIService:
    def __init__(self):
        self.llm = self._initialize_llm()
        self.parser = JsonOutputParser()
        self.entity_planning_prompt = get_entity_planning_prompt()
        self.schema_generation_prompt = get_schema_generation_prompt()
        self.refinement_prompt = get_schema_refinement_prompt()
        
        # Build LangGraph pipeline
        self.graph = self._build_graph() if self.llm else None

    def _initialize_llm(self):
        """Initializes the LLM based on available API keys (prioritizes best models)."""
        # Try Groq (Llama-3 70B — fast and capable)
        groq_api_key = os.getenv("GROQ_API_KEY")
        if groq_api_key:
            from langchain_groq import ChatGroq
            print("✓ Using Groq API (Llama 3 70B) for LLM generation.")
            return ChatGroq(
                model_name="llama3-70b-8192",
                temperature=0.1,  # Low temp for structured output
                api_key=groq_api_key,
                max_retries=2,
            )
        
        # Try Google Gemini
        gemini_api_key = os.getenv("GEMINI_API_KEY")
        if gemini_api_key:
            from langchain_google_genai import ChatGoogleGenerativeAI
            print("✓ Using Google Gemini API for LLM generation.")
            return ChatGoogleGenerativeAI(
                model="gemini-1.5-pro-latest",
                temperature=0.1,
                google_api_key=gemini_api_key,
            )
        
        # Fallback to OpenRouter — use a strong model
        openai_api_key = os.getenv("OPENAI_API_KEY")
        if openai_api_key:
            openrouter_base = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
            openrouter_model = os.getenv("OPENROUTER_MODEL", "meta-llama/llama-3.1-70b-instruct")
            from langchain_openai import ChatOpenAI
            print(f"✓ Using OpenRouter ({openrouter_model}) for LLM generation.")
            return ChatOpenAI(
                model=openrouter_model,
                base_url=openrouter_base,
                api_key=openai_api_key,
                temperature=0.1,
                timeout=120.0,
                max_retries=2,
                streaming=False,
            )
            
        print("⚠ Warning: No API Keys found in environment. Running in mock mode.")
        return None

    # ==================== LangGraph Pipeline ====================

    def _build_graph(self):
        """Build the LangGraph state machine for multi-step generation."""
        
        workflow = StateGraph(SchemaGenState)
        
        # Add nodes
        workflow.add_node("plan_entities", self._plan_entities_node)
        workflow.add_node("generate_schema", self._generate_schema_node)
        workflow.add_node("validate_schema", self._validate_schema_node)
        
        # Define edges
        workflow.add_edge(START, "plan_entities")
        workflow.add_edge("plan_entities", "generate_schema")
        workflow.add_edge("generate_schema", "validate_schema")
        workflow.add_edge("validate_schema", END)
        
        return workflow.compile()

    def _plan_entities_node(self, state: SchemaGenState) -> dict:
        """Step 1: Plan entities and relationships."""
        try:
            chain = self.entity_planning_prompt | self.llm | self.parser
            result = chain.invoke({
                "prompt": state["prompt"],
                "dialect": state["dialect"],
                "complexity_level": state["complexity_level"],
                "additional_context": state["additional_context"],
            })
            
            entity_plan_str = json.dumps(result, indent=2)
            print(f"✓ Entity planning complete: {len(result.get('entities', []))} entities planned")
            return {"entity_plan": entity_plan_str}
            
        except Exception as e:
            print(f"⚠ Entity planning failed: {e}. Proceeding with direct generation.")
            # Fallback: skip planning, go directly to generation
            return {"entity_plan": "No entity plan available. Generate a comprehensive schema from the user prompt directly."}

    def _generate_schema_node(self, state: SchemaGenState) -> dict:
        """Step 2: Generate the full detailed schema."""
        try:
            chain = self.schema_generation_prompt | self.llm | self.parser
            result = chain.invoke({
                "prompt": state["prompt"],
                "dialect": state["dialect"],
                "complexity_level": state["complexity_level"],
                "entity_plan": state["entity_plan"],
                "additional_context": state["additional_context"],
            })
            
            # Handle string responses
            if isinstance(result, str):
                cleaned_str = re.sub(r'```(?:json)?|```', '', result).strip()
                result = json.loads(cleaned_str)
            
            print(f"✓ Schema generation complete: {len(result.get('tables', []))} tables")
            return {"schema_dict": result}
            
        except Exception as e:
            print(f"✗ Schema generation failed: {e}")
            return {"schema_dict": {}, "error": str(e)}

    def _validate_schema_node(self, state: SchemaGenState) -> dict:
        """Step 3: Validate and repair the schema."""
        schema_dict = state.get("schema_dict", {})
        
        if not schema_dict or not schema_dict.get("tables"):
            return {
                "validated_schema": schema_dict,
                "warnings": ["Schema generation produced no tables"],
            }
        
        # Ensure dialect is set
        schema_dict["dialect"] = state["dialect"]
        
        # Run the validator
        validated, warnings = schema_validator.validate_and_repair(schema_dict)
        
        print(f"✓ Validation complete: {len(warnings)} warnings")
        for w in warnings[:5]:
            print(f"  ⚠ {w}")
        if len(warnings) > 5:
            print(f"  ... and {len(warnings) - 5} more")
        
        return {
            "validated_schema": validated,
            "warnings": warnings,
        }

    # ==================== Public API ====================

    def generate_schema(
        self,
        prompt: str,
        dialect: str,
        additional_context: Optional[str] = None,
        complexity_level: str = "standard",
    ) -> tuple[SchemaDefinition, list[str]]:
        """
        Generate a schema using the LangGraph pipeline.
        Returns (SchemaDefinition, warnings_list).
        """
        context = additional_context if additional_context else "No additional context."
        
        if self.graph:
            max_attempts = 2
            for attempt in range(max_attempts):
                try:
                    # Run the LangGraph pipeline
                    initial_state: SchemaGenState = {
                        "prompt": prompt,
                        "dialect": dialect,
                        "complexity_level": complexity_level,
                        "additional_context": context,
                        "entity_plan": "",
                        "schema_dict": {},
                        "validated_schema": {},
                        "warnings": [],
                        "error": None,
                    }
                    
                    result = self.graph.invoke(initial_state)
                    
                    validated = result.get("validated_schema", {})
                    warnings = result.get("warnings", [])
                    
                    if not validated or not validated.get("tables"):
                        if attempt < max_attempts - 1:
                            print(f"⚠ Attempt {attempt + 1}: Empty schema, retrying...")
                            continue
                        else:
                            print("✗ All attempts produced empty schema. Using fallback.")
                            return self._generate_mock(prompt, dialect), ["Used fallback mock schema"]
                    
                    # Ensure timestamps
                    now = datetime.datetime.now().isoformat()
                    validated.setdefault("createdAt", now)
                    validated.setdefault("updatedAt", now)
                    
                    # Validate with Pydantic
                    schema = SchemaDefinition(**validated)
                    return schema, warnings
                    
                except Exception as e:
                    import traceback
                    print(f"✗ Pipeline error on attempt {attempt + 1}: {e}")
                    traceback.print_exc()
                    if attempt < max_attempts - 1:
                        import time
                        time.sleep(1)
                        continue
                    else:
                        print("✗ Pipeline failed after retries. Using fallback.")
                        return self._generate_mock(prompt, dialect), [f"Fallback used due to error: {str(e)}"]
        else:
            return self._generate_mock(prompt, dialect), ["No LLM configured — using mock schema"]

    def refine_schema(
        self,
        current_schema: SchemaDefinition,
        refinement_prompt: str,
        dialect: str,
    ) -> tuple[SchemaDefinition, list[str]]:
        """
        Refine an existing schema based on user feedback.
        Returns (SchemaDefinition, warnings_list).
        """
        if not self.llm:
            return current_schema, ["No LLM configured — cannot refine"]
        
        try:
            chain = self.refinement_prompt | self.llm | self.parser
            
            result = chain.invoke({
                "current_schema": json.dumps(current_schema.dict(by_alias=True), indent=2),
                "refinement_prompt": refinement_prompt,
                "dialect": dialect,
            })
            
            if isinstance(result, str):
                cleaned = re.sub(r'```(?:json)?|```', '', result).strip()
                result = json.loads(cleaned)
            
            # Validate and repair
            validated, warnings = schema_validator.validate_and_repair(result)
            
            now = datetime.datetime.now().isoformat()
            validated.setdefault("createdAt", now)
            validated.setdefault("updatedAt", now)
            validated["dialect"] = dialect
            
            schema = SchemaDefinition(**validated)
            return schema, warnings
            
        except Exception as e:
            print(f"✗ Refinement failed: {e}")
            return current_schema, [f"Refinement failed: {str(e)}"]

    def _generate_mock(self, prompt: str, dialect: str) -> SchemaDefinition:
        """Fallback mock generator when no LLM is available."""
        from core.models import (
            TableDefinition, ColumnDefinition, RelationshipDefinition,
            IndexDefinition, ForeignKeyDefinition, ViewDefinition,
            TriggerDefinition, FunctionDefinition
        )

        tables = []
        relationships = []
        
        # Generate a more comprehensive mock
        users_id = str(uuid.uuid4())
        tables.append(TableDefinition(
            id=users_id,
            name="users",
            columns=[
                ColumnDefinition(id=str(uuid.uuid4()), name="id", type="serial", isPrimaryKey=True, isNullable=False, isUnique=True),
                ColumnDefinition(id=str(uuid.uuid4()), name="email", type="varchar", length=255, isPrimaryKey=False, isNullable=False, isUnique=True, comment="User email address"),
                ColumnDefinition(id=str(uuid.uuid4()), name="full_name", type="varchar", length=255, isPrimaryKey=False, isNullable=False, isUnique=False),
                ColumnDefinition(id=str(uuid.uuid4()), name="password_hash", type="varchar", length=255, isPrimaryKey=False, isNullable=False, isUnique=False),
                ColumnDefinition(id=str(uuid.uuid4()), name="is_active", type="boolean", isPrimaryKey=False, isNullable=False, isUnique=False, defaultValue=True),
                ColumnDefinition(id=str(uuid.uuid4()), name="created_at", type="timestamptz", isPrimaryKey=False, isNullable=False, isUnique=False, defaultValue="CURRENT_TIMESTAMP"),
                ColumnDefinition(id=str(uuid.uuid4()), name="updated_at", type="timestamptz", isPrimaryKey=False, isNullable=False, isUnique=False, defaultValue="CURRENT_TIMESTAMP"),
            ],
            indexes=[
                IndexDefinition(id=str(uuid.uuid4()), name="idx_users_email", columns=["email"], isUnique=True, type="btree"),
            ],
            foreignKeys=[],
            comment="Application users"
        ))

        posts_id = str(uuid.uuid4())
        tables.append(TableDefinition(
            id=posts_id,
            name="posts",
            columns=[
                ColumnDefinition(id=str(uuid.uuid4()), name="id", type="serial", isPrimaryKey=True, isNullable=False, isUnique=True),
                ColumnDefinition(id=str(uuid.uuid4()), name="user_id", type="integer", isPrimaryKey=False, isNullable=False, isUnique=False),
                ColumnDefinition(id=str(uuid.uuid4()), name="title", type="varchar", length=500, isPrimaryKey=False, isNullable=False, isUnique=False),
                ColumnDefinition(id=str(uuid.uuid4()), name="content", type="text", isPrimaryKey=False, isNullable=True, isUnique=False),
                ColumnDefinition(id=str(uuid.uuid4()), name="status", type="varchar", length=20, isPrimaryKey=False, isNullable=False, isUnique=False, defaultValue="draft"),
                ColumnDefinition(id=str(uuid.uuid4()), name="created_at", type="timestamptz", isPrimaryKey=False, isNullable=False, isUnique=False, defaultValue="CURRENT_TIMESTAMP"),
                ColumnDefinition(id=str(uuid.uuid4()), name="updated_at", type="timestamptz", isPrimaryKey=False, isNullable=False, isUnique=False, defaultValue="CURRENT_TIMESTAMP"),
            ],
            indexes=[
                IndexDefinition(id=str(uuid.uuid4()), name="idx_posts_user_id", columns=["user_id"], isUnique=False, type="btree"),
            ],
            foreignKeys=[
                ForeignKeyDefinition(id=str(uuid.uuid4()), constraintName="fk_posts_user_id", columnName="user_id", referencedTable="users", referencedColumn="id", onDelete="CASCADE"),
            ],
            comment="Blog posts"
        ))

        relationships.append(RelationshipDefinition(
            id=str(uuid.uuid4()),
            name="users_have_posts",
            sourceTable="users",
            sourceColumn="id",
            targetTable="posts",
            targetColumn="user_id",
            cardinality="one-to-many",
            onDelete="CASCADE",
        ))

        views = [
            ViewDefinition(
                id=str(uuid.uuid4()),
                name="vw_active_users_posts",
                query="SELECT u.id, u.email, u.full_name, COUNT(p.id) AS post_count FROM users u LEFT JOIN posts p ON u.id = p.user_id WHERE u.is_active = true GROUP BY u.id, u.email, u.full_name",
                isMaterialized=False,
                comment="Active users with their post counts",
            )
        ]

        triggers = [
            TriggerDefinition(
                id=str(uuid.uuid4()),
                name="trg_users_updated_at",
                tableName="users",
                timing="BEFORE",
                event="UPDATE",
                forEachRow=True,
                body="NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW;",
                comment="Auto-update updated_at timestamp on users table",
            )
        ]

        return SchemaDefinition(
            id=str(uuid.uuid4()),
            name="Fallback Generated Schema",
            description=f"Fallback schema for: {prompt}",
            dialect=dialect,
            tables=tables,
            relationships=relationships,
            storedProcedures=[],
            functions=[],
            views=views,
            triggers=triggers,
            createdAt=datetime.datetime.now().isoformat(),
            updatedAt=datetime.datetime.now().isoformat(),
        )


# Instantiate the service singleton
ai_service = AIService()
