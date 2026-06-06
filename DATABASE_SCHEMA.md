# Database Schema Documentation

## Overview

This database is designed to store:
- **Users** - Authentication and user profiles
- **Conversations** - Chat sessions for database design
- **Messages** - User prompts and AI responses
- **Generated Schemas** - Schema definitions created by the AI
- **SQL Files** - Exported SQL DDL files
- **Schema Versions** - Version history of schemas
- **Export History** - Audit trail of exports

---

## Table Descriptions

### 1. **users**
Stores user authentication and profile information.

```sql
-- Get user profile
SELECT * FROM users WHERE email = 'user@example.com';

-- Count active users
SELECT COUNT(*) FROM users WHERE is_active = TRUE;

-- Get user with all conversations
SELECT u.*, COUNT(c.id) as conversation_count
FROM users u
LEFT JOIN conversations c ON u.id = c.user_id
WHERE u.id = 'user-uuid'
GROUP BY u.id;
```

---

### 2. **conversations**
Chat sessions where users and AI collaborate on database design.

```sql
-- Get user's recent conversations
SELECT * FROM conversations 
WHERE user_id = 'user-uuid' AND is_archived = FALSE
ORDER BY created_at DESC
LIMIT 10;

-- Count conversations by dialect
SELECT dialect, COUNT(*) as count
FROM conversations
GROUP BY dialect;

-- Get active conversations from last 7 days
SELECT * FROM conversations
WHERE created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

---

### 3. **messages**
Individual messages in conversations (prompts and responses).

```sql
-- Get all messages in a conversation
SELECT * FROM messages 
WHERE conversation_id = 'conversation-uuid'
ORDER BY created_at ASC;

-- Count user vs assistant messages
SELECT role, COUNT(*) as count
FROM messages
WHERE conversation_id = 'conversation-uuid'
GROUP BY role;

-- Get longest message content
SELECT * FROM messages
WHERE conversation_id = 'conversation-uuid'
ORDER BY LENGTH(content) DESC
LIMIT 1;
```

---

### 4. **generated_schemas**
Schema definitions created by the AI.

```sql
-- Get latest schema for a conversation
SELECT * FROM generated_schemas
WHERE conversation_id = 'conversation-uuid'
ORDER BY created_at DESC
LIMIT 1;

-- Schemas by dialect
SELECT dialect, COUNT(*) as count, AVG(table_count) as avg_tables
FROM generated_schemas
GROUP BY dialect;

-- Most complex schemas (by table count)
SELECT * FROM generated_schemas
ORDER BY table_count DESC
LIMIT 10;

-- Schema with most relationships
SELECT * FROM generated_schemas
ORDER BY relationship_count DESC
LIMIT 10;
```

---

### 5. **sql_files**
Exported SQL DDL files.

```sql
-- Get all SQL exports for a schema
SELECT * FROM sql_files
WHERE schema_id = 'schema-uuid'
ORDER BY created_at DESC;

-- Files by dialect
SELECT dialect, COUNT(*) as count
FROM sql_files
GROUP BY dialect;

-- Largest SQL files
SELECT file_name, file_size, dialect
FROM sql_files
ORDER BY file_size DESC
LIMIT 10;

-- Get SQL file content for a schema
SELECT sql_content FROM sql_files
WHERE schema_id = 'schema-uuid'
AND dialect = 'postgresql'
LIMIT 1;
```

---

### 6. **schema_versions**
Version history of schemas (track modifications).

```sql
-- Get all versions of a schema
SELECT version_number, version_description, created_at
FROM schema_versions
WHERE schema_id = 'schema-uuid'
ORDER BY version_number DESC;

-- Compare two schema versions
SELECT v1.version_definition, v2.version_definition
FROM schema_versions v1
JOIN schema_versions v2 ON v1.schema_id = v2.schema_id
WHERE v1.schema_id = 'schema-uuid'
AND v1.version_number = 1
AND v2.version_number = 2;
```

---

### 7. **export_history**
Audit trail of when users export schemas.

```sql
-- Get user's export history
SELECT eh.export_format, COUNT(*) as count
FROM export_history eh
WHERE eh.user_id = 'user-uuid'
GROUP BY export_format;

-- Exports by date
SELECT DATE(exported_at) as date, COUNT(*) as count
FROM export_history
GROUP BY DATE(exported_at)
ORDER BY date DESC;

-- Most downloaded schemas
SELECT sf.file_name, COUNT(eh.id) as download_count
FROM sql_files sf
LEFT JOIN export_history eh ON sf.id = eh.sql_file_id
GROUP BY sf.id
ORDER BY download_count DESC
LIMIT 10;
```

---

## Complex Queries

### Get Complete User Journey
```sql
SELECT 
    u.email,
    COUNT(DISTINCT c.id) as total_conversations,
    COUNT(DISTINCT m.id) as total_messages,
    COUNT(DISTINCT gs.id) as schemas_created,
    COUNT(DISTINCT sf.id) as sql_files_exported
