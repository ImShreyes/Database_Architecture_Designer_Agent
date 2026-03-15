from sqlalchemy import Column, String, Integer, Text, Boolean, DateTime, JSON, Numeric, ForeignKey, LargeBinary, create_engine, UniqueConstraint, CheckConstraint
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid
from datetime import datetime

Base = declarative_base()

class Customer(Base):
    """Customers table with relationships to subscriptions and activity logs."""
    __tablename__ = "customers"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    email = Column(Text, unique=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    subscriptions = relationship("Subscription", back_populates="customer", cascade="all, delete-orphan")
    activity_logs = relationship("ActivityLog", back_populates="customer", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Customer(id={self.id}, name={self.name}, email={self.email})>"


class Subscription(Base):
    """Subscriptions table - belongs to Customer, has many Payments."""
    __tablename__ = "subscriptions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Relationships
    customer = relationship("Customer", back_populates="subscriptions")
    payments = relationship("Payment", back_populates="subscription", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Subscription(id={self.id}, customer_id={self.customer_id}, is_active={self.is_active})>"


class Payment(Base):
    """Payments table - belongs to Subscription."""
    __tablename__ = "payments"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    subscription_id = Column(UUID(as_uuid=True), ForeignKey("subscriptions.id", ondelete="CASCADE"), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    
    # Constraint: Amount must be positive
    __table_args__ = (
        CheckConstraint("amount > 0", name="CHK_Amount_Positive"),
    )
    
    # Relationships
    subscription = relationship("Subscription", back_populates="payments")
    
    def __repr__(self):
        return f"<Payment(id={self.id}, subscription_id={self.subscription_id}, amount={self.amount})>"


class ActivityLog(Base):
    """Activity logs - tracks customer actions."""
    __tablename__ = "activity_logs"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False)
    action = Column(Text, nullable=False)
    
    # Relationships
    customer = relationship("Customer", back_populates="activity_logs")
    
    def __repr__(self):
        return f"<ActivityLog(id={self.id}, customer_id={self.customer_id}, action={self.action})>"


class Metadata(Base):
    """Metadata key-value store."""
    __tablename__ = "metadata"
    
    key = Column(String, primary_key=True)
    value = Column(JSON, nullable=True)
    
    def __repr__(self):
        return f"<Metadata(key={self.key}, value={self.value})>"


class Audit(Base):
    """Audit trail for data integrity."""
    __tablename__ = "audits"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    checksum = Column(String(64), nullable=False, unique=True)
    
    def __repr__(self):
        return f"<Audit(id={self.id}, checksum={self.checksum})>"


# Constraint for Customer subscriptions
Customer.__table_args__ = (
    UniqueConstraint('email', name='UK_Customer_Email'),
    CheckConstraint('name != \'\'', name='CHK_Customer_Name_NotEmpty'),
)

# Foreign key constraint for subscription customer relationship
Subscription.__table_args__ = (
    UniqueConstraint('customer_id', 'id', name='UK_Customer_Subscription'),
)
