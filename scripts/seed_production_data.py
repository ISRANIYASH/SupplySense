"""
scripts/seed_production_data.py — Fast, idempotent, production data seeding for SupplySense.
Loads all processed datasets into Neon PostgreSQL using streaming COPY.
100% idempotent: skips any table that already contains data; does not drop or truncate.
"""
import os
import sys
import io
import json
from datetime import datetime, date
import pandas as pd
from sqlalchemy import text

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))
from db import engine

CHUNK_SIZE = 50000


def copy_dataframe(raw_conn, df: pd.DataFrame, table_name: str, columns: list):
    """Streams a DataFrame into PostgreSQL using COPY FROM STDIN."""
    cursor = raw_conn.cursor()
    cols_str = ", ".join(f'"{c}"' for c in columns)
    total = len(df)
    
    for start in range(0, total, CHUNK_SIZE):
        end = min(start + CHUNK_SIZE, total)
        chunk = df.iloc[start:end][columns]
        
        buf = io.StringIO()
        chunk.to_csv(buf, sep=',', header=False, index=False, na_rep='\\N')
        buf.seek(0)
        
        cursor.copy_expert(f"""
            COPY "{table_name}" ({cols_str})
            FROM STDIN WITH (FORMAT CSV, HEADER FALSE, NULL '\\N')
        """, buf)
        print(f"    Loaded rows {start + 1} to {end} of {total} into '{table_name}'...")
        
    raw_conn.commit()
    cursor.close()


