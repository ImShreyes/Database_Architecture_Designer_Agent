from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from core.models import GenerateSchemaRequest, GenerateSchemaResponse
from core.database import init_db, get_db, close_db
from services.ai_service import ai_service
from services.database_service import database_service
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List

app = FastAPI()

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    """Initialize database tables on application startup."""
    init_db()
    print("Database initialized successfully!")

@app.on_event("shutdown")
async def shutdown_event():
    """Close database connection on shutdown."""
    close_db()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, replace with specific origins
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

@app.get("/api/health")
async def health_check():
    provider = "mock"
    if ai_service.chain:
        try:
            # Safely identify the provider if it's set in the chain
            llm_class = ai_service.llm.__class__.__name__
            provider = f"langchain ({llm_class})"
        except:
            provider = "langchain"
    return {"status": "ok", "version": "0.1.0", "ai_provider": provider}

@app.post("/api/generate-schema", response_model=GenerateSchemaResponse)
async def generate_schema(request: GenerateSchemaRequest):
    try:
        # Generate schema using the AI Service (Real or Mock)
        generated_schema = ai_service.generate_schema(
            prompt=request.prompt, 
            dialect=request.dialect,
            additional_context=request.additionalContext
        )

        return GenerateSchemaResponse(schema=generated_schema, success=True)

    except Exception as e:
        print(f"Error generating schema: {e}")
        return GenerateSchemaResponse(success=False, error=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
