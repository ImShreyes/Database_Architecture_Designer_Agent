import os
import json
import uuid
import datetime
from typing import Optional
from dotenv import load_dotenv

from core.models import SchemaDefinition
from core.prompts import get_schema_generation_prompt

from langchain_core.output_parsers import JsonOutputParser
from langchain_core.runnables import RunnablePassthrough

# Load environment variables
load_dotenv()

class AIService:
    def __init__(self):
        self.llm = self._initialize_llm()
        self.prompt_template = get_schema_generation_prompt()
        self.parser = JsonOutputParser()
        
        if self.llm:
            # Create a LangChain LCEL chain
            self.chain = (
                self.prompt_template 
                | self.llm 
                | self.parser
            )
        else:
            self.chain = None

    def _initialize_llm(self):
        """Initializes the LLM based on available API keys (prioritizes free models)."""
        # Try Groq (Llama-3 etc)
        groq_api_key = os.getenv("GROQ_API_KEY")
        if groq_api_key:
            from langchain_groq import ChatGroq
            print("Using Groq API for LLM generation.")
            return ChatGroq(model_name="llama3-70b-8192", temperature=0.2, api_key=groq_api_key)
        
        # Try Google Gemini 
        gemini_api_key = os.getenv("GEMINI_API_KEY")
        if gemini_api_key:
            from langchain_google_genai import ChatGoogleGenerativeAI
            print("Using Google Gemini API for LLM generation.")
            return ChatGoogleGenerativeAI(model="gemini-1.5-pro-latest", temperature=0.2, google_api_key=gemini_api_key)
        
        # Fallback to OpenAI
        openai_api_key = os.getenv("OPENAI_API_KEY")
        if openai_api_key:
            from langchain_openai import ChatOpenAI
            print("Using OpenAI API for LLM generation.")
            return ChatOpenAI(model="gpt-4-turbo-preview", temperature=0.2, api_key=openai_api_key)
            
        print("Warning: No API Keys found in environment. Running in mock mode.")
        return None
            
    def generate_schema(self, prompt: str, dialect: str, additional_context: Optional[str] = None) -> SchemaDefinition:
        """
        Generates a schema using a configured model via LangChain, or fallback mock.
        """
        context = additional_context if additional_context else "No additional context."
        
        if self.chain:
            try:
                # Invoke the LangChain pipeline
                schema_dict = self.chain.invoke({
                    "prompt": prompt,
                    "dialect": dialect,
                    "additional_context": context
                })
                
                # Cleanup if model wraps it in string representation or markdown by accident
                if isinstance(schema_dict, str):
                    schema_dict = json.loads(schema_dict)
                
                # Validate with Pydantic
                schema = SchemaDefinition(**schema_dict)
                return schema
            except Exception as e:
                print(f"AI Generation Error (LangChain): {e}")
                # Fallback to mock on failure
                return self._generate_mock(prompt, dialect)
        else:
            # Fallback to mock if no LLM
            return self._generate_mock(prompt, dialect)

    def _generate_mock(self, prompt: str, dialect: str) -> SchemaDefinition:
        """
        Sophisticated mock generator for fallback purposes.
        """
        from core.models import TableDefinition, ColumnDefinition, RelationshipDefinition

        tables = []
        relationships = []
        
        users_id = str(uuid.uuid4())
        tables.append(TableDefinition(
            id=users_id,
            name="users",
            columns=[
                ColumnDefinition(id=str(uuid.uuid4()), name="id", type="serial", isPrimaryKey=True, isNullable=False, isUnique=True),
                ColumnDefinition(id=str(uuid.uuid4()), name="email", type="varchar", length=255, isPrimaryKey=False, isNullable=False, isUnique=True),
                ColumnDefinition(id=str(uuid.uuid4()), name="created_at", type="timestamp", isPrimaryKey=False, isNullable=False, isUnique=False)
            ],
            indexes=[],
            foreignKeys=[]
        ))

        return SchemaDefinition(
            id=str(uuid.uuid4()),
            name="Fallback Generated Schema",
            description=f"Fallback schema for: {prompt}",
            dialect=dialect,
            tables=tables,
            relationships=relationships,
            storedProcedures=[],
            createdAt=datetime.datetime.now().isoformat(),
            updatedAt=datetime.datetime.now().isoformat()
        )

# Instantiate the service singleton
ai_service = AIService()
