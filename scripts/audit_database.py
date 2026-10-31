import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))
from db import engine
from sqlalchemy import text

with engine.connect() as conn:
    # Check current db and user
    info = conn.execute(text("SELECT current_database(), current_user, inet_server_addr(), version();")).mappings().first()
    print("Database connection info:")
    print(f"  Database: {info['current_database']}")
    print(f"  User: {info['current_user']}")
    print(f"  Version: {info['version']}")

    # Get all tables in public schema
    query = text("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
    """)
    tables = conn.execute(query).fetchall()
    
    print(f"\nTotal tables found in 'public' schema: {len(tables)}")
    total_rows_across_db = 0
    for (t,) in tables:
        try:
            count = conn.execute(text(f'SELECT COUNT(*) FROM "{t}";')).scalar()
            print(f"  - {t}: {count} rows")
            total_rows_across_db += count
        except Exception as e:
            print(f"  - {t}: ERROR ({e})")

    print(f"\nTotal rows in all tables combined: {total_rows_across_db}")
