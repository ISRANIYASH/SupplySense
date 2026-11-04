import os
import sys
from sqlalchemy import text

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))
from db import engine

with engine.connect() as conn:
    # 1. Distinct product_id in fact_inventory
    products = conn.execute(text("SELECT DISTINCT product_id FROM fact_inventory ORDER BY product_id")).fetchall()
    print("Distinct product_ids in fact_inventory:", [p[0] for p in products])

    # 2. Latest date per product_id, category, region or store
    print("\nCheck latest dates in fact_inventory:")
    latest_dates = conn.execute(text("""
        SELECT MAX(date) as max_date, MIN(date) as min_date, COUNT(*) as cnt 
        FROM fact_inventory
    """)).mappings().one()
    print("  Date range:", latest_dates['min_date'], "to", latest_dates['max_date'])

    # 3. How are records structured per date?
    date_counts = conn.execute(text("""
        SELECT date, COUNT(*) as cnt 
        FROM fact_inventory 
        GROUP BY date 
        ORDER BY date DESC 
        LIMIT 5
    """)).mappings().all()
    print("\nRecent dates and snapshot counts:")
    for r in date_counts:
        print(f"  {r['date']}: {r['cnt']} rows")

    # 4. Check product_id, category, region, store_id combinations
    combos = conn.execute(text("""
        SELECT COUNT(DISTINCT (product_id, store_id)) as prod_stores,
               COUNT(DISTINCT (product_id, category, region)) as prod_cat_reg,
               COUNT(DISTINCT (product_id, category)) as prod_cat,
               COUNT(DISTINCT product_id) as prods
        FROM fact_inventory
    """)).mappings().one()
    print("\nGranularity combos in fact_inventory:")
    for k, v in combos.items():
        print(f"  {k}: {v}")

    # 5. Let's see what a latest snapshot query yields:
    latest_query = text("""
        WITH latest_snapshot AS (
            SELECT DISTINCT ON (product_id, store_id)
                product_id, store_id, category, region, inventory_level, price, 
                stock_status, safety_stock, reorder_point, date
            FROM fact_inventory
            ORDER BY product_id, store_id, date DESC
        )
        SELECT 
            COUNT(DISTINCT product_id) as total_skus,
            COUNT(*) as total_items_across_stores,
            SUM(inventory_level) as current_total_stock,
            ROUND(SUM(inventory_level * price)::numeric, 2) as current_inventory_value,
            SUM(CASE WHEN stock_status = 'Low' THEN 1 ELSE 0 END) as low_stock_count,
            SUM(CASE WHEN stock_status = 'Excess' THEN 1 ELSE 0 END) as excess_stock_count,
            SUM(CASE WHEN stock_status = 'Optimal' THEN 1 ELSE 0 END) as optimal_count,
            ROUND(AVG(safety_stock)::numeric, 1) as avg_safety_stock
        FROM latest_snapshot;
    """)
    res = conn.execute(latest_query).mappings().one()
    print("\nMetrics computed from latest snapshot (per product & store):")
    for k, v in res.items():
        print(f"  {k}: {v}")
