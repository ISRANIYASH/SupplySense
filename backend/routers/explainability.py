"""
backend/routers/explainability.py
Honest feature importance using correlation (not fake SHAP).
Real model metrics from lstm_metrics.json.
TODO: Integrate real SHAP values once model produces them.
"""
import os, sys, json
from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
import pandas as pd
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from db import get_db

router = APIRouter()

METRICS_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", "models", "lstm_metrics.json"
)
MODEL_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", "models", "lstm_best.pt"
)


@router.get("/shap-values")
def shap_values(db: Session = Depends(get_db)):
    """
    Correlation-based feature importance (proxy for SHAP).
    Honest label: 'Statistical Feature Importance (SHAP integration pending)'.
    """
    df = pd.read_sql(text("""
        SELECT units_sold, price, discount, competitor_pricing,
               demand_forecast, inventory_level, safety_stock,
               reorder_point, units_ordered
        FROM fact_inventory
        WHERE units_sold IS NOT NULL
        LIMIT 5000
    """), db.bind).dropna()

    corr = df.corr(method='pearson')['units_sold'].drop('units_sold')
    abs_corr = corr.abs()
    normalized = (abs_corr / abs_corr.sum()).round(4)

    features = []
    for feat, imp in normalized.sort_values(ascending=False).items():
        raw_corr = float(corr[feat])
        features.append({
            "feature":       feat,
            "importance":    round(float(imp), 4),
            "raw_correlation": round(raw_corr, 4),
            "direction":     "positive" if raw_corr > 0 else "negative",
            "strength":      "strong" if abs(raw_corr) > 0.5 else
                             "moderate" if abs(raw_corr) > 0.3 else "weak"
        })

    return {
        "method":    "Pearson Correlation (normalized)",
        "label":     "Statistical Feature Importance",
        "note":      "SHAP integration pending — real SHAP values will be computed from the trained LSTM model in a future release.",
        "target":    "units_sold",
        "features":  features,
        "sample_size": len(df)
    }


@router.get("/model-info")
def model_info():
    """Return real model metrics from lstm_metrics.json + file metadata."""
    result = {
        "model_name":    "LSTM Demand Forecaster",
        "architecture":  "LSTM (Long Short-Term Memory)",
        "version":       "1.0",
        "status":        "active",
        "note":          "Model retraining in progress. MAPE is high due to limited training data. Accuracy will improve with full dataset training.",
    }

    # Real metrics from file
    if os.path.exists(METRICS_PATH):
        with open(METRICS_PATH) as f:
            metrics = json.load(f)
        result.update({
            "metrics": metrics,
            "metrics_file_exists": True,
            "metrics_last_modified": datetime.fromtimestamp(
                os.path.getmtime(METRICS_PATH)
            ).isoformat()
        })
    else:
        result["metrics"] = None
        result["metrics_file_exists"] = False

    # Real model file info
    if os.path.exists(MODEL_PATH):
        stat = os.stat(MODEL_PATH)
        result.update({
            "model_file_exists": True,
            "model_file_size_mb": round(stat.st_size / 1024 / 1024, 2),
            "model_last_trained": datetime.fromtimestamp(stat.st_mtime).isoformat()
        })
    else:
        result["model_file_exists"] = False

    return result


@router.get("/decision-trace")
def decision_trace(db: Session = Depends(get_db)):
    """Real correlation insights — what drives demand in our data."""
    df = pd.read_sql(text("""
        SELECT category, seasonality, weather_condition,
               AVG(units_sold) as avg_demand,
               COUNT(*) as records
        FROM fact_inventory
        GROUP BY category, seasonality, weather_condition
        ORDER BY avg_demand DESC
        LIMIT 20
    """), db.bind)
    return {
        "title": "Real Demand Drivers",
        "description": "Actual avg units_sold grouped by category, seasonality, and weather from fact_inventory",
        "data": df.to_dict(orient='records')
    }
