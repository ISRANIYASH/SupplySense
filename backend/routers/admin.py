"""
backend/routers/admin.py
Admin Center — real system health checks for every actual service.
"""
import os, sys, json, subprocess
from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from db import get_db

router = APIRouter()
BASE = os.path.join(os.path.dirname(__file__), "..", "..")


def _file_info(rel_path):
    p = os.path.join(BASE, rel_path)
    if not os.path.exists(p):
        return {"exists": False}
    stat = os.stat(p)
    return {
        "exists":        True,
        "size_mb":       round(stat.st_size / 1024 / 1024, 3),
        "last_modified": datetime.fromtimestamp(stat.st_mtime).isoformat()
    }


@router.get("/system-health")
def system_health(db: Session = Depends(get_db)):
    services = []

    # ── PostgreSQL ─────────────────────────────────────────────────────────────
    try:
        counts = db.execute(text("""
            SELECT
              (SELECT COUNT(*) FROM fact_orders)          AS fact_orders,
              (SELECT COUNT(*) FROM fact_demand_daily)    AS fact_demand_daily,
              (SELECT COUNT(*) FROM fact_inventory)       AS fact_inventory,
              (SELECT COUNT(*) FROM fact_commodity_prices) AS fact_commodity_prices,
              (SELECT COUNT(*) FROM dim_suppliers)        AS dim_suppliers,
              (SELECT COUNT(*) FROM dim_products)         AS dim_products,
              (SELECT COUNT(*) FROM dim_customers)        AS dim_customers
        """)).mappings().one()
        services.append({
            "name":    "PostgreSQL",
            "status":  "connected",
            "icon":    "🟢",
            "details": {k: f"{v:,} rows" for k, v in dict(counts).items()},
            "note":    "7 tables accessible"
        })
    except Exception as e:
        services.append({"name": "PostgreSQL", "status": "error", "icon": "🔴", "note": str(e)})

    # ── LSTM Model ─────────────────────────────────────────────────────────────
    model_info = _file_info("models/lstm_best.pt")
    metrics_info = _file_info("models/lstm_metrics.json")
    metrics_data = {}
    if metrics_info["exists"]:
        with open(os.path.join(BASE, "models/lstm_metrics.json")) as f:
            metrics_data = json.load(f)
    services.append({
        "name":    "LSTM Model",
        "status":  "loaded" if model_info["exists"] else "not_found",
        "icon":    "🟢" if model_info["exists"] else "🟡",
        "details": {
            "model_file": model_info,
            "metrics_file": metrics_info,
            "metrics": metrics_data
        },
        "note": f"lstm_best.pt ({model_info.get('size_mb','?')} MB)" if model_info["exists"] else "Model not yet trained"
    })

    # ── Market Data ────────────────────────────────────────────────────────────
    live_info = _file_info("datasets/processed/live_prices.json")
    analysis_info = _file_info("datasets/processed/market_analysis.json")
    live_count = 0
    if live_info["exists"]:
        with open(os.path.join(BASE, "datasets/processed/live_prices.json")) as f:
            live_count = len(json.load(f))
    services.append({
        "name":    "Market Data (Yahoo Finance)",
        "status":  "active" if live_info["exists"] else "pending",
        "icon":    "🟢" if live_info["exists"] else "🟡",
        "details": {
            "live_prices":    live_info,
            "market_analysis": analysis_info,
            "commodities":    live_count
        },
        "note": f"{live_count} commodities fetched" if live_info["exists"] else "Run market_scheduler.py to fetch"
    })

    # ── MLflow ─────────────────────────────────────────────────────────────────
    mlruns = os.path.join(BASE, "mlruns")
    mlruns_exists = os.path.exists(mlruns)
    run_count = 0
    if mlruns_exists:
        for root, dirs, files in os.walk(mlruns):
            run_count += sum(1 for f in files if f == "meta.yaml" and "run" in root)
    services.append({
        "name":    "MLflow Tracking",
        "status":  "active" if mlruns_exists else "pending",
        "icon":    "🟢" if mlruns_exists else "🟡",
        "details": {"mlruns_exists": mlruns_exists, "run_count": run_count},
        "note":    f"{run_count} experiment runs" if mlruns_exists else "No runs yet — train a model first"
    })

    # ── Services NOT yet deployed (honest) ─────────────────────────────────────
    for name, note in [
        ("Kafka (Event Streaming)", "Not yet deployed — planned for real-time order streaming"),
        ("Qdrant (Vector DB)", "Not yet deployed — planned for RAG/Copilot integration"),
        ("Redis Cache", "Not yet deployed — planned for API response caching"),
    ]:
        services.append({
            "name": name, "status": "not_deployed",
            "icon": "🔵", "note": note
        })

    return {
        "checked_at": datetime.utcnow().isoformat(),
        "services":   services,
        "total":      len(services),
        "healthy":    sum(1 for s in services if s["status"] in ("connected","loaded","active")),
    }


@router.get("/table-stats")
def table_stats(db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT schemaname, tablename,
               pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    """)).mappings().all()
    return [dict(r) for r in rows]
