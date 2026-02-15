# Database Architect Agent

An advanced, AI-powered system that generates comprehensive database schemas from natural language descriptions. Designed with a professional enterprise aesthetic, this agent delivers production-ready SQL and Mermaid entity-relationship diagrams instantly.

## 🚀 Features

- **🤖 Intelligent Schema Generation**: Powered by OpenAI's GPT-4 Turbo (or advanced mock logic), acting as a Senior Database Architect.
- **🎨 Enterprise UI**: A clean, modern interface featuring a specific "Blue/Slate" professional theme.
- **🔄 Dual-Dialect Support**: Generate optimized SQL for **PostgreSQL**, **MySQL**, **SQLite**, and **SQL Server**.
- **📊 Interactive Visualization**: Automatically compiles generic schemas into **Mermaid.js** ER diagrams for instant clarity.
- **⚡ Real-time Compilation**: See the generated SQL code side-by-side with the visual diagram.
- **🔒 Secure & Exportable**: Download your schema as a `.sql` file or copy it directly to your clipboard.

## 🏗 Architecture

The application is built on a robust modern stack:

- **Frontend**: React + TypeScript + Vite + Tailwind CSS (v4) + Zustand + Mermaid.js
- **Backend**: Python FastAPI + Pydantic + OpenAI SDK + Python-Dotenv

### Workflow

1.  **User Input**: You describe your data requirements (e.g., "A multi-vendor e-commerce platform").
2.  **AI Orchestration**: The backend constructs a "Senior Architect" system prompt and queries the LLM.
3.  **Structured IR**: The AI returns a strict JSON Intermediate Representation (IR) of the schema.
4.  **Compilation**: The frontend compiles this IR into both SQL DDL statements and Mermaid diagram syntax.
5.  **Visualization**: The UI renders the diagram and SQL editor for user review.

## 🛠 Prerequisites

- Node.js 18+
- Python 3.10+
- OpenAI API Key (optional, defaults to advanced mock generator if missing)

## 🏁 Getting Started

### 1. Backend Setup

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Configure Environment
# Create a .env file and add your API key:
# OPENAI_API_KEY=sk-proj-...
# (If skipped, the system uses a Mock Generator for demo purposes)

# Run the server
python main.py
```

_The API runs at `http://localhost:8000`_

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run the development server
npm run dev
```

_The application runs at `http://localhost:5173`_

## 💡 Usage

1.  Open `http://localhost:5173`.
2.  In the prompt box, enter a description like:
    > "Design a database for a blog with users, posts, comments, and tags."
3.  Select your target SQL Dialect (e.g., PostgreSQL).
4.  Click **Generate**.
5.  Review the **SQL Code** and **Schema Diagram** in the results pane.
6.  Click **Download SQL File** to save your schema.

## 📄 License

MIT License
