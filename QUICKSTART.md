# Database Agent - Quick Start Guide

## Overview

Your Database Agent has:
1. **Frontend** - Landing page, login, and schema editor
2. **Backend** - Python API with AI schema generation
3. **Database** - Complete schema for storing users, conversations, and schemas
4. **Authentication** - Login system with session management

---

## Setup Instructions

### 1. Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/database_agent
# or for MySQL:
# DATABASE_URL=mysql://user:password@localhost:3306/database_agent
# or for SQLite:
# DATABASE_URL=sqlite:///./database_agent.db

# LLM API Keys (choose one)
GROQ_API_KEY=your_groq_api_key
# GEMINI_API_KEY=your_gemini_api_key
# OPENAI_API_KEY=your_openai_api_key
```

### 2. Database Setup

#### Option A: PostgreSQL (Recommended)

```bash
# Create database
psql -U postgres
CREATE DATABASE database_agent;
\q

# Run schema
psql -U postgres -d database_agent -f database_schema_postgresql.sql

# Or use Python
cd backend
python init_db.py
```

#### Option B: MySQL

```bash
# Create database
mysql -u root -p
CREATE DATABASE database_agent;
EXIT;

# Run schema
mysql -u root -p database_agent < database_schema_mysql.sql

# Or use Python
cd backend
python init_db.py
```

#### Option C: SQLite (Development)

```bash
# Just set DATABASE_URL in .env to sqlite path
DATABASE_URL=sqlite:///./database_agent.db

# Then run
cd backend
python init_db.py
```

### 3. Backend Setup

```bash
# Navigate to backend
cd backend

# Activate virtual environment
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Initialize database
python init_db.py

# Run server
python main.py
```

Server will be available at: `http://localhost:8000`

### 4. Frontend Setup

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

Frontend will be available at: `http://localhost:5173`

---

## Database Schema

### Tables

| Table | Purpose |
|-------|---------|
| `users` | User authentication and profiles |
| `conversations` | Chat sessions |
| `messages` | User prompts and AI responses |
| `generated_schemas` | Schema definitions created by AI |
| `sql_files` | Exported SQL DDL files |
| `schema_versions` | Version history of schemas |
| `export_history` | Audit trail of exports |

See `DATABASE_SCHEMA.md` for detailed documentation and 50+ example queries.

---

## API Endpoints

### Health Check
```
GET /api/health
```

### Schema Generation
```
POST /api/generate-schema
Body: {
  "prompt": "Create a database for an e-commerce store",
  "dialect": "postgresql",
  "additionalContext": "Use UUID for IDs"
}
Response: {
  "schema": {...},
  "success": true
}
```

### User Management (To be integrated)
```
POST /api/users - Create user
GET /api/users/{id} - Get user
POST /api/conversations - Create conversation
GET /api/conversations/{id} - Get conversation
POST /api/messages - Add message
GET /api/schemas/{id} - Get generated schema
```

---

## Frontend Routes

| Route | Purpose | Auth Required |
|-------|---------|----------------|
| `/` | Landing page | No |
| `/login` | Login page | No |
| `/app` | Schema editor | Yes |

### Demo Login Credentials
- Email: `demo@example.com`
- Password: `demo123`

(Or use any valid email/password - no backend validation yet)

---

## Usage Flow

1. **Visit** `http://localhost:5173/`
2. **Click** "Get Started" or go to `/login`
3. **Login** with any email/password (demo@example.com / demo123)
4. **Access** the editor at `/app`
5. **Describe** your database requirement
6. **View** generated schema diagram
7. **Export** SQL file

---

## Project Structure

```
.
├── backend/
│   ├── core/
│   │   ├── models.py           # Schema definition models
│   │   ├── chat_models.py      # Chat/conversation models (NEW)
│   │   ├── database_models.py  # Relationship models
│   │   ├── database.py         # DB connection
│   │   └── prompts.py          # LLM prompts
│   ├── services/
│   │   ├── ai_service.py       # LLM integration
│   │   ├── chat_service.py     # Chat/conversation CRUD (NEW)
│   │   └── database_service.py # Relationship CRUD
│   ├── main.py                 # FastAPI app
│   ├── requirements.txt
│   └── init_db.py              # Database initialization (NEW)
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LandingPage.tsx # Landing page
│   │   │   ├── LoginPage.tsx   # Login
│   │   │   └── EditorApp.tsx   # Schema editor
│   │   ├── context/
│   │   │   └── AuthContext.tsx # Auth state
│   │   ├── components/
│   │   ├── App.tsx             # Router setup
│   │   └── main.tsx            # Entry point
│   └── package.json
│
├── database_schema_postgresql.sql  # Schema (NEW)
├── database_schema_mysql.sql       # Schema (NEW)
├── database_schema_sqlite.sql      # Schema (NEW)
├── DATABASE_SCHEMA.md              # Documentation (NEW)
└── README.md
```

---

## Common Issues

### "Database_Agent_frontend" doesn't have react-router-dom

Solution:
```bash
cd frontend
npm install react-router-dom
```

### "DATABASE_URL not set"

Solution: Create `.env` file in `backend/` with:
```
DATABASE_URL=postgresql://user:password@localhost:5432/database_agent
```

### Port already in use

Backend (port 8000):
```bash
python main.py --port 8001
```

Frontend (port 5173):
```bash
npm run dev -- --port 3000
```

### Can't login

Current auth is basic (accepts any email/password). Make sure to:
1. Fill in email field (valid email format)
2. Fill in password field (any value)
3. Try demo@example.com / demo123

---

## Next Steps

1. ✅ Database schema created
2. ✅ Landing page built
3. ✅ Login system setup
4. ⬜ Connect chat history to database
5. ⬜ Add real authentication (password hashing, JWT tokens)
6. ⬜ Integrate chat messages with backend
7. ⬜ Save generated schemas to database
8. ⬜ Export SQL files and track history

---

## Testing

### Test Backend
```bash
cd backend
pytest  # (if pytest is installed)
```

### Test Frontend
```bash
cd frontend
npm run lint
```

### Manual Testing
1. Start both frontend and backend
2. Visit http://localhost:5173
3. Click "Get Started"
4. Login with any email/password
5. Access the schema editor
6. Test generating a schema

---

## Performance Tips

1. **Database Indexes** - All tables have proper indexes
2. **Archive Conversations** - Old conversations can be archived to reduce query size
3. **Pagination** - Use LIMIT/OFFSET for large datasets
4. **Caching** - Consider caching frequently accessed schemas
5. **Connection Pooling** - SQLAlchemy handles this automatically

---

## Security Considerations

⚠️ **Current limitations** (implement for production):

1. **Authentication** - Add proper JWT token-based auth
2. **Password Hashing** - Use bcrypt for password storage
3. **API Keys** - Don't expose LLM API keys to frontend
4. **CORS** - Restrict to specific domains
5. **Rate Limiting** - Implement rate limiting on API
6. **Data Validation** - Add stricter input validation
7. **SQL Injection** - SQLAlchemy ORM prevents this by default

---

## Support & Troubleshooting

For detailed database queries and operations, see:
- `DATABASE_SCHEMA.md` - 50+ example queries
- `services/chat_service.py` - Python CRUD methods
- `backend/core/chat_models.py` - Data models

---

## License

MIT
