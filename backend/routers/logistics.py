"""
backend/routers/logistics.py
Logistics & shipping analytics from fact_orders.
"""
import os, sys
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from db import get_db

router = APIRouter()


@router.get("/shipping-summary")
def shipping_summary(db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT
            shipping_mode,
            COUNT(*)                                                AS total_shipments,
            ROUND(AVG(days_for_shipping_real)::numeric, 2)         AS avg_actual_days,
            ROUND(AVG(days_for_shipment_scheduled)::numeric, 2)    AS avg_scheduled_days,
            ROUND(AVG(actual_delay_days)::numeric, 2)              AS avg_delay,
            SUM(CASE WHEN late_delivery_risk = 1 THEN 1 ELSE 0 END) AS late_count,
            ROUND(AVG(late_delivery_risk)::numeric * 100, 1)        AS late_pct
        FROM fact_orders
        GROUP BY shipping_mode
        ORDER BY total_shipments DESC
    """)).mappings().all()
    return [dict(r) for r in rows]


@router.get("/regional-performance")
def regional_performance(db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT
            order_region,
            order_country,
            COUNT(*)                                          AS shipment_count,
            ROUND(AVG(actual_delay_days)::numeric, 2)        AS avg_delay,
            ROUND(AVG(late_delivery_risk)::numeric * 100, 1) AS late_pct
        FROM fact_orders
        GROUP BY order_region, order_country
        ORDER BY shipment_count DESC
        LIMIT 15
    """)).mappings().all()
    return [dict(r) for r in rows]


@router.get("/delay-distribution")
def delay_distribution(db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT
            actual_delay_days,
            COUNT(*) AS order_count
        FROM fact_orders
        WHERE actual_delay_days BETWEEN -5 AND 10
        GROUP BY actual_delay_days
        ORDER BY actual_delay_days
    """)).mappings().all()
    return [dict(r) for r in rows]


@router.get("/kpis")
def logistics_kpis(db: Session = Depends(get_db)):
    row = db.execute(text("""
        SELECT
            COUNT(*)                                                       AS total_shipments,
            ROUND(AVG(actual_delay_days)::numeric, 2)                     AS avg_delay_days,
            ROUND(AVG(late_delivery_risk)::numeric * 100, 2)              AS late_delivery_pct,
            ROUND(AVG(days_for_shipping_real)::numeric, 2)                AS avg_shipping_days,
            ROUND(AVG(days_for_shipment_scheduled)::numeric, 2)           AS avg_scheduled_days,
            COUNT(DISTINCT order_region)                                   AS total_regions,
            COUNT(DISTINCT order_country)                                  AS total_countries
        FROM fact_orders
    """)).mappings().one()
    return dict(row)
