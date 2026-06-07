from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from core.models import (
    GenerateSchemaRequest, GenerateSchemaResponse,
    RefineSchemaRequest, SchemaDefinition,
)
from core.database import init_db, get_db, close_db
from services.ai_service import ai_service
from services.database_service import database_service
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List


# ==================== Lifespan ====================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown."""
    init_db()
    print("✓ Database initialized successfully!")
    yield
    close_db()
    print("✓ Database connection closed.")


app = FastAPI(
    title="Database Architecture Designer Agent",
    description="AI-powered database schema generation with LangGraph pipeline",
    version="2.0.0",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== Pydantic Models for API ====================

class CustomerCreate(BaseModel):
    name: str
    email: str

class CustomerResponse(BaseModel):
    id: str
    name: str
    email: str
    created_at: str
    
class SubscriptionCreate(BaseModel):
    customer_id: str
    is_active: bool = True

class SubscriptionResponse(BaseModel):
    id: str
    customer_id: str
    is_active: bool

class PaymentCreate(BaseModel):
    subscription_id: str
    amount: float

class PaymentResponse(BaseModel):
    id: str
    subscription_id: str
    amount: float

class ActivityLogCreate(BaseModel):
    customer_id: str
    action: str

class CustomerFullResponse(BaseModel):
    customer: dict
    subscriptions: List[dict]
    activity_logs: List[dict]

# ==================== Health Check ====================

@app.get("/api/health")
async def health_check():
    provider = "mock"
    if ai_service.graph:
        try:
            llm_class = ai_service.llm.__class__.__name__
            provider = f"langgraph ({llm_class})"
        except Exception:
            provider = "langgraph"
    return {
        "status": "ok",
        "version": "2.0.0",
        "ai_provider": provider,
        "pipeline": "multi-step (plan → generate → validate)" if ai_service.graph else "mock",
    }

# ==================== Schema Generation Endpoints ====================

@app.post("/api/generate-schema", response_model=GenerateSchemaResponse)
async def generate_schema(
    request: GenerateSchemaRequest, 
    x_user_email: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """Generate a new database schema from a natural language prompt."""
    try:
        # Validate prompt length
        if len(request.prompt.strip()) < 5:
            return GenerateSchemaResponse(
                success=False,
                error="Prompt must be at least 5 characters long",
            )
        
        complexity = request.complexityLevel or "standard"
        
        # Generate schema using the AI Service (LangGraph Pipeline)
        generated_schema, warnings = ai_service.generate_schema(
            prompt=request.prompt, 
            dialect=request.dialect,
            additional_context=request.additionalContext,
            complexity_level=complexity,
        )

        # Save to database if user is logged in
        if x_user_email:
            database_service.save_schema(
                db=db,
                user_email=x_user_email,
                prompt=request.prompt,
                dialect=request.dialect,
                schema_data=generated_schema.dict(by_alias=True)
            )

        return GenerateSchemaResponse(
            schema=generated_schema,
            success=True,
            warnings=warnings if warnings else None,
        )

    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"✗ Error generating schema: {e}")
        return GenerateSchemaResponse(success=False, error=str(e))


@app.post("/api/refine-schema", response_model=GenerateSchemaResponse)
async def refine_schema(
    request: RefineSchemaRequest,
    x_user_email: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """Refine an existing schema based on user feedback."""
    try:
        current_schema = request.schema_data
        
        refined_schema, warnings = ai_service.refine_schema(
            current_schema=current_schema,
            refinement_prompt=request.refinementPrompt,
            dialect=current_schema.dialect,
        )

        # Save refined version if user is logged in
        if x_user_email:
            database_service.save_schema(
                db=db,
                user_email=x_user_email,
                prompt=f"[REFINED] {request.refinementPrompt}",
                dialect=current_schema.dialect,
                schema_data=refined_schema.dict(by_alias=True)
            )

        return GenerateSchemaResponse(
            schema=refined_schema,
            success=True,
            warnings=warnings if warnings else None,
        )

    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"✗ Error refining schema: {e}")
        return GenerateSchemaResponse(success=False, error=str(e))

# ==================== Saved Schema Endpoints ====================

@app.get("/api/schemas")
async def list_generated_schemas(
    x_user_email: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """List all saved AI schemas for a user."""
    if not x_user_email:
        raise HTTPException(status_code=401, detail="X-User-Email header required")
    
    schemas = database_service.get_user_schemas(db, x_user_email)
    return [
        {
            "id": str(s.id),
            "prompt": s.prompt,
            "dialect": s.dialect,
            "schema_data": s.schema_data,
            "created_at": s.created_at.isoformat()
        }
        for s in schemas
    ]

@app.get("/api/schemas/{schema_id}")
async def get_generated_schema(
    schema_id: str,
    x_user_email: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """Get a specific generated schema."""
    schema = database_service.get_generated_schema(db, schema_id)
    if not schema:
        raise HTTPException(status_code=404, detail="Schema not found")
        
    return {
        "id": str(schema.id),
        "prompt": schema.prompt,
        "dialect": schema.dialect,
        "schema_data": schema.schema_data,
        "created_at": schema.created_at.isoformat()
    }

# ==================== Customer Endpoints ====================

@app.post("/api/customers", response_model=CustomerResponse)
async def create_customer(customer: CustomerCreate, db: Session = Depends(get_db)):
    """Create a new customer."""
    try:
        new_customer = database_service.create_customer(db, customer.name, customer.email)
        return CustomerResponse(
            id=str(new_customer.id),
            name=new_customer.name,
            email=new_customer.email,
            created_at=new_customer.created_at.isoformat() if new_customer.created_at else ""
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/customers/{customer_id}", response_model=CustomerResponse)
async def get_customer(customer_id: str, db: Session = Depends(get_db)):
    """Get customer by ID."""
    customer = database_service.get_customer(db, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return CustomerResponse(
        id=str(customer.id),
        name=customer.name,
        email=customer.email,
        created_at=customer.created_at.isoformat() if customer.created_at else ""
    )

@app.get("/api/customers")
async def list_customers(db: Session = Depends(get_db)):
    """List all customers."""
    customers = database_service.get_all_customers(db)
    return [
        {
            "id": str(c.id),
            "name": c.name,
            "email": c.email,
            "created_at": c.created_at.isoformat() if c.created_at else ""
        }
        for c in customers
    ]

# ==================== Subscription Endpoints ====================

@app.post("/api/subscriptions", response_model=SubscriptionResponse)
async def create_subscription(subscription: SubscriptionCreate, db: Session = Depends(get_db)):
    """Create a subscription for a customer."""
    try:
        new_subscription = database_service.create_subscription(
            db, subscription.customer_id, subscription.is_active
        )
        return SubscriptionResponse(
            id=str(new_subscription.id),
            customer_id=str(new_subscription.customer_id),
            is_active=new_subscription.is_active
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/customers/{customer_id}/subscriptions")
async def get_customer_subscriptions(customer_id: str, db: Session = Depends(get_db)):
    """Get all subscriptions for a customer."""
    subscriptions = database_service.get_customer_subscriptions(db, customer_id)
    return [
        {
            "id": str(s.id),
            "customer_id": str(s.customer_id),
            "is_active": s.is_active
        }
        for s in subscriptions
    ]

# ==================== Payment Endpoints ====================

@app.post("/api/payments", response_model=PaymentResponse)
async def create_payment(payment: PaymentCreate, db: Session = Depends(get_db)):
    """Create a payment for a subscription."""
    try:
        new_payment = database_service.create_payment(db, payment.subscription_id, payment.amount)
        return PaymentResponse(
            id=str(new_payment.id),
            subscription_id=str(new_payment.subscription_id),
            amount=float(new_payment.amount)
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/subscriptions/{subscription_id}/payments")
async def get_subscription_payments(subscription_id: str, db: Session = Depends(get_db)):
    """Get all payments for a subscription."""
    payments = database_service.get_subscription_payments(db, subscription_id)
    return [
        {
            "id": str(p.id),
            "subscription_id": str(p.subscription_id),
            "amount": float(p.amount)
        }
        for p in payments
    ]

@app.get("/api/customers/{customer_id}/payments")
async def get_customer_payments(customer_id: str, db: Session = Depends(get_db)):
    """Get all payments for a customer (through subscriptions)."""
    payments = database_service.get_customer_payments(db, customer_id)
    return [
        {
            "id": str(p.id),
            "subscription_id": str(p.subscription_id),
            "amount": float(p.amount)
        }
        for p in payments
    ]

# ==================== Activity Log Endpoints ====================

@app.post("/api/activity-logs")
async def log_activity(log: ActivityLogCreate, db: Session = Depends(get_db)):
    """Log an activity for a customer."""
    try:
        activity_log = database_service.log_activity(db, log.customer_id, log.action)
        return {
            "id": activity_log.id,
            "customer_id": str(activity_log.customer_id),
            "action": activity_log.action
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/customers/{customer_id}/activity-logs")
async def get_customer_activity_logs(customer_id: str, db: Session = Depends(get_db)):
    """Get all activity logs for a customer."""
    logs = database_service.get_customer_activity_logs(db, customer_id)
    return [
        {
            "id": log.id,
            "customer_id": str(log.customer_id),
            "action": log.action
        }
        for log in logs
    ]

# ==================== Full Profile Endpoint ====================

@app.get("/api/customers/{customer_id}/profile")
async def get_customer_profile(customer_id: str, db: Session = Depends(get_db)):
    """Get complete customer profile with all relationships."""
    profile = database_service.get_customer_full_profile(db, customer_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Customer not found")
    return profile


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
