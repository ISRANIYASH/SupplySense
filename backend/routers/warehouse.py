"""
backend/routers/warehouse.py
Warehouse digital twin analytics from fact_inventory.
"""
import os, sys
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from db import get_db

router = APIRouter()


@router.get("/occupancy-by-region")
def occupancy_by_region(db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT
            region,
            store_id,
            ROUND(AVG(inventory_level::float)::numeric, 2)  AS avg_stock,
            ROUND(AVG(safety_stock::float)::numeric, 2)     AS safety_stock,
            COUNT(DISTINCT product_id)               AS product_count,
            SUM(CASE WHEN stock_status = 'Low'    THEN 1 ELSE 0 END) AS low_stock_items,
            SUM(CASE WHEN stock_status = 'Excess' THEN 1 ELSE 0 END) AS excess_items,
            SUM(CASE WHEN stock_status = 'Optimal' THEN 1 ELSE 0 END) AS optimal_items
        FROM fact_inventory
        GROUP BY region, store_id
        ORDER BY region, store_id
    """)).mappings().all()
    return [dict(r) for r in rows]


@router.get("/stock-by-store")
def stock_by_store(db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT
            store_id,
            COUNT(DISTINCT product_id)                                        AS sku_count,
            SUM(inventory_level)                                              AS total_units,
            ROUND(AVG(inventory_level::float)::numeric, 0)                  AS avg_stock_per_sku,
            ROUND(
                (AVG(inventory_level::float / NULLIF(safety_stock, 0)))::numeric, 2
            )                                                                  AS stock_health_ratio,
            SUM(CASE WHEN stock_status = 'Low'    THEN 1 ELSE 0 END)        AS low_count,
            SUM(CASE WHEN stock_status = 'Excess' THEN 1 ELSE 0 END)        AS excess_count,
            SUM(CASE WHEN stock_status = 'Optimal' THEN 1 ELSE 0 END)       AS optimal_count
        FROM fact_inventory
        GROUP BY store_id
        ORDER BY store_id
    """)).mappings().all()
    return [dict(r) for r in rows]


@router.get("/kpis")
def warehouse_kpis(db: Session = Depends(get_db)):
    row = db.execute(text("""
        SELECT
            COUNT(DISTINCT store_id)                                          AS total_stores,
            COUNT(DISTINCT product_id)                                        AS total_skus,
            COUNT(*)                                                          AS total_records,
            SUM(CASE WHEN stock_status = 'Low'    THEN 1 ELSE 0 END)        AS total_low_stock,
            SUM(CASE WHEN stock_status = 'Excess' THEN 1 ELSE 0 END)        AS total_excess,
            SUM(CASE WHEN stock_status = 'Optimal' THEN 1 ELSE 0 END)       AS total_optimal,
            ROUND(
                (AVG(inventory_level::float / NULLIF(safety_stock, 0)))::numeric, 2
            )                                                                  AS avg_health_ratio
        FROM fact_inventory
    """)).mappings().one()
    return dict(row)


@router.get("/transfer-suggestions")
def transfer_suggestions(db: Session = Depends(get_db)):
    """Find real transfer opportunities: store with most excess vs most low stock."""
    result = db.execute(text("""
        WITH store_stats AS (
            SELECT
                store_id,
                region,
                SUM(CASE WHEN stock_status = 'Low'    THEN 1 ELSE 0 END) AS low_count,
                SUM(CASE WHEN stock_status = 'Excess' THEN 1 ELSE 0 END) AS excess_count,
                SUM(CASE WHEN stock_status = 'Low'    THEN inventory_level ELSE 0 END) AS low_units,
                SUM(CASE WHEN stock_status = 'Excess' THEN inventory_level ELSE 0 END) AS excess_units
            FROM fact_inventory
            GROUP BY store_id, region
        )
        SELECT
            (SELECT store_id FROM store_stats ORDER BY excess_count DESC LIMIT 1) AS source_store,
            (SELECT region   FROM store_stats ORDER BY excess_count DESC LIMIT 1) AS source_region,
            (SELECT excess_count FROM store_stats ORDER BY excess_count DESC LIMIT 1) AS source_excess_skus,
            (SELECT store_id FROM store_stats ORDER BY low_count DESC LIMIT 1) AS dest_store,
            (SELECT region   FROM store_stats ORDER BY low_count DESC LIMIT 1) AS dest_region,
            (SELECT low_count FROM store_stats ORDER BY low_count DESC LIMIT 1) AS dest_low_skus
    """)).mappings().one()
    return dict(result)


@router.get("/grid-sample")
def grid_sample(db: Session = Depends(get_db)):
    """Return a sample of inventory records for the warehouse grid visualization."""
    rows = db.execute(text("""
        SELECT store_id, product_id, category,
               inventory_level, safety_stock, stock_status,
               ROUND(inventory_level::numeric / NULLIF(safety_stock, 0), 2) AS health_ratio
        FROM fact_inventory
        ORDER BY store_id, product_id
        LIMIT 200
    """)).mappings().all()
    return [dict(r) for r in rows]
