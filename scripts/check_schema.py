"""
Check what tables exist in the DB
"""
from sqlalchemy import create_engine, text

e = create_engine(
    "postgresql://supplysense_admin:secure_supplysense_pwd_2026@localhost:5432/supplysense"
)

with e.connect() as conn:
    r = conn.execute(text(
        "SELECT table_name FROM information_schema.tables "
        "WHERE table_schema='public' ORDER BY table_name"
    ))
    print("Tables in database:")
    for row in r:
        print(f"  {row[0]}")