def seed_database():
    print("=" * 60)
    print(" SupplySense AI — Production Data Seeding (Neon PostgreSQL)")
    print("=" * 60)

    # 1. Inspect current counts
    with engine.connect() as conn:
        print("\nAuditing existing table row counts:")
        tables = [
            'dim_suppliers', 'dim_products', 'dim_customers',
            'fact_orders', 'fact_demand_daily', 'fact_inventory',
            'fact_commodity_prices', 'live_commodity_prices', 'alerts', 'users'
        ]
        counts = {}
        for t in tables:
            cnt = conn.execute(text(f'SELECT COUNT(*) FROM "{t}"')).scalar()
            counts[t] = cnt
            print(f"  - {t:22}: {cnt:8} rows")

    # Read base datasets
    dataco = None
    dim_cust_df = None

    # Table 1: dim_suppliers
    if counts.get('dim_suppliers', 0) == 0:
        print("\n[1/9] Seeding 'dim_suppliers'...")
        df_supp = pd.read_parquet("datasets/processed/suppliers_clean.parquet")
        raw_conn = engine.raw_connection()
        try:
            copy_dataframe(raw_conn, df_supp, 'dim_suppliers', list(df_supp.columns))
            print(f"  Successfully seeded dim_suppliers ({len(df_supp)} rows)")
        finally:
            raw_conn.close()
    else:
        print(f"\n[1/9] 'dim_suppliers' already has {counts['dim_suppliers']} rows. Skipping.")

    # Table 2: dim_products
    if counts.get('dim_products', 0) == 0:
        print("\n[2/9] Seeding 'dim_products'...")
        if dataco is None:
            dataco = pd.read_parquet("datasets/processed/dataco_clean.parquet")
        dim_prod = dataco[['Product Card Id', 'Product Name', 'Category Name', 'Product Price']].drop_duplicates().rename(columns={
            'Product Card Id': 'product_id',
            'Product Name': 'product_name',
            'Category Name': 'category_name',
            'Product Price': 'product_price'
        })
        raw_conn = engine.raw_connection()
        try:
            copy_dataframe(raw_conn, dim_prod, 'dim_products', ['product_id', 'product_name', 'category_name', 'product_price'])
            print(f"  Successfully seeded dim_products ({len(dim_prod)} rows)")
        finally:
            raw_conn.close()
    else:
        print(f"\n[2/9] 'dim_products' already has {counts['dim_products']} rows. Skipping.")

    # Table 3: dim_customers
    if counts.get('dim_customers', 0) == 0:
        print("\n[3/9] Seeding 'dim_customers'...")
        if dataco is None:
            dataco = pd.read_parquet("datasets/processed/dataco_clean.parquet")
        dim_cust = dataco[['Customer Segment', 'Customer City', 'Customer State', 'Customer Country']].drop_duplicates().reset_index(drop=True)
        dim_cust['customer_id'] = dim_cust.index + 1
        dim_cust = dim_cust.rename(columns={
            'Customer Segment': 'customer_segment',
            'Customer City': 'customer_city',
            'Customer State': 'customer_state',
            'Customer Country': 'customer_country'
        })[['customer_id', 'customer_segment', 'customer_city', 'customer_state', 'customer_country']]
        dim_cust_df = dim_cust
        raw_conn = engine.raw_connection()
        try:
            copy_dataframe(raw_conn, dim_cust, 'dim_customers', ['customer_id', 'customer_segment', 'customer_city', 'customer_state', 'customer_country'])
            print(f"  Successfully seeded dim_customers ({len(dim_cust)} rows)")
        finally:
            raw_conn.close()
    else:
        print(f"\n[3/9] 'dim_customers' already has {counts['dim_customers']} rows. Skipping.")

    # Table 4: fact_orders
    if counts.get('fact_orders', 0) == 0:
        print("\n[4/9] Seeding 'fact_orders' (180,519 rows)...")
        if dataco is None:
            dataco = pd.read_parquet("datasets/processed/dataco_clean.parquet")
        if dim_cust_df is None:
            dim_cust = dataco[['Customer Segment', 'Customer City', 'Customer State', 'Customer Country']].drop_duplicates().reset_index(drop=True)
            dim_cust['customer_id'] = dim_cust.index + 1
            dim_cust = dim_cust.rename(columns={
                'Customer Segment': 'customer_segment',
                'Customer City': 'customer_city',
                'Customer State': 'customer_state',
                'Customer Country': 'customer_country'
            })
            dim_cust_df = dim_cust
            
        dim_cust_merge = dim_cust_df.rename(columns={
            'customer_segment': 'Customer Segment',
            'customer_city': 'Customer City',
            'customer_state': 'Customer State',
            'customer_country': 'Customer Country'
        })
        fact_orders = dataco.merge(
            dim_cust_merge,
            on=['Customer Segment', 'Customer City', 'Customer State', 'Customer Country'],
            how='left'
        )
        fact_orders.columns = fact_orders.columns.str.lower().str.replace(' ', '_').str.replace('(', '').str.replace(')', '')
        fact_orders = fact_orders.rename(columns={'customer_id': 'order_customer_id'})
        
        # Exact column order from database schema
        orders_cols = [
            'order_id', 'order_item_id', 'type', 'days_for_shipping_real', 'days_for_shipment_scheduled',
            'benefit_per_order', 'sales_per_customer', 'delivery_status', 'late_delivery_risk', 'category_id',
            'category_name', 'customer_city', 'customer_country', 'customer_segment', 'customer_state',
            'department_id', 'department_name', 'market', 'order_city', 'order_country',
            'order_customer_id', 'order_date_dateorders', 'order_item_cardprod_id', 'order_item_discount',
            'order_item_discount_rate', 'order_item_product_price', 'order_item_profit_ratio', 'order_item_quantity',
            'sales', 'order_item_total', 'order_profit_per_order', 'order_region', 'order_state', 'order_status',
            'product_card_id', 'product_category_id', 'product_name', 'product_price',
            'shipping_date_dateorders', 'shipping_mode', 'order_month', 'order_quarter', 'order_day_of_week',
            'order_is_weekend', 'order_week_of_year', 'actual_delay_days', 'delay_variance', 'order_date_only'
        ]
        fact_orders = fact_orders[orders_cols]
        raw_conn = engine.raw_connection()
        try:
            copy_dataframe(raw_conn, fact_orders, 'fact_orders', orders_cols)
            print(f"  Successfully seeded fact_orders ({len(fact_orders)} rows)")
        finally:
            raw_conn.close()
    else:
        print(f"\n[4/9] 'fact_orders' already has {counts['fact_orders']} rows. Skipping.")

    # Table 5: fact_demand_daily
    if counts.get('fact_demand_daily', 0) == 0:
        print("\n[5/9] Seeding 'fact_demand_daily' (44,684 rows)...")
        demand = pd.read_parquet("datasets/processed/dataco_demand_daily.parquet")
        demand.columns = demand.columns.str.lower().str.replace(' ', '_')
        demand_cols = ['order_date_only', 'category_name', 'order_region', 'order_item_quantity']
        demand = demand[demand_cols]
        raw_conn = engine.raw_connection()
        try:
            copy_dataframe(raw_conn, demand, 'fact_demand_daily', demand_cols)
            print(f"  Successfully seeded fact_demand_daily ({len(demand)} rows)")
        finally:
            raw_conn.close()
    else:
        print(f"\n[5/9] 'fact_demand_daily' already has {counts['fact_demand_daily']} rows. Skipping.")

    # Table 6: fact_inventory
    if counts.get('fact_inventory', 0) == 0:
        print("\n[6/9] Seeding 'fact_inventory' (73,100 rows)...")
        inv = pd.read_parquet("datasets/processed/inventory_clean.parquet")
        inv.columns = inv.columns.str.lower().str.replace(' ', '_').str.replace('/', '_').str.replace('__', '_')
        inv = inv.rename(columns={'date_dayofweek': 'date_day_of_week'})
        inv_cols = [
            'date', 'store_id', 'product_id', 'category', 'region', 'inventory_level',
            'units_sold', 'units_ordered', 'demand_forecast', 'price', 'discount',
            'weather_condition', 'holiday_promotion', 'competitor_pricing', 'seasonality',
            'date_month', 'date_week', 'date_day_of_week', 'safety_stock', 'reorder_point', 'stock_status'
        ]
        inv = inv[inv_cols]
        raw_conn = engine.raw_connection()
        try:
            copy_dataframe(raw_conn, inv, 'fact_inventory', inv_cols)
            print(f"  Successfully seeded fact_inventory ({len(inv)} rows)")
        finally:
            raw_conn.close()
    else:
        print(f"\n[6/9] 'fact_inventory' already has {counts['fact_inventory']} rows. Skipping.")

    # Table 7: fact_commodity_prices
    if counts.get('fact_commodity_prices', 0) == 0:
        print("\n[7/9] Seeding 'fact_commodity_prices' (5,291 rows)...")
        comm = pd.read_parquet("datasets/processed/commodity_clean.parquet")
        comm.columns = comm.columns.str.lower().str.replace(' ', '_')
        comm_cols = [
            'date', 'open', 'high', 'low', 'close', 'adj_close', 'volume',
            'price_change_pct', 'rolling_avg_7day', 'rolling_avg_30day', 'volatility_7day', 'price_trend'
        ]
        comm = comm[comm_cols]
        raw_conn = engine.raw_connection()
        try:
            copy_dataframe(raw_conn, comm, 'fact_commodity_prices', comm_cols)
            print(f"  Successfully seeded fact_commodity_prices ({len(comm)} rows)")
        finally:
            raw_conn.close()
    else:
        print(f"\n[7/9] 'fact_commodity_prices' already has {counts['fact_commodity_prices']} rows. Skipping.")

    # Table 8: live_commodity_prices
    if counts.get('live_commodity_prices', 0) == 0:
        print("\n[8/9] Seeding 'live_commodity_prices' (7 commodities)...")
        with open("datasets/processed/live_prices.json", "r") as f:
            live_data = json.load(f)
        
        insert_live_sql = text("""
            INSERT INTO live_commodity_prices
                (date, commodity_name, current_price, previous_close,
                 change_pct, percentile_rank, price_1y_low,
                 price_1y_high, price_1y_avg, fetched_at)
            VALUES
                (:date, :commodity_name, :current_price,
                 :previous_close, :change_pct, :percentile_rank,
                 :price_1y_low, :price_1y_high, :price_1y_avg, :fetched_at)
            ON CONFLICT (date, commodity_name) DO NOTHING
        """)
        today = date.today()
        seeded_live = 0
        with engine.begin() as conn:
            for name, d in live_data.items():
                if "current_price" not in d:
                    continue
                fetched_at_str = d.get("fetched_at")
                fetched_dt = datetime.fromisoformat(fetched_at_str) if fetched_at_str else datetime.utcnow()
                conn.execute(insert_live_sql, {
                    "date": today,
                    "commodity_name": name,
                    "current_price": d.get("current_price"),
                    "previous_close": d.get("previous_close"),
                    "change_pct": d.get("change_pct"),
                    "percentile_rank": d.get("percentile_rank"),
                    "price_1y_low": d.get("1y_low"),
                    "price_1y_high": d.get("1y_high"),
                    "price_1y_avg": d.get("1y_avg"),
                    "fetched_at": fetched_dt
                })
                seeded_live += 1
        print(f"  Successfully seeded {seeded_live} rows into live_commodity_prices")
    else:
        print(f"\n[8/9] 'live_commodity_prices' already has {counts['live_commodity_prices']} rows. Skipping.")

    # Table 9: alerts
    if counts.get('alerts', 0) == 0:
        print("\n[9/9] Seeding 'alerts' (operational and market alerts)...")
        insert_alert_sql = text("""
            INSERT INTO alerts
                (type, severity, title, description, category, read, resolved, created_at)
            VALUES
                (:type, :severity, :title, :description, :category, false, false, :created_at)
        """)
        alerts_to_insert = []
        
        # 1. Market alerts from market_analysis.json
        if os.path.exists("datasets/processed/market_analysis.json"):
            with open("datasets/processed/market_analysis.json", "r") as f:
                market_analysis = json.load(f)
            for item in market_analysis:
                alerts_to_insert.append({
                    "type": "MARKET_PRICE",
                    "severity": item.get("severity", "MEDIUM"),
                    "title": f"{item.get('signal', 'NOTICE')}: {item.get('commodity')}",
                    "description": item.get("reasoning", "Market movement identified"),
                    "category": "Price",
                    "created_at": datetime.utcnow()
                })

        # 2. Operational inventory & logistics alerts
        alerts_to_insert.extend([
            {
                "type": "INVENTORY_LOW",
                "severity": "HIGH",
                "title": "Low Stock Warning: Cardio Equipment",
                "description": "Inventory fell below safety stock threshold of 45 units in Pacific regional warehouse.",
                "category": "Inventory",
                "created_at": datetime.utcnow()
            },
            {
                "type": "DELIVERY_DELAY",
                "severity": "CRITICAL",
                "title": "Late Delivery Spike: Southeast Asia Route",
                "description": "Historical shipping delay variance increased by 2.4 days across scheduled maritime freight.",
                "category": "Logistics",
                "created_at": datetime.utcnow()
            },
            {
                "type": "SUPPLIER_RISK",
                "severity": "MEDIUM",
                "title": "Supplier Performance Notice: Supplier 24",
                "description": "Overall reliability score dipped below 40 due to consecutive delivery delays.",
                "category": "Procurement",
                "created_at": datetime.utcnow()
            }
        ])

        with engine.begin() as conn:
            for alert in alerts_to_insert:
                conn.execute(insert_alert_sql, alert)
        print(f"  Successfully seeded {len(alerts_to_insert)} alerts into 'alerts' table.")
    else:
        print(f"\n[9/9] 'alerts' already has {counts['alerts']} rows. Skipping.")

    # Final Verification
    print("\n" + "=" * 60)
    print(" Final Database Audit — Row Counts Across All Tables")
    print("=" * 60)
    with engine.connect() as conn:
        total_rows = 0
        for t in tables:
            cnt = conn.execute(text(f'SELECT COUNT(*) FROM "{t}"')).scalar()
            total_rows += cnt
            print(f"  [OK] {t:22}: {cnt:8} rows")
        print("-" * 60)
        print(f"  Total records across database: {total_rows:8} rows")
        print("=" * 60)


if __name__ == "__main__":
    seed_database()
