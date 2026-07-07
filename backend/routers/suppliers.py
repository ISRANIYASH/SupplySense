"""
backend/routers/suppliers.py
Supplier data from dim_suppliers table.
"""
import os, sys
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from db import get_db

router = APIRouter()


@router.get("/all")
def get_all_suppliers(db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT * FROM dim_suppliers
        ORDER BY supplier_overall_score DESC
    """)).mappings().all()
    return [dict(r) for r in rows]


@router.get("/top")
def get_top_suppliers(db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT * FROM dim_suppliers
        ORDER BY supplier_overall_score DESC
        LIMIT 5
    """)).mappings().all()
    return [dict(r) for r in rows]


@router.get("/risk-distribution")
def get_risk_distribution(db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT
            CASE
                WHEN supplier_overall_score >= 75 THEN 'Low Risk'
                WHEN supplier_overall_score >= 50 THEN 'Medium Risk'
                ELSE 'High Risk'
            END AS risk_level,
            COUNT(*) AS count,
            ROUND(AVG(supplier_overall_score)::numeric, 2) AS avg_score
        FROM dim_suppliers
        GROUP BY risk_level
        ORDER BY count DESC
    """)).mappings().all()
    return [dict(r) for r in rows]


@router.get("/score-breakdown")
def get_score_breakdown(db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT supplier_name,
               supplier_overall_score,
               quality_score,
               delivery_score,
               price_competitiveness,
               relationship_score
        FROM dim_suppliers
        ORDER BY supplier_overall_score DESC
        LIMIT 10
    """)).mappings().all()
    return [dict(r) for r in rows]
