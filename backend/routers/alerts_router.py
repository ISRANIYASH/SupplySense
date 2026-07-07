"""
backend/routers/alerts_router.py
Alert Center — queries real alerts table, priority-sorted.
"""
import os, sys
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from db import get_db

router = APIRouter()


@router.get("/active")
def active_alerts(db: Session = Depends(get_db)):
    try:
        rows = db.execute(text("""
            SELECT id, type, severity, title, description,
                   category, read, resolved, created_at
            FROM alerts
            WHERE resolved = false
            ORDER BY
              CASE severity
                WHEN 'CRITICAL' THEN 1
                WHEN 'HIGH'     THEN 2
                WHEN 'MEDIUM'   THEN 3
                ELSE 4
              END,
              created_at DESC
            LIMIT 30
        """)).mappings().all()
        data = [dict(r) for r in rows]
        return {
            "alerts": data,
            "total":  len(data),
            "note":   "" if data else "No active alerts. Alerts appear after the market scheduler runs."
        }
    except Exception as e:
        return {"alerts": [], "total": 0, "note": f"Error: {str(e)}"}


@router.get("/summary")
def alerts_summary(db: Session = Depends(get_db)):
    try:
        rows = db.execute(text("""
            SELECT severity, COUNT(*) as count
            FROM alerts
            GROUP BY severity
            ORDER BY
              CASE severity
                WHEN 'CRITICAL' THEN 1
                WHEN 'HIGH'     THEN 2
                WHEN 'MEDIUM'   THEN 3
                ELSE 4
              END
        """)).mappings().all()
        return [dict(r) for r in rows]
    except Exception:
        return []


@router.get("/all")
def all_alerts(db: Session = Depends(get_db)):
    try:
        rows = db.execute(text("""
            SELECT id, type, severity, title, description,
                   category, read, resolved, created_at
            FROM alerts
            ORDER BY created_at DESC
            LIMIT 100
        """)).mappings().all()
        return [dict(r) for r in rows]
    except Exception:
        return []
