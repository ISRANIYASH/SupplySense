import os
import sys
from sqlalchemy import text

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))
from db import engine

with engine.connect() as conn:
    # 1. Check if dim_inventory_items exists
    exists = conn.execute(text("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'dim_inventory_items'
        );
    """)).scalar()
    print(f"Does dim_inventory_items table exist? {exists}")

    # 2. Inspect fact_inventory table columns and sample
    cols = conn.execute(text("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'fact_inventory' 
        ORDER BY ordinal_position;
    """)).fetchall()
    print("\nfact_inventory columns:")
    for c in cols:
        print(f"  {c[0]} ({c[1]})")

    # 3. Check row count and distinct product_id, dates, regions, categories in fact_inventory
    summary = conn.execute(text("""
        SELECT 
            COUNT(*) as total_rows,
            COUNT(DISTINCT product_id) as distinct_products,
            COUNT(DISTINCT category) as distinct_categories,
            COUNT(DISTINCT region) as distinct_regions,
            MIN(date) as min_date,
            MAX(date) as max_date
        FROM fact_inventory;
    """)).mappings().one()
    print("\nfact_inventory summary:")
    for k, v in summary.items():
        print(f"  {k}: {v}")

    # 4. Inspect sample rows from fact_inventory
    print("\nSample 3 rows from fact_inventory:")
    sample = conn.execute(text("SELECT * FROM fact_inventory LIMIT 3")).mappings().all()
    for r in sample:
        print(" ", dict(r))

    # 5. Inspect dim_products table
    print("\ndim_products columns:")
    p_cols = conn.execute(text("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'dim_products' 
        ORDER BY ordinal_position;
    """)).fetchall()
    for c in p_cols:
        print(f"  {c[0]} ({c[1]})")

    print("\nSample 3 rows from dim_products:")
    p_sample = conn.execute(text("SELECT * FROM dim_products LIMIT 3")).mappings().all()
    for r in p_sample:
        print(" ", dict(r))
