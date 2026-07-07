"""
backend/routers/analytics.py
Analytics Lab — correlation matrix, distributions, outliers using pandas.
"""
import os, sys, json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
import pandas as pd
from scipy import stats
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from db import get_db

router = APIRouter()

NUMERIC_COLS = [
    'inventory_level', 'units_sold', 'units_ordered',
    'demand_forecast', 'price', 'discount',
    'competitor_pricing', 'safety_stock', 'reorder_point'
]


def _load_inventory_df(db: Session, cols: list[str]) -> pd.DataFrame:
    col_sql = ", ".join(cols)
    df = pd.read_sql(
        text(f"SELECT {col_sql} FROM fact_inventory LIMIT 5000"),
        db.bind
    )
    return df.dropna()


@router.get("/correlation-matrix")
def correlation_matrix(db: Session = Depends(get_db)):
    """Pearson correlation between numeric inventory columns."""
    df = _load_inventory_df(db, NUMERIC_COLS)
    corr = df.corr(method='pearson').round(4)

    # Return as ECharts-friendly format
    cols = list(corr.columns)
    matrix = []
    for i, row_name in enumerate(cols):
        for j, col_name in enumerate(cols):
            matrix.append([i, j, round(float(corr.loc[row_name, col_name]), 4)])

    return {
        "columns": cols,
        "matrix": matrix,
        "row_count": len(df)
    }


@router.get("/distribution/{column_name}")
def distribution(column_name: str, db: Session = Depends(get_db)):
    """Histogram of a numeric column using 20 bins via pandas."""
    allowed = set(NUMERIC_COLS)
    if column_name not in allowed:
        raise HTTPException(400, f"Column must be one of: {', '.join(sorted(allowed))}")

    df = _load_inventory_df(db, [column_name])
    series = df[column_name].dropna()

    bins = pd.cut(series, bins=20, precision=2)
    counts = bins.value_counts().sort_index()

    result = []
    for interval, count in counts.items():
        result.append({
            "bin_start": round(float(interval.left), 2),
            "bin_end":   round(float(interval.right), 2),
            "label":     f"{interval.left:.1f}–{interval.right:.1f}",
            "frequency": int(count)
        })

    return {
        "column": column_name,
        "total_records": len(series),
        "mean":   round(float(series.mean()), 2),
        "median": round(float(series.median()), 2),
        "std":    round(float(series.std()), 2),
        "min":    round(float(series.min()), 2),
        "max":    round(float(series.max()), 2),
        "bins":   result
    }


@router.get("/outliers")
def outliers(db: Session = Depends(get_db)):
    """Z-score outlier detection on units_sold (abs(z) > 3)."""
    df = pd.read_sql(
        text("""
            SELECT store_id, product_id, category, region,
                   units_sold, price, inventory_level, stock_status
            FROM fact_inventory
            WHERE units_sold IS NOT NULL
            LIMIT 10000
        """),
        db.bind
    )
    df = df.dropna(subset=['units_sold'])
    df['z_score'] = stats.zscore(df['units_sold'].astype(float))
    outliers_df = df[df['z_score'].abs() > 3].sort_values('z_score', ascending=False).head(20)
    outliers_df['z_score'] = outliers_df['z_score'].round(3)

    return {
        "total_records": len(df),
        "outlier_count": len(outliers_df),
        "threshold": 3.0,
        "outliers": outliers_df.to_dict(orient='records')
    }


@router.get("/summary-stats")
def summary_stats(db: Session = Depends(get_db)):
    """Summary statistics for all numeric columns."""
    df = _load_inventory_df(db, NUMERIC_COLS)
    desc = df.describe().round(2)
    return {
        "columns": NUMERIC_COLS,
        "stats": desc.to_dict(),
        "row_count": len(df)
    }
