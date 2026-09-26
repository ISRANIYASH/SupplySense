"""
backend/routers/inventory.py
Inventory summary, stock distribution, ABC analysis, low stock alerts.
"""
import os, sys
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from db import get_db

router = APIRouter()


@router.get("/summary")
def get_summary(db: Session = Depends(get_db)):
    row = db.execute(text("""
        SELECT
            COUNT(DISTINCT product_id)                                    AS total_skus,
            COALESCE(SUM(inventory_level), 0)                             AS total_stock,
            SUM(CASE WHEN stock_status = 'Low'     THEN 1 ELSE 0 END)    AS low_stock_count,
            SUM(CASE WHEN stock_status = 'Excess'  THEN 1 ELSE 0 END)    AS excess_stock_count,
            SUM(CASE WHEN stock_status = 'Optimal' THEN 1 ELSE 0 END)    AS optimal_count,
            ROUND(AVG(safety_stock)::numeric, 2)                          AS avg_safety_stock,
            COALESCE(SUM(inventory_level * price), 0)                     AS total_inventory_value
        FROM fact_inventory
    """)).mappings().one()
    return dict(row)


@router.get("/stock-status-distribution")
def get_stock_status(db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT stock_status,
               COUNT(*)                   AS count,
               SUM(inventory_level)       AS total_units
        FROM fact_inventory
        GROUP BY stock_status
        ORDER BY count DESC
    """)).mappings().all()
    return [dict(r) for r in rows]


@router.get("/abc-analysis")
def get_abc_analysis(db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT category,
               COALESCE(SUM(units_sold * price), 0)  AS revenue,
               COUNT(DISTINCT product_id)             AS product_count
        FROM fact_inventory
        GROUP BY category
        ORDER BY revenue DESC
    """)).mappings().all()
    return [dict(r) for r in rows]


@router.get("/low-stock-items")
def get_low_stock(db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT product_id,
               category,
               region,
               ROUND(AVG(inventory_level)::numeric, 2)  AS avg_stock,
               ROUND(AVG(safety_stock)::numeric, 2)     AS safety_stock,
               ROUND(AVG(units_sold)::numeric, 2)       AS avg_daily_sales,
               stock_status
        FROM fact_inventory
        WHERE stock_status = 'Low'
        GROUP BY product_id, category, region, stock_status
        ORDER BY avg_stock ASC
        LIMIT 20
    """)).mappings().all()
    return [dict(r) for r in rows]


@router.get("/seasonality-trend")
def get_seasonality(db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT seasonality,
               ROUND(AVG(units_sold)::numeric, 2)        AS avg_units_sold,
               ROUND(AVG(inventory_level)::numeric, 2)   AS avg_inventory,
               ROUND(AVG(demand_forecast)::numeric, 2)   AS avg_forecast
        FROM fact_inventory
        GROUP BY seasonality
        ORDER BY seasonality
    """)).mappings().all()
    return [dict(r) for r in rows]

from pydantic import BaseModel
from fastapi import HTTPException

class ItemCreate(BaseModel):
    sku: str
    item_name: str
    category: str
    region: str
    stock: int
    price: float

@router.get("/items")
def get_inventory_items(
    db: Session = Depends(get_db),
    category: str = None,
    search: str = None,
    limit: int = 50,
    offset: int = 0
):
    # Get total count
    count_query = """
        SELECT COUNT(*) as total 
        FROM dim_inventory_items
        WHERE (:category IS NULL OR category = :category)
          AND (:search IS NULL OR item_name ILIKE :search OR sku ILIKE :search)
    """
    
    search_val = f"%{search}%" if search else None
    
    total = db.execute(text(count_query), {
        "category": category,
        "search": search_val
    }).scalar()

    # Get paginated data
    data_query = """
        WITH latest_snapshots AS (
            SELECT DISTINCT ON (product_id, category, region) 
                product_id, category, region, inventory_level, price, stock_status
            FROM fact_inventory
            ORDER BY product_id, category, region, date DESC
        )
        SELECT d.item_id, d.sku, d.item_name, d.category, d.region, d.created_at,
               COALESCE(l.inventory_level, 0) as stock,
               COALESCE(l.price, 0.0) as price,
               COALESCE(l.stock_status, 'Unknown') as status
        FROM dim_inventory_items d
        LEFT JOIN latest_snapshots l 
          ON d.sku = l.product_id AND d.category = l.category AND d.region = l.region
        WHERE (:category IS NULL OR d.category = :category)
          AND (:search IS NULL OR d.item_name ILIKE :search OR d.sku ILIKE :search)
        ORDER BY d.item_id DESC
        LIMIT :limit OFFSET :offset
    """
    
    rows = db.execute(text(data_query), {
        "category": category,
        "search": search_val,
        "limit": limit,
        "offset": offset
    }).mappings().all()

    return {
        "total": total,
        "items": [dict(r) for r in rows]
    }

@router.get("/categories")
def get_categories(db: Session = Depends(get_db)):
    rows = db.execute(text("SELECT DISTINCT category FROM dim_inventory_items ORDER BY category")).mappings().all()
    return [r["category"] for r in rows]

@router.post("/items")
def create_item(item: ItemCreate, db: Session = Depends(get_db)):
    try:
        # Start transaction block
        with db.begin_nested():
            # Insert master record (will fail if sku+category+region exists)
            db.execute(text("""
                INSERT INTO dim_inventory_items (sku, item_name, category, region)
                VALUES (:sku, :item_name, :category, :region)
            """), {
                "sku": item.sku,
                "item_name": item.item_name,
                "category": item.category,
                "region": item.region
            })
            
            # Insert day-1 snapshot
            db.execute(text("""
                INSERT INTO fact_inventory 
                (date, store_id, product_id, category, region, inventory_level, price, stock_status, units_sold, units_ordered, safety_stock, reorder_point)
                VALUES (CURRENT_TIMESTAMP, 'SYSTEM', :sku, :category, :region, :stock, :price, 'Optimal', 0, 0, 50, 100)
            """), {
                "sku": item.sku,
                "category": item.category,
                "region": item.region,
                "stock": item.stock,
                "price": item.price
            })
        db.commit()
        return {"success": True, "message": "Item created successfully", "item": item.dict()}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail="Item already exists or database error: " + str(e))
