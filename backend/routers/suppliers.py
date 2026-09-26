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
        SELECT *,
               'Supplier ' || supplier_id AS supplier_name
        FROM dim_suppliers
        ORDER BY supplier_overall_score DESC
    """)).mappings().all()
    return [dict(r) for r in rows]


@router.get("/top")
def get_top_suppliers(db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT *,
               'Supplier ' || supplier_id AS supplier_name
        FROM dim_suppliers
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
        SELECT 'Supplier ' || supplier_id AS supplier_name,
               supplier_overall_score,
               quality_score,
               service_score,
               price_score,
               reputation_score
        FROM dim_suppliers
        ORDER BY supplier_overall_score DESC
        LIMIT 10
    """)).mappings().all()
    return [dict(r) for r in rows]

from fastapi import Query

@router.get("/list")
def list_suppliers(
    db: Session = Depends(get_db),
    search: str = None,
    risk_level: str = None,
    sort_by: str = "supplier_overall_score",
    sort_dir: str = "desc",
    limit: int = 20,
    offset: int = 0
):
    base_query = """
        SELECT *,
               'Supplier ' || supplier_id AS supplier_name,
               CASE
                   WHEN supplier_overall_score >= 75 THEN 'Low Risk'
                   WHEN supplier_overall_score >= 50 THEN 'Medium Risk'
                   ELSE 'High Risk'
               END AS risk_level
        FROM dim_suppliers
    """
    
    where_clauses = []
    params = {}
    
    if search:
        where_clauses.append("('Supplier ' || supplier_id) ILIKE :search")
        params["search"] = f"%{search}%"
        
    if risk_level and risk_level.lower() != 'all':
        if risk_level.lower() == 'low risk':
            where_clauses.append("supplier_overall_score >= 75")
        elif risk_level.lower() == 'medium risk':
            where_clauses.append("supplier_overall_score >= 50 AND supplier_overall_score < 75")
        elif risk_level.lower() == 'high risk':
            where_clauses.append("supplier_overall_score < 50")

    where_sql = " WHERE " + " AND ".join(where_clauses) if where_clauses else ""
    
    valid_sorts = {
        "supplier_overall_score": "supplier_overall_score",
        "quality_score": "quality_score",
        "service_score": "service_score",
        "price_score": "price_score",
        "reputation_score": "reputation_score",
        "supplier_name": "supplier_id"
    }
    order_col = valid_sorts.get(sort_by, "supplier_overall_score")
    order_dir_sql = "ASC" if sort_dir.lower() == "asc" else "DESC"
    
    count_sql = f"SELECT COUNT(*) FROM dim_suppliers {where_sql}"
    total = db.execute(text(count_sql), params).scalar()
    
    data_sql = f"{base_query} {where_sql} ORDER BY {order_col} {order_dir_sql} LIMIT :limit OFFSET :offset"
    params["limit"] = limit
    params["offset"] = offset
    
    rows = db.execute(text(data_sql), params).mappings().all()
    
    return {
        "total": total,
        "items": [dict(r) for r in rows]
    }

@router.get("/details/{supplier_id}")
def get_supplier_details(supplier_id: int, db: Session = Depends(get_db)):
    from fastapi import HTTPException
    row = db.execute(text("""
        SELECT *,
               'Supplier ' || supplier_id AS supplier_name,
               CASE
                   WHEN supplier_overall_score >= 75 THEN 'Low Risk'
                   WHEN supplier_overall_score >= 50 THEN 'Medium Risk'
                   ELSE 'High Risk'
               END AS risk_level
        FROM dim_suppliers
        WHERE supplier_id = :supplier_id
    """), {"supplier_id": supplier_id}).mappings().first()
    
    if not row:
        raise HTTPException(status_code=404, detail="Supplier not found")
        
    return dict(row)
