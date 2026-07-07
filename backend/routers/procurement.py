"""
backend/routers/procurement.py
Procurement analytics: delivery, spend, monthly trends.
"""
import os, sys
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from db import get_db

router = APIRouter()


@router.get("/delivery-analysis")
def get_delivery_analysis(db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT shipping_mode,
               COUNT(*)                                            AS total_orders,
               ROUND(AVG(actual_delay_days)::numeric, 2)          AS avg_delay,
               SUM(late_delivery_risk)                             AS late_count,
               ROUND(AVG(late_delivery_risk)::numeric * 100, 1)   AS late_pct,
               ROUND(AVG(sales)::numeric, 2)                      AS avg_order_value
        FROM fact_orders
        GROUP BY shipping_mode
        ORDER BY late_pct ASC
    """)).mappings().all()
    return [dict(r) for r in rows]


@router.get("/spend-by-category")
def get_spend_by_category(db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT category_name,
               ROUND(SUM(sales)::numeric, 2)                          AS total_spend,
               COUNT(*)                                                AS order_count,
               ROUND(AVG(order_item_profit_ratio)::numeric * 100, 2)  AS avg_margin
        FROM fact_orders
        GROUP BY category_name
        ORDER BY total_spend DESC
        LIMIT 10
    """)).mappings().all()
    return [dict(r) for r in rows]


@router.get("/monthly-spend")
def get_monthly_spend(db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT order_month,
               order_quarter,
               ROUND(SUM(sales)::numeric, 2)                AS monthly_sales,
               ROUND(SUM(order_profit_per_order)::numeric, 2) AS monthly_profit,
               COUNT(*)                                       AS order_count
        FROM fact_orders
        GROUP BY order_month, order_quarter
        ORDER BY order_month
    """)).mappings().all()
    return [dict(r) for r in rows]


@router.get("/delivery-status")
def get_delivery_status(db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT delivery_status,
               COUNT(*) AS count,
               ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) AS pct
        FROM fact_orders
        GROUP BY delivery_status
        ORDER BY count DESC
    """)).mappings().all()
    return [dict(r) for r in rows]
