import os
import sys
import asyncio
import bcrypt
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
load_dotenv()

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

async def seed_users():
    import asyncpg
    
    conn = await asyncpg.connect(
        user=os.getenv("POSTGRES_USER", "supplysense_admin"),
        password=os.getenv("POSTGRES_PASSWORD", "admin123"),
        database=os.getenv("POSTGRES_DB", "supplysense"),
        host=os.getenv("POSTGRES_HOST", "localhost"),
        port=os.getenv("POSTGRES_PORT", "5432")
    )
    
    print("Creating users table...")
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            full_name VARCHAR(255) NOT NULL,
            role VARCHAR(50) NOT NULL CHECK (role IN (
                'super_admin', 'admin', 'procurement_manager', 
                'warehouse_manager', 'forecast_analyst', 
                'viewer', 'auditor'
            )),
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT NOW(),
            last_login TIMESTAMP
        );
    """)
    
    print("Seeding demo users...")
    password_hash = hash_password("SupplySense@2026")
    
    for email, full_name, role in users_data:
        try:
            await conn.execute("""
                INSERT INTO users (email, password_hash, full_name, role)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (email) DO NOTHING
            """, email, password_hash, full_name, role)
            print(f"Seeded: {email} as {role}")
        except Exception as e:
            print(f"Error seeding {email}: {e}")
            
    await conn.close()
    print("Database seeding complete!")

if __name__ == "__main__":
    asyncio.run(seed_users())
