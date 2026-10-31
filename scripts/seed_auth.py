"""
scripts/seed_auth.py — Safe, idempotent user seeding for SupplySense
Uses backend.db engine (supports Neon DATABASE_URL and local fallback).
Uses ON CONFLICT (email) DO NOTHING so it can be safely run multiple times.
"""
import os
import sys
import bcrypt
from sqlalchemy import text
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from backend.db import engine

users_data = [
    ("superadmin@supplysense.ai", "Alex Rivera", "super_admin"),
    ("admin@supplysense.ai", "Sam Chen", "admin"),
    ("procurement@supplysense.ai", "Jordan Blake", "procurement_manager"),
    ("warehouse@supplysense.ai", "Morgan Kim", "warehouse_manager"),
    ("analyst@supplysense.ai", "Taylor Singh", "forecast_analyst"),
    ("viewer@supplysense.ai", "Casey Patel", "viewer"),
    ("auditor@supplysense.ai", "Auditor User", "auditor"),
]

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def seed_users():
    password_hash = hash_password("SupplySense@2026")
    with engine.begin() as conn:
        for email, full_name, role in users_data:
            conn.execute(text("""
                INSERT INTO users (email, password_hash, full_name, role)
                VALUES (:email, :password_hash, :full_name, :role)
                ON CONFLICT (email) DO NOTHING
            """), {"email": email, "password_hash": password_hash, "full_name": full_name, "role": role})
            print(f"Seeded/Verified: {email} as {role}")

    print("User seeding complete!")

if __name__ == "__main__":
    seed_users()
