"""
backend/routers/inventory.py
Inventory summary, stock distribution, ABC analysis, low stock alerts.
"""
import os, sys
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from db import get_db

router = APIRouter()


@router.get("/summary")
def get_summary(db: Session = Depends(get_db)):
    row = db.execute(text("""
        SELECT
            COUNT(DISTINCT product_id)                                    AS total_skus,
            COALESCE(SUM(inventory_level), 0)                             AS total_stock,
            SUM(CASE WHEN stock_status = 'Low'     THEN 1 ELSE 0 END)    AS low_stock_count,
            SUM(CASE WHEN stock_status = 'Excess'  THEN 1 ELSE 0 END)    AS excess_stock_count,
            SUM(CASE WHEN stock_status = 'Optimal' THEN 1 ELSE 0 END)    AS optimal_count,
            ROUND(AVG(safety_stock)::numeric, 2)                          AS avg_safety_stock,
            COALESCE(SUM(inventory_level * price), 0)                     AS total_inventory_value
        FROM fact_inventory
    """)).mappings().one()
    return dict(row)


@router.get("/stock-status-distribution")
def get_stock_status(db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT stock_status,
               COUNT(*)                   AS count,
               SUM(inventory_level)       AS total_units
        FROM fact_inventory
        GROUP BY stock_status
        ORDER BY count DESC
    """)).mappings().all()
    return [dict(r) for r in rows]


@router.get("/abc-analysis")
def get_abc_analysis(db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT category,
               COALESCE(SUM(units_sold * price), 0)  AS revenue,
               COUNT(DISTINCT product_id)             AS product_count
        FROM fact_inventory
        GROUP BY category
        ORDER BY revenue DESC
    """)).mappings().all()
    return [dict(r) for r in rows]


@router.get("/low-stock-items")
def get_low_stock(db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT product_id,
               category,
               region,
               ROUND(AVG(inventory_level)::numeric, 2)  AS avg_stock,
               ROUND(AVG(safety_stock)::numeric, 2)     AS safety_stock,
               ROUND(AVG(units_sold)::numeric, 2)       AS avg_daily_sales,
               stock_status
        FROM fact_inventory
        WHERE stock_status = 'Low'
        GROUP BY product_id, category, region, stock_status
        ORDER BY avg_stock ASC
        LIMIT 20
    """)).mappings().all()
    return [dict(r) for r in rows]


@router.get("/seasonality-trend")
def get_seasonality(db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT seasonality,
               ROUND(AVG(units_sold)::numeric, 2)        AS avg_units_sold,
               ROUND(AVG(inventory_level)::numeric, 2)   AS avg_inventory,
               ROUND(AVG(demand_forecast)::numeric, 2)   AS avg_forecast
        FROM fact_inventory
        GROUP BY seasonality
        ORDER BY seasonality
    """)).mappings().all()
    return [dict(r) for r in rows]
