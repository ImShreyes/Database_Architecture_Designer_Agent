"""
Database initialization script.
Run this after configuring your DATABASE_URL to set up all tables.
"""

from core.database import init_db, engine
from core.chat_models import Base
from core.database_models import Base as DatabaseBase

def initialize_all_databases():
    """Initialize all database tables."""
    print("Initializing database tables...")
    
    # Create all tables from chat_models
    Base.metadata.create_all(bind=engine)
    print("✓ Chat models tables created")
    
    # Create all tables from database_models (if needed)
    DatabaseBase.metadata.create_all(bind=engine)
    print("✓ Database relationship tables created")
    
    print("\n✅ Database initialization complete!")
    print("\nCreated tables:")
    print("  - users")
    print("  - conversations")
    print("  - messages")
    print("  - generated_schemas")
    print("  - sql_files")
    print("  - schema_versions")
    print("  - export_history")
    print("  - (plus relationship tables from database_models)")

if __name__ == "__main__":
    try:
        initialize_all_databases()
    except Exception as e:
        print(f"❌ Error initializing database: {e}")
        raise
