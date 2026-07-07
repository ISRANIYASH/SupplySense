"""
backend/routers/dashboard.py
Executive Dashboard KPIs — all data from PostgreSQL.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from db import get_db

router = APIRouter()


@router.get("/kpis")
def get_kpis(db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT
            (SELECT COALESCE(SUM(inventory_level * price), 0) FROM fact_inventory)
                AS total_inventory_value,
            (SELECT COUNT(*) FROM fact_orders)
                AS total_orders,
            (SELECT ROUND(
                COUNT(*) FILTER (WHERE delivery_status = 'Shipping on time')
                * 100.0 / NULLIF(COUNT(*), 0), 2)
             FROM fact_orders)
                AS avg_service_level,
            (SELECT ROUND(AVG(late_delivery_risk) * 100, 2) FROM fact_orders)
                AS late_delivery_risk_pct,
            (SELECT COUNT(*) FROM dim_suppliers)
                AS total_suppliers,
            (SELECT ROUND(AVG(supplier_overall_score)::numeric, 2) FROM dim_suppliers)
                AS avg_supplier_score,
            (SELECT category_name FROM fact_demand_daily
             GROUP BY category_name
             ORDER BY SUM(order_item_quantity) DESC LIMIT 1)
                AS top_category,
            (SELECT COALESCE(SUM(order_item_quantity), 0) FROM fact_demand_daily)
                AS total_demand_units,
            (SELECT COUNT(DISTINCT product_id) FROM fact_inventory)
                AS total_skus,
            (SELECT ROUND(AVG(order_item_profit_ratio)::numeric * 100, 2) FROM fact_orders)
                AS avg_profit_margin
    """)).mappings().one()

    return dict(rows)


@router.get("/demand-trend")
def get_demand_trend(db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT order_date_only AS date,
               SUM(order_item_quantity) AS total_demand
        FROM fact_demand_daily
        GROUP BY order_date_only
        ORDER BY order_date_only
        LIMIT 90
    """)).mappings().all()
    return [dict(r) for r in rows]


@router.get("/top-categories")
def get_top_categories(db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT category_name,
               SUM(order_item_quantity) AS total_quantity,
               COALESCE(SUM(sales), 0)  AS total_sales
        FROM fact_orders
        GROUP BY category_name
        ORDER BY total_quantity DESC
        LIMIT 10
    """)).mappings().all()
    return [dict(r) for r in rows]


@router.get("/regional-demand")
def get_regional_demand(db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT order_region,
               SUM(order_item_quantity)  AS total_demand,
               ROUND(AVG(late_delivery_risk)::numeric * 100, 2) AS risk_score
        FROM fact_orders
        GROUP BY order_region
        ORDER BY total_demand DESC
    """)).mappings().all()
    return [dict(r) for r in rows]
