"""
backend/routers/weather.py
Weather Intelligence — uses weather_condition data from fact_inventory.
Real weather-demand correlation from historical data.
TODO: Integrate live weather API (OpenWeatherMap/AccuWeather) once API key is configured.
"""
import os, sys
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from db import get_db

router = APIRouter()


@router.get("/impact-analysis")
def weather_impact(db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT weather_condition,
               ROUND(AVG(units_sold)::numeric, 2)        AS avg_units_sold,
               ROUND(AVG(inventory_level)::numeric, 2)   AS avg_inventory,
               ROUND(AVG(demand_forecast)::numeric, 2)   AS avg_forecast,
               COUNT(*)                                   AS record_count,
               ROUND(AVG(price)::numeric, 2)             AS avg_price
        FROM fact_inventory
        WHERE weather_condition IS NOT NULL
        GROUP BY weather_condition
        ORDER BY avg_units_sold DESC
    """)).mappings().all()
    return {
        "data": [dict(r) for r in rows],
        "note": "Real weather-demand correlation from fact_inventory dataset. Live weather API integration pending.",
        "source": "fact_inventory (PostgreSQL)"
    }


@router.get("/seasonal-impact")
def seasonal_impact(db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT seasonality, weather_condition,
               ROUND(AVG(units_sold)::numeric, 2)        AS avg_demand,
               ROUND(AVG(inventory_level)::numeric, 2)   AS avg_inventory,
               COUNT(*)                                   AS record_count
        FROM fact_inventory
        WHERE seasonality IS NOT NULL AND weather_condition IS NOT NULL
        GROUP BY seasonality, weather_condition
        ORDER BY seasonality, avg_demand DESC
    """)).mappings().all()
    return [dict(r) for r in rows]


@router.get("/conditions-list")
def conditions_list(db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT DISTINCT weather_condition, COUNT(*) as count
        FROM fact_inventory
        WHERE weather_condition IS NOT NULL
        GROUP BY weather_condition
        ORDER BY count DESC
    """)).mappings().all()
    return [dict(r) for r in rows]


@router.get("/category-weather-matrix")
def category_weather(db: Session = Depends(get_db)):
    """Which categories are most impacted by each weather condition."""
    rows = db.execute(text("""
        SELECT category, weather_condition,
               ROUND(AVG(units_sold)::numeric, 2) AS avg_demand,
               COUNT(*) AS records
        FROM fact_inventory
        WHERE category IS NOT NULL AND weather_condition IS NOT NULL
        GROUP BY category, weather_condition
        ORDER BY category, avg_demand DESC
    """)).mappings().all()
    return [dict(r) for r in rows]
