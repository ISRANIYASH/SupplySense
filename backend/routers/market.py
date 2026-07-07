"""
backend/routers/market.py
Commodity prices — from live_prices.json or fact_commodity_prices.
"""
import json
import os
import sys
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from db import get_db

router = APIRouter()

LIVE_PRICES_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", "datasets", "processed", "live_prices.json"
)
MARKET_ANALYSIS_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", "datasets", "processed", "market_analysis.json"
)


@router.get("/commodity-prices")
def get_commodity_prices(db: Session = Depends(get_db)):
    # Prefer live_prices.json if it exists and has data
    if os.path.exists(LIVE_PRICES_PATH):
        with open(LIVE_PRICES_PATH) as f:
            live = json.load(f)
        if live:
            return {"source": "live", "data": live}

    # Fallback: last 30 rows from fact_commodity_prices
    rows = db.execute(text("""
        SELECT date, close AS price, price_change_pct,
               rolling_avg_7day, rolling_avg_30day,
               price_trend, volatility_7day
        FROM fact_commodity_prices
        ORDER BY date DESC
        LIMIT 30
    """)).mappings().all()
    return {"source": "historical", "data": [dict(r) for r in rows]}


@router.get("/price-history")
def get_price_history(db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT date, close, rolling_avg_7day, rolling_avg_30day, price_trend
        FROM fact_commodity_prices
        ORDER BY date ASC
    """)).mappings().all()
    return [dict(r) for r in rows]


@router.get("/analysis")
def get_market_analysis():
    """Return latest AI analysis from market_analysis.json"""
    if os.path.exists(MARKET_ANALYSIS_PATH):
        with open(MARKET_ANALYSIS_PATH) as f:
            return json.load(f)
    return []


@router.get("/live-summary")
def get_live_summary(db: Session = Depends(get_db)):
    """Return summary of live commodity prices from Postgres"""
    rows = db.execute(text("""
        SELECT commodity_name, current_price, previous_close,
               change_pct, percentile_rank,
               price_1y_low, price_1y_high, price_1y_avg,
               fetched_at
        FROM live_commodity_prices
        ORDER BY fetched_at DESC, commodity_name
    """)).mappings().all()
    return [dict(r) for r in rows]


@router.get("/alerts")
def get_market_alerts(db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT id, type, severity, title, description,
               category, read, resolved, created_at
        FROM alerts
        WHERE type = 'MARKET_PRICE'
        ORDER BY created_at DESC
        LIMIT 50
    """)).mappings().all()
    return [dict(r) for r in rows]
