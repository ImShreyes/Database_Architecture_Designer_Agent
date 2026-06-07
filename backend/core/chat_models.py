from sqlalchemy import Column, String, Text, DateTime, Boolean, Integer, ForeignKey, JSON, CheckConstraint, func
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime

Base = declarative_base()

class User(Base):
    """User model - stores user authentication and profile info."""
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255))
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
    is_active = Column(Boolean, default=True)
    
    # Relationships
    conversations = relationship("Conversation", back_populates="user", cascade="all, delete-orphan")
    exports = relationship("ExportHistory", back_populates="user", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, full_name={self.full_name})>"


class Conversation(Base):
    """Conversation model - stores chat sessions."""
    __tablename__ = "conversations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255))
    description = Column(Text)
    dialect = Column(String(50), default="postgresql")
    created_at = Column(DateTime, server_default=func.now(), nullable=False, index=True)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
    is_archived = Column(Boolean, default=False)
    
    # Relationships
    user = relationship("User", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")
    schemas = relationship("GeneratedSchema", back_populates="conversation", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Conversation(id={self.id}, title={self.title}, user_id={self.user_id})>"


class Message(Base):
    """Message model - stores chat messages (prompts and responses)."""
    __tablename__ = "messages"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(20), nullable=False)  # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Constraints
    __table_args__ = (
        CheckConstraint("role IN ('user', 'assistant')", name="check_message_role"),
    )
    
    # Relationships
    conversation = relationship("Conversation", back_populates="messages")
    schema = relationship("GeneratedSchema", back_populates="message", uselist=False)
    
    def __repr__(self):
        return f"<Message(id={self.id}, role={self.role}, conversation_id={self.conversation_id})>"


class GeneratedSchema(Base):
    """GeneratedSchema model - stores the generated schema definitions."""
    __tablename__ = "generated_schemas"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    message_id = Column(UUID(as_uuid=True), ForeignKey("messages.id", ondelete="SET NULL"), index=True)
    schema_name = Column(String(255))
    schema_definition = Column(JSON, nullable=False)  # Full schema JSON
    dialect = Column(String(50))
    table_count = Column(Integer)
    relationship_count = Column(Integer)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    conversation = relationship("Conversation", back_populates="schemas")
    message = relationship("Message", back_populates="schema")
    sql_files = relationship("SQLFile", back_populates="schema", cascade="all, delete-orphan")
    versions = relationship("SchemaVersion", back_populates="schema", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<GeneratedSchema(id={self.id}, schema_name={self.schema_name}, dialect={self.dialect})>"


class SQLFile(Base):
    """SQLFile model - stores the exported SQL files."""
    __tablename__ = "sql_files"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    schema_id = Column(UUID(as_uuid=True), ForeignKey("generated_schemas.id", ondelete="CASCADE"), nullable=False, index=True)
    file_name = Column(String(255), nullable=False)
    sql_content = Column(Text, nullable=False)  # The actual SQL DDL code
    dialect = Column(String(50))
    file_size = Column(Integer)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    schema = relationship("GeneratedSchema", back_populates="sql_files")
    exports = relationship("ExportHistory", back_populates="sql_file", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<SQLFile(id={self.id}, file_name={self.file_name}, dialect={self.dialect})>"


class SchemaVersion(Base):
    """SchemaVersion model - tracks versions of schemas."""
    __tablename__ = "schema_versions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    schema_id = Column(UUID(as_uuid=True), ForeignKey("generated_schemas.id", ondelete="CASCADE"), nullable=False, index=True)
    version_number = Column(Integer, nullable=False)
    schema_definition = Column(JSON, nullable=False)
    version_description = Column(Text)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    
    # Relationships
    schema = relationship("GeneratedSchema", back_populates="versions")
    
    def __repr__(self):
        return f"<SchemaVersion(id={self.id}, schema_id={self.schema_id}, version={self.version_number})>"


class ExportHistory(Base):
    """ExportHistory model - tracks when users export SQL files."""
    __tablename__ = "export_history"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    sql_file_id = Column(UUID(as_uuid=True), ForeignKey("sql_files.id", ondelete="CASCADE"), nullable=False)
    export_format = Column(String(50))  # 'sql', 'pdf', 'ddl', etc.
    exported_at = Column(DateTime, server_default=func.now(), nullable=False, index=True)
    ip_address = Column(String(50))
    
    # Relationships
    user = relationship("User", back_populates="exports")
    sql_file = relationship("SQLFile", back_populates="exports")
    
    def __repr__(self):
        return f"<ExportHistory(id={self.id}, user_id={self.user_id}, exported_at={self.exported_at})>"
