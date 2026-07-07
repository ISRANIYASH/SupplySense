"""
backend/routers/simulator.py
Scenario Simulator — applies multipliers to REAL baseline data from PostgreSQL.
"""
import os, sys
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from db import get_db

router = APIRouter()


@router.get("/baseline")
def get_baseline(db: Session = Depends(get_db)):
    """Return real baseline metrics from PostgreSQL."""
    inv = db.execute(text("""
        SELECT
            AVG(inventory_level)                AS avg_inventory,
            AVG(safety_stock)                   AS avg_safety_stock,
            AVG(units_sold)                     AS avg_daily_demand,
            AVG(price)                          AS avg_price,
            SUM(inventory_level * price)        AS total_value,
            COUNT(DISTINCT product_id)          AS skus
        FROM fact_inventory
    """)).mappings().one()

    orders = db.execute(text("""
        SELECT
            AVG(days_for_shipping_real)         AS avg_lead_time,
            AVG(late_delivery_risk) * 100       AS base_late_pct,
            AVG(actual_delay_days)              AS avg_delay
        FROM fact_orders
    """)).mappings().one()

    return {
        "avg_inventory":      round(float(inv["avg_inventory"] or 0), 2),
        "avg_safety_stock":   round(float(inv["avg_safety_stock"] or 0), 2),
        "avg_daily_demand":   round(float(inv["avg_daily_demand"] or 0), 2),
        "avg_price":          round(float(inv["avg_price"] or 0), 2),
        "total_value":        round(float(inv["total_value"] or 0), 2),
        "skus":               int(inv["skus"] or 0),
        "avg_lead_time":      round(float(orders["avg_lead_time"] or 0), 2),
        "base_late_pct":      round(float(orders["base_late_pct"] or 0), 2),
        "avg_delay":          round(float(orders["avg_delay"] or 0), 2),
    }


@router.post("/run")
def run_simulation(body: dict, db: Session = Depends(get_db)):
    """
    Apply scenario multipliers to real baseline data.
    Inputs:
      demand_change_pct:      e.g. +20 means demand increases 20%
      lead_time_multiplier:   e.g. 1.5 means lead time 50% longer
      price_change_pct:       e.g. +10 means price goes up 10%
    """
    demand_chg  = float(body.get("demand_change_pct", 0))
    lt_mult     = float(body.get("lead_time_multiplier", 1.0))
    price_chg   = float(body.get("price_change_pct", 0))

    # Get real baseline
    inv = db.execute(text("""
        SELECT AVG(inventory_level) AS avg_inv,
               AVG(safety_stock)   AS avg_ss,
               AVG(units_sold)     AS avg_demand,
               AVG(price)          AS avg_price,
               SUM(inventory_level * price) AS total_value
        FROM fact_inventory
    """)).mappings().one()

    orders = db.execute(text("""
        SELECT AVG(days_for_shipping_real) AS avg_lt,
               AVG(late_delivery_risk)*100 AS base_late
        FROM fact_orders
    """)).mappings().one()

    # Real baseline numbers
    base_demand   = float(inv["avg_demand"]  or 10)
    base_inv      = float(inv["avg_inv"]     or 300)
    base_ss       = float(inv["avg_ss"]      or 100)
    base_price    = float(inv["avg_price"]   or 50)
    base_lt       = float(orders["avg_lt"]   or 3.5)
    base_late_pct = float(orders["base_late"] or 54.83)
    total_value   = float(inv["total_value"] or 0)

    # Apply scenario
    new_demand    = base_demand * (1 + demand_chg / 100)
    new_lead_time = base_lt * lt_mult
    new_price     = base_price * (1 + price_chg / 100)

    # Calculate outcomes
    demand_during_lt  = new_demand * new_lead_time
    days_to_stockout  = round(base_inv / new_demand, 1) if new_demand > 0 else 999
    safety_stock_gap  = demand_during_lt - base_ss
    stockout_risk_pct = min(100, max(0, round(
        (demand_during_lt / max(base_inv, 1)) * 50 +
        (base_late_pct / 100) * 20 +
        (lt_mult - 1) * 30, 1
    )))
    service_level_pct = round(max(0, min(100, 100 - stockout_risk_pct * 0.6)), 1)
    cost_impact       = round((new_demand - base_demand) * new_price * 30, 2)  # 30-day impact
    new_total_value   = round(total_value * (1 + price_chg / 100), 2)

    # Generate recommendation
    rec_parts = []
    if stockout_risk_pct > 70:
        rec_parts.append(f"🔴 CRITICAL: Stockout risk {stockout_risk_pct:.0f}% — increase safety stock immediately.")
    elif stockout_risk_pct > 40:
        rec_parts.append(f"🟠 HIGH: Stockout risk {stockout_risk_pct:.0f}% — consider pre-ordering for top SKUs.")
    else:
        rec_parts.append(f"🟢 STABLE: Stockout risk {stockout_risk_pct:.0f}% — current inventory buffers adequate.")

    if days_to_stockout < 14:
        rec_parts.append(f"⚠️ Only {days_to_stockout} days until stockout at new demand rate.")
    if lt_mult > 1.3:
        rec_parts.append(f"📦 Lead time +{(lt_mult-1)*100:.0f}% — pre-position inventory in regional warehouses.")
    if demand_chg > 20:
        rec_parts.append(f"📈 Demand surge +{demand_chg:.0f}% — activate secondary suppliers.")
    if price_chg > 15:
        rec_parts.append(f"💰 Price increase +{price_chg:.0f}% — consider hedging or bulk pre-purchase.")

    return {
        "scenario": {
            "demand_change_pct":    demand_chg,
            "lead_time_multiplier": lt_mult,
            "price_change_pct":     price_chg,
        },
        "baseline": {
            "daily_demand":   round(base_demand, 2),
            "inventory_level": round(base_inv, 2),
            "lead_time_days": round(base_lt, 2),
            "unit_price":     round(base_price, 2),
        },
        "simulation": {
            "new_daily_demand":   round(new_demand, 2),
            "new_lead_time":      round(new_lead_time, 2),
            "new_unit_price":     round(new_price, 2),
            "demand_during_lt":   round(demand_during_lt, 2),
            "safety_stock_gap":   round(safety_stock_gap, 2),
        },
        "outcomes": {
            "stockout_risk_pct":  stockout_risk_pct,
            "days_to_stockout":   days_to_stockout,
            "service_level_pct":  service_level_pct,
            "cost_impact_30d":    cost_impact,
            "new_total_value":    new_total_value,
        },
        "recommendation": " ".join(rec_parts),
        "data_source": "fact_inventory + fact_orders (PostgreSQL)"
    }
