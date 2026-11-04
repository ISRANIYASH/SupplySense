"""
backend/routers/inventory.py
Inventory summary, stock distribution, ABC analysis, low stock alerts, item catalog and creation.
Calculates current stock and statistics from the latest valid inventory snapshot.
"""
import os, sys
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from db import get_db

router = APIRouter()


class ItemCreate(BaseModel):
    sku: str = Field(..., description="Unique SKU code, e.g. P0021")
    item_name: str = Field(..., description="Product or item title")
    category: str = Field(..., description="Product category")
    region: str = Field(..., description="Warehouse or operational region")
    stock: int = Field(..., ge=0, description="Current stock on hand")
    price: float = Field(..., ge=0.0, description="Unit price")
    safety_stock: Optional[float] = Field(default=50.0, ge=0.0, description="Safety stock threshold")
    reorder_point: Optional[float] = Field(default=100.0, ge=0.0, description="Reorder point threshold")


@router.get("/summary")
def get_summary(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Returns current inventory KPI metrics calculated from the latest valid
    inventory snapshots and active master items in dim_inventory_items.
    """
    query = text("""
        WITH latest_snapshots AS (
            SELECT DISTINCT ON (product_id, category, region) 
                product_id, category, region, inventory_level, price, stock_status, safety_stock
            FROM fact_inventory
            ORDER BY product_id, category, region, date DESC
        )
        SELECT
            COUNT(DISTINCT d.sku)::int                                                     AS total_skus,
            COALESCE(SUM(l.inventory_level), 0)::int                                       AS total_stock,
            COALESCE(SUM(CASE WHEN l.stock_status = 'Low' OR l.inventory_level < l.safety_stock THEN 1 ELSE 0 END), 0)::int AS low_stock_count,
            COALESCE(SUM(CASE WHEN l.stock_status = 'Excess' THEN 1 ELSE 0 END), 0)::int  AS excess_stock_count,
            COALESCE(SUM(CASE WHEN l.stock_status = 'Optimal' THEN 1 ELSE 0 END), 0)::int AS optimal_count,
            COALESCE(ROUND(AVG(l.safety_stock)::numeric, 2), 0.0)::float                   AS avg_safety_stock,
            COALESCE(ROUND(SUM(l.inventory_level * l.price)::numeric, 2), 0.0)::float      AS total_inventory_value
        FROM dim_inventory_items d
        LEFT JOIN latest_snapshots l 
          ON d.sku = l.product_id AND d.category = l.category AND d.region = l.region;
    """)
    row = db.execute(query).mappings().one()
    return dict(row)


@router.get("/stock-status-distribution")
def get_stock_status(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    """
    Returns the distribution of items and total units by stock status (Optimal, Low, Excess)
    based on the latest snapshot.
    """
    query = text("""
        WITH latest_snapshots AS (
            SELECT DISTINCT ON (product_id, category, region) 
                stock_status, inventory_level
            FROM fact_inventory
            ORDER BY product_id, category, region, date DESC
        )
        SELECT 
            stock_status,
            COUNT(*)::int                            AS count,
            COALESCE(SUM(inventory_level), 0)::int   AS total_units
        FROM latest_snapshots
        WHERE stock_status IS NOT NULL
        GROUP BY stock_status
        ORDER BY count DESC;
    """)
    rows = db.execute(query).mappings().all()
    return [dict(r) for r in rows]


@router.get("/abc-analysis")
def get_abc_analysis(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    """
    Returns revenue and SKU product counts grouped by category for ABC classification.
    """
    query = text("""
        SELECT 
            category,
            ROUND(COALESCE(SUM(units_sold * price), 0)::numeric, 2)::float AS revenue,
            COUNT(DISTINCT product_id)::int                                 AS product_count
        FROM fact_inventory
        WHERE category IS NOT NULL
        GROUP BY category
        ORDER BY revenue DESC;
    """)
    rows = db.execute(query).mappings().all()
    return [dict(r) for r in rows]


@router.get("/low-stock-items")
def get_low_stock(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    """
    Returns the top low-stock items from the latest snapshot that need immediate reordering.
    """
    query = text("""
        WITH latest_snapshots AS (
            SELECT DISTINCT ON (product_id, category, region) 
                product_id, category, region, inventory_level, safety_stock, units_sold, stock_status
            FROM fact_inventory
            ORDER BY product_id, category, region, date DESC
        )
        SELECT 
            product_id,
            category,
            region,
            inventory_level::int                                   AS avg_stock,
            ROUND(COALESCE(safety_stock, 50)::numeric, 2)::float  AS safety_stock,
            COALESCE(units_sold, 0)::int                          AS avg_daily_sales,
            COALESCE(stock_status, 'Low')                         AS stock_status
        FROM latest_snapshots
        WHERE stock_status = 'Low' OR inventory_level < safety_stock
        ORDER BY inventory_level ASC
        LIMIT 20;
    """)
    rows = db.execute(query).mappings().all()
    return [dict(r) for r in rows]


@router.get("/seasonality-trend")
def get_seasonality(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    """
    Returns seasonal patterns in units sold, average inventory, and demand forecast.
    """
    query = text("""
        SELECT 
            seasonality,
            ROUND(AVG(units_sold)::numeric, 2)::float        AS avg_units_sold,
            ROUND(AVG(inventory_level)::numeric, 2)::float   AS avg_inventory,
            ROUND(AVG(demand_forecast)::numeric, 2)::float   AS avg_forecast
        FROM fact_inventory
        WHERE seasonality IS NOT NULL
        GROUP BY seasonality
        ORDER BY seasonality;
    """)
    rows = db.execute(query).mappings().all()
    return [dict(r) for r in rows]


@router.get("/categories")
def get_categories(db: Session = Depends(get_db)) -> List[str]:
    """
    Returns a distinct, sorted list of product categories available across catalog and inventory.
    """
    query = text("""
        SELECT DISTINCT category FROM (
            SELECT category FROM dim_inventory_items
            UNION
            SELECT category FROM fact_inventory
        ) c
        WHERE category IS NOT NULL AND TRIM(category) != ''
        ORDER BY category;
    """)
    rows = db.execute(query).mappings().all()
    return [r["category"] for r in rows]


@router.get("/items")
def get_inventory_items(
    db: Session = Depends(get_db),
    category: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0)
) -> Dict[str, Any]:
    """
    Returns paginated items from the inventory catalog with live current stock,
    price, and status from the latest inventory snapshot.
    """
    # Clean filters
    cat_filter = category.strip() if category and category.strip().lower() != 'all' else None
    search_filter = f"%{search.strip()}%" if search and search.strip() else None

    # Count total matching records
    count_query = text("""
        SELECT COUNT(*)::int AS total 
        FROM dim_inventory_items
        WHERE (:cat IS NULL OR category = :cat)
          AND (:search IS NULL OR item_name ILIKE :search OR sku ILIKE :search)
    """)
    total = db.execute(count_query, {
        "cat": cat_filter,
        "search": search_filter
    }).scalar() or 0

    # Retrieve paginated items joined with latest snapshot
    data_query = text("""
        WITH latest_snapshots AS (
            SELECT DISTINCT ON (product_id, category, region) 
                product_id, category, region, inventory_level, price, stock_status
            FROM fact_inventory
            ORDER BY product_id, category, region, date DESC
        )
        SELECT 
            d.item_id, 
            d.sku, 
            d.item_name, 
            d.category, 
            d.region, 
            TO_CHAR(d.created_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS created_at,
            COALESCE(l.inventory_level, 0)::int              AS stock,
            COALESCE(ROUND(l.price::numeric, 2), 0.0)::float AS price,
            COALESCE(l.stock_status, 'Optimal')              AS status
        FROM dim_inventory_items d
        LEFT JOIN latest_snapshots l 
          ON d.sku = l.product_id AND d.category = l.category AND d.region = l.region
        WHERE (:cat IS NULL OR d.category = :cat)
          AND (:search IS NULL OR d.item_name ILIKE :search OR d.sku ILIKE :search)
        ORDER BY d.item_id DESC
        LIMIT :limit OFFSET :offset;
    """)

    rows = db.execute(data_query, {
        "cat": cat_filter,
        "search": search_filter,
        "limit": limit,
        "offset": offset
    }).mappings().all()

    return {
        "total": total,
        "items": [dict(r) for r in rows]
    }


@router.post("/items")
def create_item(item: ItemCreate, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Creates a new inventory item in dim_inventory_items and records an initial
    snapshot in fact_inventory within a single database transaction.
    """
    sku = item.sku.strip().upper()
    item_name = item.item_name.strip()
    category = item.category.strip()
    region = item.region.strip()

    if not sku:
        raise HTTPException(status_code=400, detail="SKU cannot be empty")
    if not item_name:
        raise HTTPException(status_code=400, detail="Item Name cannot be empty")
    if not category:
        raise HTTPException(status_code=400, detail="Category cannot be empty")
    if not region:
        raise HTTPException(status_code=400, detail="Region cannot be empty")

    safety_stock = float(item.safety_stock) if item.safety_stock is not None else 50.0
    reorder_point = float(item.reorder_point) if item.reorder_point is not None else 100.0

    # Compute stock status dynamically
    if item.stock <= 0 or item.stock < safety_stock:
        status = 'Low'
    elif item.stock > (reorder_point * 2.5):
        status = 'Excess'
    else:
        status = 'Optimal'

    # Check for existing item with exact (sku, category, region)
    existing = db.execute(text("""
        SELECT item_id FROM dim_inventory_items 
        WHERE sku = :sku AND category = :category AND region = :region
    """), {"sku": sku, "category": category, "region": region}).scalar()

    if existing:
        raise HTTPException(
            status_code=400, 
            detail=f"An item with SKU '{sku}' in category '{category}' and region '{region}' already exists."
        )

    try:
        with db.begin_nested():
            # 1. Insert master record into dim_inventory_items
            res = db.execute(text("""
                INSERT INTO dim_inventory_items (sku, item_name, category, region)
                VALUES (:sku, :item_name, :category, :region)
                RETURNING item_id, created_at;
            """), {
                "sku": sku,
                "item_name": item_name,
                "category": category,
                "region": region
            }).mappings().one()

            new_item_id = res["item_id"]
            created_at = res["created_at"]

            # 2. Insert initial snapshot row into fact_inventory
            db.execute(text("""
                INSERT INTO fact_inventory 
                (date, store_id, product_id, category, region, inventory_level, price, stock_status, 
                 units_sold, units_ordered, safety_stock, reorder_point, demand_forecast, discount, 
                 weather_condition, holiday_promotion, competitor_pricing, seasonality, 
                 date_month, date_week, date_day_of_week)
                VALUES (
                    CURRENT_TIMESTAMP, 'SYSTEM', :sku, :category, :region, :stock, :price, :status,
                    0, 0, :safety_stock, :reorder_point, :stock, 0,
                    'Normal', 0, :price, 'All-Season',
                    EXTRACT(MONTH FROM CURRENT_DATE), EXTRACT(WEEK FROM CURRENT_DATE), EXTRACT(DOW FROM CURRENT_DATE)
                );
            """), {
                "sku": sku,
                "category": category,
                "region": region,
                "stock": item.stock,
                "price": item.price,
                "status": status,
                "safety_stock": safety_stock,
                "reorder_point": reorder_point
            })

        db.commit()

        return {
            "success": True,
            "message": "Item created successfully",
            "item": {
                "item_id": new_item_id,
                "sku": sku,
                "item_name": item_name,
                "category": category,
                "region": region,
                "stock": item.stock,
                "price": item.price,
                "status": status,
                "created_at": created_at.isoformat() if created_at else None
            }
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Database error while creating item: {str(e)}")
