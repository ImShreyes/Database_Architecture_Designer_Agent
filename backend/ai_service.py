import os
import json
import uuid
import datetime
from typing import Optional
from openai import OpenAI
from dotenv import load_dotenv
from models import SchemaDefinition, GenerateSchemaResponse
from prompts import build_system_prompt

# Load environment variables from .env file
load_dotenv()

# You can set this via environment variable
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

class AIService:
    def __init__(self):
        self.client = None
        if OPENAI_API_KEY:
            self.client = OpenAI(api_key=OPENAI_API_KEY)
            
    def generate_schema(self, prompt: str, dialect: str, additional_context: Optional[str] = None) -> SchemaDefinition:
        """
        Generates a schema using OpenAI if available, otherwise falls back to a mock.
        """
        if self.client:
            return self._generate_with_ai(prompt, dialect, additional_context)
        else:
            print("No OpenAI API Key found. Using Mock Generator.")
            return self._generate_mock(prompt, dialect)

    def _generate_with_ai(self, prompt: str, dialect: str, additional_context: Optional[str]) -> SchemaDefinition:
        system_prompt = build_system_prompt(dialect)
        user_message = f"User Request: {prompt}\n\n"
        if additional_context:
            user_message += f"Additional Context: {additional_context}"

        try:
            completion = self.client.chat.completions.create(
                model="gpt-4-turbo-preview",  # Or gpt-3.5-turbo if cost is a concern
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                response_format={"type": "json_object"},
                temperature=0.2,
            )
            
            content = completion.choices[0].message.content
            schema_dict = json.loads(content)
            
            # Validate with Pydantic
            schema = SchemaDefinition(**schema_dict)
            return schema
            
        except Exception as e:
            print(f"AI Generation Error: {e}")
            # Fallback to mock if AI fails
            return self._generate_mock(prompt, dialect)

    def _generate_mock(self, prompt: str, dialect: str) -> SchemaDefinition:
        """
        Sophisticated mock generator that attempts to parse simple keywords 
        to create a slightly more dynamic schema.
        """
        from .models import TableDefinition, ColumnDefinition, RelationshipDefinition

        tables = []
        relationships = []
        
        # Always create Users table
        users_id = str(uuid.uuid4())
        tables.append(TableDefinition(
            id=users_id,
            name="users",
            columns=[
                ColumnDefinition(id=str(uuid.uuid4()), name="id", type="serial", isPrimaryKey=True, isNullable=False, isUnique=True),
                ColumnDefinition(id=str(uuid.uuid4()), name="email", type="varchar", length=255, isPrimaryKey=False, isNullable=False, isUnique=True),
                ColumnDefinition(id=str(uuid.uuid4()), name="password_hash", type="varchar", length=255, isPrimaryKey=False, isNullable=False, isUnique=False),
                ColumnDefinition(id=str(uuid.uuid4()), name="created_at", type="timestamp", isPrimaryKey=False, isNullable=False, isUnique=False)
            ],
            indexes=[],
            foreignKeys=[]
        ))

        prompt_lower = prompt.lower()
        
        # E-commerce Logic
        if any(w in prompt_lower for w in ["shop", "store", "commerce", "product", "order"]):
            # Products
            products_id = str(uuid.uuid4())
            tables.append(TableDefinition(
                id=products_id,
                name="products",
                columns=[
                    ColumnDefinition(id=str(uuid.uuid4()), name="id", type="serial", isPrimaryKey=True, isNullable=False, isUnique=True),
                    ColumnDefinition(id=str(uuid.uuid4()), name="sku", type="varchar", length=50, isPrimaryKey=False, isNullable=False, isUnique=True),
                    ColumnDefinition(id=str(uuid.uuid4()), name="name", type="varchar", length=150, isPrimaryKey=False, isNullable=False, isUnique=False),
                    ColumnDefinition(id=str(uuid.uuid4()), name="price", type="decimal", precision=10, scale=2, isPrimaryKey=False, isNullable=False, isUnique=False),
                    ColumnDefinition(id=str(uuid.uuid4()), name="stock_quantity", type="integer", isPrimaryKey=False, isNullable=False, isUnique=False)
                ],
                indexes=[], foreignKeys=[]
            ))
            
            # Orders
            orders_id = str(uuid.uuid4())
            tables.append(TableDefinition(
                id=orders_id,
                name="orders",
                columns=[
                    ColumnDefinition(id=str(uuid.uuid4()), name="id", type="serial", isPrimaryKey=True, isNullable=False, isUnique=True),
                    ColumnDefinition(id=str(uuid.uuid4()), name="user_id", type="integer", isPrimaryKey=False, isNullable=False, isUnique=False),
                    ColumnDefinition(id=str(uuid.uuid4()), name="status", type="enum", enumValues=["pending", "shipped", "delivered"], isPrimaryKey=False, isNullable=False, isUnique=False),
                    ColumnDefinition(id=str(uuid.uuid4()), name="total", type="decimal", precision=12, scale=2, isPrimaryKey=False, isNullable=False, isUnique=False)
                ],
                indexes=[], foreignKeys=[]
            ))
            
            # Order Items (Junction)
            order_items_id = str(uuid.uuid4())
            tables.append(TableDefinition(
                id=order_items_id,
                name="order_items",
                columns=[
                    ColumnDefinition(id=str(uuid.uuid4()), name="id", type="serial", isPrimaryKey=True, isNullable=False, isUnique=True),
                    ColumnDefinition(id=str(uuid.uuid4()), name="order_id", type="integer", isPrimaryKey=False, isNullable=False, isUnique=False),
                    ColumnDefinition(id=str(uuid.uuid4()), name="product_id", type="integer", isPrimaryKey=False, isNullable=False, isUnique=False),
                    ColumnDefinition(id=str(uuid.uuid4()), name="quantity", type="integer", isPrimaryKey=False, isNullable=False, isUnique=False),
                    ColumnDefinition(id=str(uuid.uuid4()), name="unit_price", type="decimal", precision=10, scale=2, isPrimaryKey=False, isNullable=False, isUnique=False)
                ],
                indexes=[], foreignKeys=[]
            ))

            # Relationships
            relationships.append(RelationshipDefinition(
                id=str(uuid.uuid4()), name="users_have_orders", sourceTable="users", sourceColumn="id", targetTable="orders", targetColumn="user_id", cardinality="one-to-many", onDelete="CASCADE"
            ))
            relationships.append(RelationshipDefinition(
                 id=str(uuid.uuid4()), name="orders_have_items", sourceTable="orders", sourceColumn="id", targetTable="order_items", targetColumn="order_id", cardinality="one-to-many", onDelete="CASCADE"
            ))
            relationships.append(RelationshipDefinition(
                 id=str(uuid.uuid4()), name="products_in_items", sourceTable="products", sourceColumn="id", targetTable="order_items", targetColumn="product_id", cardinality="one-to-many", onDelete="RESTRICT"
            ))

        # Blog/CMS Logic
        if any(w in prompt_lower for w in ["blog", "post", "article", "cms"]):
            posts_id = str(uuid.uuid4())
            tables.append(TableDefinition(
                id=posts_id,
                name="posts",
                columns=[
                    ColumnDefinition(id=str(uuid.uuid4()), name="id", type="serial", isPrimaryKey=True, isNullable=False, isUnique=True),
                    ColumnDefinition(id=str(uuid.uuid4()), name="author_id", type="integer", isPrimaryKey=False, isNullable=False, isUnique=False),
                    ColumnDefinition(id=str(uuid.uuid4()), name="title", type="varchar", length=255, isPrimaryKey=False, isNullable=False, isUnique=False),
                    ColumnDefinition(id=str(uuid.uuid4()), name="content", type="text", isPrimaryKey=False, isNullable=False, isUnique=False),
                    ColumnDefinition(id=str(uuid.uuid4()), name="slug", type="varchar", length=255, isPrimaryKey=False, isNullable=False, isUnique=True),
                    ColumnDefinition(id=str(uuid.uuid4()), name="published_at", type="timestamp", isPrimaryKey=False, isNullable=True, isUnique=False)
                ],
                 indexes=[], foreignKeys=[]
            ))
            
            relationships.append(RelationshipDefinition(
                id=str(uuid.uuid4()), name="authors_write_posts", sourceTable="users", sourceColumn="id", targetTable="posts", targetColumn="author_id", cardinality="one-to-many", onDelete="CASCADE"
            ))

        return SchemaDefinition(
            id=str(uuid.uuid4()),
            name="Generated Schema",
            description=f"Schema generated for: {prompt}",
            dialect=dialect,
            tables=tables,
            relationships=relationships,
            storedProcedures=[],
            createdAt=datetime.datetime.now().isoformat(),
            updatedAt=datetime.datetime.now().isoformat()
        )

ai_service = AIService()
