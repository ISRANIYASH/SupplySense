import pandas as pd
from sqlalchemy import create_engine
import os
from dotenv import load_dotenv

load_dotenv()

DB_USER = os.getenv("POSTGRES_USER", "supplysense_admin")
DB_PASS = os.getenv("POSTGRES_PASSWORD", "secure_supplysense_pwd_2026")
DB_HOST = os.getenv("POSTGRES_HOST", "localhost")
DB_PORT = os.getenv("POSTGRES_PORT", "5432")
DB_NAME = os.getenv("POSTGRES_DB", "supplysense")

engine = create_engine(f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}")

df = pd.read_sql('SELECT * FROM fact_inventory LIMIT 1;', engine)
print("Columns in fact_inventory:")
print(df.columns.tolist())
