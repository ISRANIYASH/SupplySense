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

df = pd.read_sql('SELECT category_name, order_region, COUNT(*) as cnt FROM fact_demand_daily GROUP BY category_name, order_region ORDER BY cnt DESC LIMIT 5;', engine)
print("Top 5 Combinations:")
print(df.to_string(index=False))

top_cat = df.iloc[0]['category_name']
top_reg = df.iloc[0]['order_region']
print(f"\nTop combination is: '{top_cat}' and '{top_reg}' with {df.iloc[0]['cnt']} rows")
