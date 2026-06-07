-- ==================== USERS TABLE ====================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- ==================== CONVERSATIONS TABLE ====================
-- Stores chat sessions/conversations
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255),
    description TEXT,
    dialect VARCHAR(50) DEFAULT 'postgresql', -- mysql, postgresql, sqlite, sqlserver
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_archived BOOLEAN DEFAULT FALSE
);

-- ==================== MESSAGES TABLE ====================
-- Stores chat messages (user prompts and AI responses)
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL, -- 'user' or 'assistant'
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==================== GENERATED SCHEMAS TABLE ====================
-- Stores the generated schema definitions
CREATE TABLE generated_schemas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    schema_name VARCHAR(255),
    schema_definition JSONB NOT NULL, -- Full schema JSON
    dialect VARCHAR(50),
    table_count INTEGER,
    relationship_count INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==================== SQL FILES TABLE ====================
-- Stores the exported SQL files
CREATE TABLE sql_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schema_id UUID NOT NULL REFERENCES generated_schemas(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    sql_content TEXT NOT NULL, -- The actual SQL DDL code
    dialect VARCHAR(50), -- mysql, postgresql, sqlite, sqlserver
    file_size INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==================== SCHEMA VERSIONS TABLE ====================
-- Track versions of schemas (in case user modifies them)
CREATE TABLE schema_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schema_id UUID NOT NULL REFERENCES generated_schemas(id) ON DELETE CASCADE,
    version_number INTEGER,
    schema_definition JSONB NOT NULL,
    version_description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==================== EXPORT HISTORY TABLE ====================
-- Track when users export/download SQL files
CREATE TABLE export_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sql_file_id UUID NOT NULL REFERENCES sql_files(id) ON DELETE CASCADE,
    export_format VARCHAR(50), -- 'sql', 'pdf', 'ddl', etc.
    exported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(50)
);

-- ==================== INDEXES ====================
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_created_at ON conversations(created_at);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_generated_schemas_conversation_id ON generated_schemas(conversation_id);
CREATE INDEX idx_sql_files_schema_id ON sql_files(schema_id);
CREATE INDEX idx_export_history_user_id ON export_history(user_id);
CREATE INDEX idx_users_email ON users(email);

-- ==================== CONSTRAINTS ====================
ALTER TABLE messages ADD CONSTRAINT check_message_role 
    CHECK (role IN ('user', 'assistant'));

ALTER TABLE conversations ADD CONSTRAINT check_dialect 
    CHECK (dialect IN ('mysql', 'postgresql', 'sqlite', 'sqlserver', 'oracle', 'mariadb'));

ALTER TABLE sql_files ADD CONSTRAINT check_file_dialect 
    CHECK (dialect IN ('mysql', 'postgresql', 'sqlite', 'sqlserver', 'oracle', 'mariadb'));
