from sqlalchemy.orm import Session
from core.chat_models import User, Conversation, Message, GeneratedSchema, SQLFile, SchemaVersion, ExportHistory
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
import json

class ChatService:
    """Service for managing chat conversations, messages, and schema generation."""
    
    # ==================== USER OPERATIONS ====================
    
    @staticmethod
    def create_user(db: Session, email: str, password_hash: str, full_name: str = None) -> User:
        """Create a new user."""
        user = User(email=email, password_hash=password_hash, full_name=full_name)
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    
    @staticmethod
    def get_user_by_email(db: Session, email: str) -> Optional[User]:
        """Get user by email."""
        return db.query(User).filter(User.email == email).first()
    
    @staticmethod
    def get_user_by_id(db: Session, user_id: str) -> Optional[User]:
        """Get user by ID."""
        return db.query(User).filter(User.id == uuid.UUID(user_id)).first()
    
    # ==================== CONVERSATION OPERATIONS ====================
    
    @staticmethod
    def create_conversation(db: Session, user_id: str, title: str = None, description: str = None, dialect: str = "postgresql") -> Conversation:
        """Create a new conversation."""
        conversation = Conversation(
            user_id=uuid.UUID(user_id),
            title=title,
            description=description,
            dialect=dialect
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
        return conversation
    
    @staticmethod
    def get_conversation(db: Session, conversation_id: str) -> Optional[Conversation]:
        """Get conversation by ID."""
        return db.query(Conversation).filter(Conversation.id == uuid.UUID(conversation_id)).first()
    
    @staticmethod
    def get_user_conversations(db: Session, user_id: str, archived: bool = False) -> List[Conversation]:
        """Get all conversations for a user."""
        query = db.query(Conversation).filter(Conversation.user_id == uuid.UUID(user_id))
        if archived is not None:
            query = query.filter(Conversation.is_archived == archived)
        return query.order_by(Conversation.created_at.desc()).all()
    
    @staticmethod
    def update_conversation(db: Session, conversation_id: str, title: str = None, description: str = None) -> Optional[Conversation]:
        """Update conversation details."""
        conversation = ChatService.get_conversation(db, conversation_id)
        if conversation:
            if title:
                conversation.title = title
            if description:
                conversation.description = description
            conversation.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(conversation)
        return conversation
    
    @staticmethod
    def archive_conversation(db: Session, conversation_id: str) -> Optional[Conversation]:
        """Archive a conversation."""
        conversation = ChatService.get_conversation(db, conversation_id)
        if conversation:
            conversation.is_archived = True
            conversation.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(conversation)
        return conversation
    
    # ==================== MESSAGE OPERATIONS ====================
    
    @staticmethod
    def add_message(db: Session, conversation_id: str, role: str, content: str) -> Message:
        """Add a message to a conversation."""
        if role not in ['user', 'assistant']:
            raise ValueError("Role must be 'user' or 'assistant'")
        
        message = Message(
            conversation_id=uuid.UUID(conversation_id),
            role=role,
            content=content
        )
        db.add(message)
        db.commit()
        db.refresh(message)
        return message
    
    @staticmethod
    def get_conversation_messages(db: Session, conversation_id: str) -> List[Message]:
        """Get all messages in a conversation."""
        return db.query(Message).filter(
            Message.conversation_id == uuid.UUID(conversation_id)
        ).order_by(Message.created_at).all()
    
    @staticmethod
    def get_message(db: Session, message_id: str) -> Optional[Message]:
        """Get a specific message."""
        return db.query(Message).filter(Message.id == uuid.UUID(message_id)).first()
    
    # ==================== SCHEMA OPERATIONS ====================
    
    @staticmethod
    def save_generated_schema(
        db: Session,
        conversation_id: str,
        schema_definition: Dict[str, Any],
        schema_name: str = None,
        message_id: str = None,
        dialect: str = None
    ) -> GeneratedSchema:
        """Save a generated schema."""
        schema = GeneratedSchema(
            conversation_id=uuid.UUID(conversation_id),
            message_id=uuid.UUID(message_id) if message_id else None,
            schema_name=schema_name,
            schema_definition=schema_definition,
            dialect=dialect,
            table_count=len(schema_definition.get('tables', [])),
            relationship_count=len(schema_definition.get('relationships', []))
        )
        db.add(schema)
        db.commit()
        db.refresh(schema)
        return schema
    
    @staticmethod
    def get_generated_schema(db: Session, schema_id: str) -> Optional[GeneratedSchema]:
        """Get a generated schema by ID."""
        return db.query(GeneratedSchema).filter(GeneratedSchema.id == uuid.UUID(schema_id)).first()
    
    @staticmethod
    def get_conversation_schemas(db: Session, conversation_id: str) -> List[GeneratedSchema]:
        """Get all schemas in a conversation."""
        return db.query(GeneratedSchema).filter(
            GeneratedSchema.conversation_id == uuid.UUID(conversation_id)
        ).order_by(GeneratedSchema.created_at.desc()).all()
    
    # ==================== SQL FILE OPERATIONS ====================
    
    @staticmethod
    def save_sql_file(
        db: Session,
        schema_id: str,
        file_name: str,
        sql_content: str,
        dialect: str = None
    ) -> SQLFile:
        """Save a SQL file."""
        sql_file = SQLFile(
            schema_id=uuid.UUID(schema_id),
            file_name=file_name,
            sql_content=sql_content,
            dialect=dialect,
            file_size=len(sql_content.encode('utf-8'))
        )
        db.add(sql_file)
        db.commit()
        db.refresh(sql_file)
        return sql_file
    
    @staticmethod
    def get_sql_file(db: Session, file_id: str) -> Optional[SQLFile]:
        """Get a SQL file by ID."""
        return db.query(SQLFile).filter(SQLFile.id == uuid.UUID(file_id)).first()
    
    @staticmethod
    def get_schema_sql_files(db: Session, schema_id: str) -> List[SQLFile]:
        """Get all SQL files for a schema."""
        return db.query(SQLFile).filter(SQLFile.schema_id == uuid.UUID(schema_id)).all()
    
    # ==================== SCHEMA VERSION OPERATIONS ====================
    
    @staticmethod
    def create_schema_version(
        db: Session,
        schema_id: str,
        schema_definition: Dict[str, Any],
        version_description: str = None
    ) -> SchemaVersion:
        """Create a new version of a schema."""
        # Get current version number
        latest_version = db.query(SchemaVersion).filter(
            SchemaVersion.schema_id == uuid.UUID(schema_id)
        ).order_by(SchemaVersion.version_number.desc()).first()
        
        version_number = (latest_version.version_number + 1) if latest_version else 1
        
        version = SchemaVersion(
            schema_id=uuid.UUID(schema_id),
            version_number=version_number,
            schema_definition=schema_definition,
            version_description=version_description
        )
        db.add(version)
        db.commit()
        db.refresh(version)
        return version
    
    @staticmethod
    def get_schema_versions(db: Session, schema_id: str) -> List[SchemaVersion]:
        """Get all versions of a schema."""
        return db.query(SchemaVersion).filter(
            SchemaVersion.schema_id == uuid.UUID(schema_id)
        ).order_by(SchemaVersion.version_number.desc()).all()
    
    # ==================== EXPORT HISTORY OPERATIONS ====================
    
    @staticmethod
    def record_export(
        db: Session,
        user_id: str,
        sql_file_id: str,
        export_format: str = "sql",
        ip_address: str = None
    ) -> ExportHistory:
        """Record when a user exports a SQL file."""
        export = ExportHistory(
            user_id=uuid.UUID(user_id),
            sql_file_id=uuid.UUID(sql_file_id),
            export_format=export_format,
            ip_address=ip_address
        )
        db.add(export)
        db.commit()
        db.refresh(export)
        return export
    
    @staticmethod
    def get_user_export_history(db: Session, user_id: str) -> List[ExportHistory]:
        """Get export history for a user."""
        return db.query(ExportHistory).filter(
            ExportHistory.user_id == uuid.UUID(user_id)
        ).order_by(ExportHistory.exported_at.desc()).all()
    
    # ==================== FULL HISTORY OPERATIONS ====================
    
    @staticmethod
    def get_conversation_full_history(db: Session, conversation_id: str) -> Dict[str, Any]:
        """Get complete conversation history with all related data."""
        conversation = ChatService.get_conversation(db, conversation_id)
        if not conversation:
            return None
        
        messages = ChatService.get_conversation_messages(db, conversation_id)
        schemas = ChatService.get_conversation_schemas(db, conversation_id)
        
        return {
            "conversation": {
                "id": str(conversation.id),
                "title": conversation.title,
                "description": conversation.description,
                "dialect": conversation.dialect,
                "created_at": conversation.created_at.isoformat(),
                "updated_at": conversation.updated_at.isoformat(),
            },
            "messages": [
                {
                    "id": str(msg.id),
                    "role": msg.role,
                    "content": msg.content,
                    "created_at": msg.created_at.isoformat()
                }
                for msg in messages
            ],
            "schemas": [
                {
                    "id": str(schema.id),
                    "schema_name": schema.schema_name,
                    "dialect": schema.dialect,
                    "table_count": schema.table_count,
                    "relationship_count": schema.relationship_count,
                    "created_at": schema.created_at.isoformat(),
                }
                for schema in schemas
            ]
        }

# Singleton instance
chat_service = ChatService()