FROM users u
LEFT JOIN conversations c ON u.id = c.user_id
LEFT JOIN messages m ON c.id = m.conversation_id
LEFT JOIN generated_schemas gs ON c.id = gs.conversation_id
LEFT JOIN sql_files sf ON gs.id = sf.schema_id
WHERE u.id = 'user-uuid'
GROUP BY u.id;
```

### Get Conversation with Latest Schema and SQL
```sql
SELECT 
    c.id as conversation_id,
    c.title,
    c.dialect,
    gs.schema_name,
    gs.table_count,
    gs.relationship_count,
    sf.file_name,
    sf.dialect as file_dialect
FROM conversations c
LEFT JOIN generated_schemas gs ON c.id = gs.conversation_id 
    AND gs.created_at = (
        SELECT MAX(created_at) 
        FROM generated_schemas 
        WHERE conversation_id = c.id
    )
LEFT JOIN sql_files sf ON gs.id = sf.schema_id
WHERE c.id = 'conversation-uuid';
```

### User Activity Report
```sql
SELECT 
    u.email,
    c.title as conversation,
    COUNT(m.id) as message_count,
    MAX(m.created_at) as last_activity,
    COUNT(DISTINCT gs.id) as schema_versions
FROM users u
JOIN conversations c ON u.id = c.user_id
LEFT JOIN messages m ON c.id = m.conversation_id
LEFT JOIN generated_schemas gs ON c.id = gs.conversation_id
GROUP BY u.id, c.id
ORDER BY MAX(m.created_at) DESC;
```

---

## Setup Instructions

### PostgreSQL
```bash
psql -U your_user -d your_database -f database_schema_postgresql.sql
```

### MySQL
```bash
mysql -u your_user -p your_database < database_schema_mysql.sql
```

### SQLite
```bash
sqlite3 database.db < database_schema_sqlite.sql
```

---

## Environment Variables

Set these in your `.env` file:

```env
# PostgreSQL
DATABASE_URL=postgresql://user:password@localhost:5432/database_agent

# MySQL
DATABASE_URL=mysql://user:password@localhost:3306/database_agent

# SQLite
DATABASE_URL=sqlite:///./database_agent.db
```

---

## Relationships Diagram

```
users (1) ──────→ (many) conversations
users (1) ──────→ (many) export_history
     ↓
conversations (1) ──────→ (many) messages
conversations (1) ──────→ (many) generated_schemas
     ↓
messages (1) ──────→ (0..1) generated_schemas
generated_schemas (1) ──────→ (many) sql_files
generated_schemas (1) ──────→ (many) schema_versions
sql_files (1) ──────→ (many) export_history
```

---

## Python Usage Example

```python
from core.database import SessionLocal
from services.chat_service import chat_service

# Create a database session
db = SessionLocal()

# Create a user
user = chat_service.create_user(
    db, 
    email="user@example.com",
    password_hash="hashed_password",
    full_name="John Doe"
)

# Create a conversation
conversation = chat_service.create_conversation(
    db,
    user_id=str(user.id),
    title="E-commerce Database Design",
    dialect="postgresql"
)

# Add messages
user_msg = chat_service.add_message(
    db,
    conversation_id=str(conversation.id),
    role="user",
    content="Create a database for e-commerce with users, orders, and payments"
)

# Save generated schema
schema = chat_service.save_generated_schema(
    db,
    conversation_id=str(conversation.id),
    schema_definition=schema_dict,
    schema_name="E-commerce Schema",
    message_id=str(user_msg.id),
    dialect="postgresql"
)

# Save SQL file
sql_file = chat_service.save_sql_file(
    db,
    schema_id=str(schema.id),
    file_name="ecommerce_schema.sql",
    sql_content=sql_content,
    dialect="postgresql"
)

# Get complete conversation history
history = chat_service.get_conversation_full_history(db, str(conversation.id))
print(history)
```

---

## Performance Optimization Tips

1. **Indexing** - All foreign keys and frequently queried columns are indexed
2. **Pagination** - Use LIMIT and OFFSET for large datasets
3. **Query Optimization** - Use appropriate WHERE clauses
4. **Archive Old Conversations** - Mark old conversations as archived to reduce query size
5. **Cleanup SQL Files** - Delete old/unused SQL files to save space

---

## Backup & Recovery

```bash
# PostgreSQL backup
pg_dump -U user -d database_agent > backup.sql

# PostgreSQL restore
psql -U user -d database_agent < backup.sql

# MySQL backup
mysqldump -u user -p database_agent > backup.sql

# MySQL restore
mysql -u user -p database_agent < backup.sql
```
