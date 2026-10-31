"""
backend/routers/risk.py
Risk management analytics combining fact_orders, dim_suppliers, fact_inventory.
"""
import os, sys
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from db import get_db

router = APIRouter()


@router.get("/overview")
def risk_overview(db: Session = Depends(get_db)):
    row = db.execute(text("""
        WITH delivery_risk AS (
            SELECT COALESCE(AVG(late_delivery_risk), 0) AS late_risk_avg,
                   COALESCE(COUNT(*) FILTER (WHERE late_delivery_risk = 1) * 100.0 / NULLIF(COUNT(*), 0), 0) AS late_pct
            FROM fact_orders
        ),
        supplier_risk AS (
            SELECT COUNT(*) FILTER (WHERE supplier_overall_score < 35) AS critical_count,
                   COUNT(*) FILTER (WHERE supplier_overall_score < 50) AS high_risk_count,
                   COUNT(*) AS total,
                   COALESCE(COUNT(*) FILTER (WHERE supplier_overall_score < 50) * 100.0 / NULLIF(COUNT(*), 0), 0) AS high_risk_pct
            FROM dim_suppliers
        ),
        inventory_risk AS (
            SELECT COALESCE(COUNT(*) FILTER (WHERE stock_status = 'Low') * 100.0 / NULLIF(COUNT(*), 0), 0) AS low_stock_pct
            FROM fact_inventory
        ),
        region_risk AS (
            SELECT COUNT(DISTINCT order_region) AS regions_at_risk
            FROM (
                SELECT order_region,
                       AVG(late_delivery_risk) * 100 AS late_pct
                FROM fact_orders
                GROUP BY order_region
                HAVING AVG(late_delivery_risk) * 100 > 50
            ) sub
        )
        SELECT
            dr.late_risk_avg,
            dr.late_pct,
            sr.critical_count,
            sr.high_risk_count,
            sr.high_risk_pct,
            ir.low_stock_pct,
            rr.regions_at_risk,
            -- Weighted risk score: delivery(40%) + supplier(35%) + inventory(25%)
            ROUND(
                COALESCE(dr.late_risk_avg * 40 +
                 (sr.high_risk_pct / 100.0) * 35 +
                 (ir.low_stock_pct / 100.0) * 25, 0)::numeric,
                1
            ) AS overall_risk_score
        FROM delivery_risk dr, supplier_risk sr, inventory_risk ir, region_risk rr
    """)).mappings().one()
    return dict(row)


@router.get("/matrix-data")
def risk_matrix(db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT 'Supplier Risk' AS risk_type,
               COALESCE(COUNT(*) * 1.0 / NULLIF((SELECT COUNT(*) FROM dim_suppliers), 0) * 100, 0) AS probability_score,
               COALESCE(AVG(100.0 - supplier_overall_score), 0) AS impact_score
        FROM dim_suppliers WHERE supplier_overall_score < 50
        UNION ALL
        SELECT 'Delivery Risk' AS risk_type,
               ROUND(COALESCE(AVG(late_delivery_risk) * 100, 0), 1) AS probability_score,
               ROUND(COALESCE(AVG(actual_delay_days) * 10, 0), 1)   AS impact_score
        FROM fact_orders
        UNION ALL
        SELECT 'Inventory Risk' AS risk_type,
               ROUND(
                 COALESCE(SUM(CASE WHEN stock_status = 'Low' THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0), 0), 1
               ) AS probability_score,
               ROUND(COALESCE(AVG(CASE WHEN stock_status = 'Low' THEN 80 ELSE 20 END), 0)::numeric, 1) AS impact_score
        FROM fact_inventory
    """)).mappings().all()
    return [dict(r) for r in rows]


@router.get("/critical-alerts")
def critical_alerts(db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT supplier_id,
               'Supplier ' || supplier_id AS supplier_name,
               supplier_overall_score,
               quality_score,
               service_score,
               price_score,
               reputation_score,
               financial_score
        FROM dim_suppliers
        WHERE supplier_overall_score < 35
        ORDER BY supplier_overall_score ASC
        LIMIT 10
    """)).mappings().all()
    return [dict(r) for r in rows]


@router.get("/supplier-distribution")
def supplier_distribution(db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT
            'Supplier ' || supplier_id AS supplier_name,
            supplier_overall_score,
            quality_score,
            service_score,
            financial_score,
            CASE
                WHEN supplier_overall_score >= 75 THEN 'Low'
                WHEN supplier_overall_score >= 50 THEN 'Medium'
                WHEN supplier_overall_score >= 35 THEN 'High'
                ELSE 'Critical'
            END AS risk_level
        FROM dim_suppliers
        ORDER BY supplier_overall_score ASC
    """)).mappings().all()
    return [dict(r) for r in rows]
