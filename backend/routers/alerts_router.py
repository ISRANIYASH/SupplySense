"""
backend/routers/alerts_router.py
Alert Center & Real-Time Inventory Notifications.
Queries alerts table, performs automated inventory threshold sync, and handles alert lifecycle actions.
"""
import os, sys
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from db import get_db

router = APIRouter()


def sync_inventory_alerts(db: Session):
    """
    Scans the latest inventory levels against safety stock and reorder point thresholds.
    Categorizes alerts into:
      - Critical Stock (Severity: CRITICAL, inventory <= safety_stock * 0.5 or 0)
      - Low Stock (Severity: HIGH, inventory <= safety_stock)
      - Stock Replenishment Required (Severity: MEDIUM, inventory <= reorder_point)
    Avoids duplicate alerts for unresolved conditions.
    """
    try:
        # 1. Fetch latest snapshots that breach reorder point or safety stock
        rows = db.execute(text("""
            WITH latest_snapshots AS (
                SELECT DISTINCT ON (product_id, category, region) 
                    product_id, category, region, inventory_level, safety_stock, reorder_point
                FROM fact_inventory
                ORDER BY product_id, category, region, date DESC
            )
            SELECT 
                COALESCE(d.item_name, l.product_id) AS item_name,
                l.product_id AS sku,
                l.category,
                l.region,
                l.inventory_level,
                ROUND(COALESCE(l.safety_stock, 50)::numeric, 0) AS safety_stock,
                ROUND(COALESCE(l.reorder_point, 100)::numeric, 0) AS reorder_point
            FROM latest_snapshots l
            LEFT JOIN dim_inventory_items d 
              ON d.sku = l.product_id AND d.category = l.category AND d.region = l.region
            WHERE l.inventory_level <= l.reorder_point
            ORDER BY l.inventory_level ASC
            LIMIT 25
        """)).mappings().all()

        if not rows:
            return

        # 2. Query unresolved inventory alerts or recently resolved alerts within 24 hours to prevent duplicates
        recent_alerts = db.execute(text("""
            SELECT type, title 
            FROM alerts 
            WHERE category = 'inventory'
              AND (resolved = false OR created_at >= NOW() - INTERVAL '24 hours')
        """)).mappings().all()

        existing_alert_keys = { (u["type"], u["title"]) for u in recent_alerts }

        # 3. Classify and insert new breaches
        inserted = 0
        for r in rows:
            inv = int(r["inventory_level"])
            ss = float(r["safety_stock"])
            rop = float(r["reorder_point"])
            sku = r["sku"]
            region = r["region"]
            name = r["item_name"]

            if inv <= (ss * 0.5) or inv == 0:
                alert_type = "CRITICAL_STOCK"
                severity = "CRITICAL"
                title = f"Critical Stock: {name}"
            elif inv <= ss:
                alert_type = "LOW_STOCK"
                severity = "HIGH"
                title = f"Low Stock: {name}"
            elif inv <= rop:
                alert_type = "REPLENISHMENT_REQUIRED"
                severity = "MEDIUM"
                title = f"Stock Replenishment Required: {name}"
            else:
                continue

            if (alert_type, title) in existing_alert_keys:
                continue

            desc = f"SKU: {sku} | Region: {region} | Current Stock: {inv} units | Safety Stock: {int(ss)} | Reorder Level: {int(rop)}"

            db.execute(text("""
                INSERT INTO alerts (type, severity, title, description, category, read, resolved, created_at)
                VALUES (:type, :severity, :title, :description, 'inventory', false, false, NOW())
            """), {
                "type": alert_type,
                "severity": severity,
                "title": title,
                "description": desc
            })
            existing_alert_keys.add((alert_type, title))
            inserted += 1

        if inserted > 0:
            db.commit()
    except Exception as e:
        db.rollback()
        # Logging without breaking downstream API callers
        pass


@router.get("/active")
def active_alerts(db: Session = Depends(get_db)):
    """
    Returns active (unresolved) alerts, running inventory threshold synchronization,
    sorted by severity and creation timestamp.
    """
    sync_inventory_alerts(db)

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
            LIMIT 50
        """)).mappings().all()
        data = [dict(r) for r in rows]
        unread_count = sum(1 for a in data if not a.get("read", False))
        return {
            "alerts": data,
            "total":  len(data),
            "unread_count": unread_count,
            "note":   "" if data else "No active alerts. All inventory levels are optimal."
        }
    except Exception as e:
        return {"alerts": [], "total": 0, "unread_count": 0, "note": f"Error: {str(e)}"}


@router.post("/sync")
def trigger_sync(db: Session = Depends(get_db)):
    """
    Manually triggers inventory threshold evaluation and alert synchronization.
    """
    sync_inventory_alerts(db)
    return {"success": True, "message": "Inventory alerts synchronized"}


@router.post("/{alert_id}/read")
def mark_alert_read(alert_id: int, db: Session = Depends(get_db)):
    """
    Marks a specific alert as read.
    """
    try:
        db.execute(text("""
            UPDATE alerts SET read = true WHERE id = :id
        """), {"id": alert_id})
        db.commit()
        return {"success": True, "id": alert_id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/read-all")
def mark_all_read(db: Session = Depends(get_db)):
    """
    Marks all active alerts as read.
    """
    try:
        result = db.execute(text("""
            UPDATE alerts SET read = true WHERE resolved = false AND read = false
        """))
        db.commit()
        return {"success": True, "updated": result.rowcount}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{alert_id}/resolve")
def resolve_alert(alert_id: int, db: Session = Depends(get_db)):
    """
    Marks a specific alert as resolved and read.
    """
    try:
        db.execute(text("""
            UPDATE alerts SET resolved = true, read = true WHERE id = :id
        """), {"id": alert_id})
        db.commit()
        return {"success": True, "id": alert_id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/clear-all")
def clear_all_resolved(db: Session = Depends(get_db)):
    """
    Resolves/clears all active alerts.
    """
    try:
        result = db.execute(text("""
            UPDATE alerts SET resolved = true, read = true WHERE resolved = false
        """))
        db.commit()
        return {"success": True, "cleared": result.rowcount}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/summary")
def alerts_summary(db: Session = Depends(get_db)):
    try:
        rows = db.execute(text("""
            SELECT severity, COUNT(*) as count
            FROM alerts
            WHERE resolved = false
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
