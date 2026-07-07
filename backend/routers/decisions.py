"""
backend/routers/decisions.py
Decision / Alert log — queries real alerts table from PostgreSQL.
"""
import os, sys
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from db import get_db

router = APIRouter()


@router.get("/log")
def decision_log(db: Session = Depends(get_db)):
    try:
        rows = db.execute(text("""
            SELECT id, type, severity, title, description,
                   category, read, resolved, created_at
            FROM alerts
            ORDER BY created_at DESC
            LIMIT 50
        """)).mappings().all()
        data = [dict(r) for r in rows]
        return {
            "decisions": data,
            "total": len(data),
            "note": "Showing AI-triggered alerts as decision history. Full decision log will be populated as AI agents process more orders." if data else
                    "No decisions logged yet — decisions will appear here once AI agents are active and market scheduler has run."
        }
    except Exception as e:
        return {
            "decisions": [],
            "total": 0,
            "note": f"Alerts table may not exist yet. Run scripts/create_market_tables.py first. Error: {str(e)}"
        }


@router.get("/summary")
def decision_summary(db: Session = Depends(get_db)):
    try:
        rows = db.execute(text("""
            SELECT type, severity, COUNT(*) as count
            FROM alerts
            GROUP BY type, severity
            ORDER BY count DESC
        """)).mappings().all()
        return [dict(r) for r in rows]
    except Exception:
        return []
