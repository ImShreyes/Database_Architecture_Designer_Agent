from typing import List, Optional
from sqlalchemy.orm import Session
from core.database_models import Customer, Subscription, Payment, ActivityLog, Metadata, Audit, GeneratedSchema
import uuid

class DatabaseService:
    """Service for database operations with relationship support."""
    
    # ==================== Customer Operations ====================
    
    @staticmethod
    def create_customer(db: Session, name: str, email: str) -> Customer:
        """Create a new customer."""
        customer = Customer(name=name, email=email)
        db.add(customer)
        db.commit()
        db.refresh(customer)
        return customer
    
    @staticmethod
    def get_customer(db: Session, customer_id: str) -> Optional[Customer]:
        """Get customer by ID."""
        return db.query(Customer).filter(Customer.id == uuid.UUID(customer_id)).first()
    
    @staticmethod
    def get_customer_by_email(db: Session, email: str) -> Optional[Customer]:
        """Get customer by email."""
        return db.query(Customer).filter(Customer.email == email).first()
    
    @staticmethod
    def get_all_customers(db: Session) -> List[Customer]:
        """Get all customers."""
        return db.query(Customer).all()
    
    @staticmethod
    def update_customer(db: Session, customer_id: str, name: str = None, email: str = None) -> Optional[Customer]:
        """Update customer details."""
        customer = DatabaseService.get_customer(db, customer_id)
        if customer:
            if name:
                customer.name = name
            if email:
                customer.email = email
            db.commit()
            db.refresh(customer)
        return customer
    
    @staticmethod
    def delete_customer(db: Session, customer_id: str) -> bool:
        """Delete a customer and all related data."""
        customer = DatabaseService.get_customer(db, customer_id)
        if customer:
            db.delete(customer)
            db.commit()
            return True
        return False
    
    # ==================== Subscription Operations ====================
    
    @staticmethod
    def create_subscription(db: Session, customer_id: str, is_active: bool = True) -> Subscription:
        """Create a subscription for a customer."""
        subscription = Subscription(
            customer_id=uuid.UUID(customer_id),
            is_active=is_active
        )
        db.add(subscription)
        db.commit()
        db.refresh(subscription)
        return subscription
    
    @staticmethod
    def get_subscription(db: Session, subscription_id: str) -> Optional[Subscription]:
        """Get subscription by ID."""
        return db.query(Subscription).filter(Subscription.id == uuid.UUID(subscription_id)).first()
    
    @staticmethod
    def get_customer_subscriptions(db: Session, customer_id: str) -> List[Subscription]:
        """Get all subscriptions for a customer."""
        return db.query(Subscription).filter(Subscription.customer_id == uuid.UUID(customer_id)).all()
    
    @staticmethod
    def update_subscription_status(db: Session, subscription_id: str, is_active: bool) -> Optional[Subscription]:
        """Update subscription status."""
        subscription = DatabaseService.get_subscription(db, subscription_id)
        if subscription:
            subscription.is_active = is_active
            db.commit()
            db.refresh(subscription)
        return subscription
    
    # ==================== Payment Operations ====================
    
    @staticmethod
    def create_payment(db: Session, subscription_id: str, amount: float) -> Payment:
        """Create a payment for a subscription."""
        if amount <= 0:
            raise ValueError("Amount must be positive")
        payment = Payment(
            subscription_id=uuid.UUID(subscription_id),
            amount=amount
        )
        db.add(payment)
        db.commit()
        db.refresh(payment)
        return payment
    
    @staticmethod
    def get_payment(db: Session, payment_id: str) -> Optional[Payment]:
        """Get payment by ID."""
        return db.query(Payment).filter(Payment.id == uuid.UUID(payment_id)).first()
    
    @staticmethod
    def get_subscription_payments(db: Session, subscription_id: str) -> List[Payment]:
        """Get all payments for a subscription."""
        return db.query(Payment).filter(Payment.subscription_id == uuid.UUID(subscription_id)).all()
    
    @staticmethod
    def get_customer_payments(db: Session, customer_id: str) -> List[Payment]:
        """Get all payments for a customer (through subscriptions)."""
        customer = DatabaseService.get_customer(db, customer_id)
        if not customer:
            return []
        
        payments = []
        for subscription in customer.subscriptions:
            payments.extend(subscription.payments)
        return payments
    
    # ==================== Activity Log Operations ====================
    
    @staticmethod
    def log_activity(db: Session, customer_id: str, action: str) -> ActivityLog:
        """Log an activity for a customer."""
        log = ActivityLog(
            customer_id=uuid.UUID(customer_id),
            action=action
        )
        db.add(log)
        db.commit()
        db.refresh(log)
        return log
    
    @staticmethod
    def get_customer_activity_logs(db: Session, customer_id: str) -> List[ActivityLog]:
        """Get all activity logs for a customer."""
        return db.query(ActivityLog).filter(ActivityLog.customer_id == uuid.UUID(customer_id)).all()
    
    # ==================== Metadata Operations ====================
    
    @staticmethod
    def set_metadata(db: Session, key: str, value) -> Metadata:
        """Set or update metadata."""
        metadata = db.query(Metadata).filter(Metadata.key == key).first()
        if not metadata:
            metadata = Metadata(key=key, value=value)
            db.add(metadata)
        else:
            metadata.value = value
        db.commit()
        db.refresh(metadata)
        return metadata
    
    @staticmethod
    def get_metadata(db: Session, key: str) -> Optional[Metadata]:
        """Get metadata by key."""
        return db.query(Metadata).filter(Metadata.key == key).first()
    
    # ==================== Audit Operations ====================
    
    @staticmethod
    def create_audit(db: Session, checksum: str) -> Audit:
        """Create an audit entry."""
        audit = Audit(checksum=checksum)
        db.add(audit)
        db.commit()
        db.refresh(audit)
        return audit
    
    @staticmethod
    def get_audit(db: Session, audit_id: int) -> Optional[Audit]:
        """Get audit entry by ID."""
        return db.query(Audit).filter(Audit.id == audit_id).first()
    
    # ==================== Relationship-based Queries ====================
    
    @staticmethod
    def get_customer_full_profile(db: Session, customer_id: str) -> dict:
        """Get complete customer profile with all relationships."""
        customer = DatabaseService.get_customer(db, customer_id)
        if not customer:
            return None
        
        return {
            "customer": {
                "id": str(customer.id),
                "name": customer.name,
                "email": customer.email,
                "created_at": customer.created_at.isoformat() if customer.created_at else None
            },
            "subscriptions": [
                {
                    "id": str(sub.id),
                    "is_active": sub.is_active,
                    "payments": [
                        {
                            "id": str(payment.id),
                            "amount": float(payment.amount)
                        }
                        for payment in sub.payments
                    ]
                }
                for sub in customer.subscriptions
            ],
            "activity_logs": [
                {
                    "id": log.id,
                    "action": log.action
                }
                for log in customer.activity_logs
            ]
        }

    # ==================== Generated Schema Operations ====================

    @staticmethod
    def save_schema(db: Session, user_email: str, prompt: str, dialect: str, schema_data: dict) -> GeneratedSchema:
        """Save a generated schema."""
        schema = GeneratedSchema(
            user_email=user_email,
            prompt=prompt,
            dialect=dialect,
            schema_data=schema_data
        )
        db.add(schema)
        db.commit()
        db.refresh(schema)
        return schema
        
    @staticmethod
    def get_user_schemas(db: Session, user_email: str) -> List[GeneratedSchema]:
        """Get all schemas generated by a user."""
        return db.query(GeneratedSchema).filter(GeneratedSchema.user_email == user_email).order_by(GeneratedSchema.created_at.desc()).all()
        
    @staticmethod
    def get_generated_schema(db: Session, schema_id: str) -> Optional[GeneratedSchema]:
        """Get a specific generated schema."""
        return db.query(GeneratedSchema).filter(GeneratedSchema.id == uuid.UUID(schema_id)).first()

# Create a singleton instance
database_service = DatabaseService()
