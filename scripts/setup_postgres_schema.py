from sqlalchemy import create_engine, text

DB_USER = "supplysense_admin"
DB_PASS = "secure_supplysense_pwd_2026"
DB_HOST = "localhost"
DB_PORT = "5432"
DB_NAME = "supplysense"

engine = create_engine(f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}")

schema_sql = """
DROP TABLE IF EXISTS fact_orders CASCADE;
DROP TABLE IF EXISTS fact_demand_daily CASCADE;
DROP TABLE IF EXISTS fact_inventory CASCADE;
DROP TABLE IF EXISTS fact_commodity_prices CASCADE;
DROP TABLE IF EXISTS dim_suppliers CASCADE;
DROP TABLE IF EXISTS dim_products CASCADE;
DROP TABLE IF EXISTS dim_customers CASCADE;

CREATE TABLE dim_suppliers (
    supplier_id BIGINT PRIMARY KEY,
    quality_score BIGINT,
    quantity_score BIGINT,
    payment_terms_score BIGINT,
    service_score BIGINT,
    reputation_score BIGINT,
    flexibility_score BIGINT,
    financial_score BIGINT,
    asset_condition_score BIGINT,
    business_results_score BIGINT,
    price_score BIGINT,
    delivery_time DOUBLE PRECISION,
    location_score BIGINT,
    supplier_overall_score DOUBLE PRECISION
);

CREATE TABLE dim_products (
    product_id BIGINT PRIMARY KEY,
    product_name TEXT,
    category_name TEXT,
    product_price DOUBLE PRECISION
);

CREATE TABLE dim_customers (
    customer_id BIGINT PRIMARY KEY,
    customer_segment TEXT,
    customer_city TEXT,
    customer_state TEXT,
    customer_country TEXT
);

CREATE TABLE fact_orders (
    order_id BIGINT,
    order_item_id BIGINT PRIMARY KEY,
    type TEXT,
    days_for_shipping_real BIGINT,
    days_for_shipment_scheduled BIGINT,
    benefit_per_order DOUBLE PRECISION,
    sales_per_customer DOUBLE PRECISION,
    delivery_status TEXT,
    late_delivery_risk BIGINT,
    category_id BIGINT,
    category_name TEXT,
    customer_city TEXT,
    customer_country TEXT,
    customer_segment TEXT,
    customer_state TEXT,
    department_id BIGINT,
    department_name TEXT,
    market TEXT,
    order_city TEXT,
    order_country TEXT,
    order_customer_id BIGINT REFERENCES dim_customers(customer_id),
    order_date_dateorders TIMESTAMP,
    order_item_cardprod_id BIGINT REFERENCES dim_products(product_id),
    order_item_discount DOUBLE PRECISION,
    order_item_discount_rate DOUBLE PRECISION,
    order_item_product_price DOUBLE PRECISION,
    order_item_profit_ratio DOUBLE PRECISION,
    order_item_quantity BIGINT,
    sales DOUBLE PRECISION,
    order_item_total DOUBLE PRECISION,
    order_profit_per_order DOUBLE PRECISION,
    order_region TEXT,
    order_state TEXT,
    order_status TEXT,
    product_card_id BIGINT,
    product_category_id BIGINT,
    product_name TEXT,
    product_price DOUBLE PRECISION,
    shipping_date_dateorders TIMESTAMP,
    shipping_mode TEXT,
    order_month INTEGER,
    order_quarter INTEGER,
    order_day_of_week INTEGER,
    order_is_weekend BIGINT,
    order_week_of_year INTEGER,
    actual_delay_days BIGINT,
    delay_variance BIGINT,
    order_date_only DATE
);
CREATE INDEX idx_orders_date ON fact_orders(order_date_only);
CREATE INDEX idx_orders_category ON fact_orders(category_name);
CREATE INDEX idx_orders_region ON fact_orders(order_region);

CREATE TABLE fact_demand_daily (
    id SERIAL PRIMARY KEY,
    order_date_only DATE,
    category_name TEXT,
    order_region TEXT,
    order_item_quantity BIGINT
);
CREATE INDEX idx_demand_date ON fact_demand_daily(order_date_only);
CREATE INDEX idx_demand_cat_region ON fact_demand_daily(category_name, order_region);

CREATE TABLE fact_inventory (
    id SERIAL PRIMARY KEY,
    date TIMESTAMP,
    store_id TEXT,
    product_id TEXT,
    category TEXT,
    region TEXT,
    inventory_level BIGINT,
    units_sold BIGINT,
    units_ordered BIGINT,
    demand_forecast DOUBLE PRECISION,
    price DOUBLE PRECISION,
    discount BIGINT,
    weather_condition TEXT,
    holiday_promotion BIGINT,
    competitor_pricing DOUBLE PRECISION,
    seasonality TEXT,
    date_month INTEGER,
    date_week INTEGER,
    date_day_of_week INTEGER,
    safety_stock DOUBLE PRECISION,
    reorder_point DOUBLE PRECISION,
    stock_status TEXT
);
CREATE INDEX idx_inv_date ON fact_inventory(date);
CREATE INDEX idx_inv_store ON fact_inventory(store_id);
CREATE INDEX idx_inv_product ON fact_inventory(product_id);

CREATE TABLE fact_commodity_prices (
    date TIMESTAMP PRIMARY KEY,
    open DOUBLE PRECISION,
    high DOUBLE PRECISION,
    low DOUBLE PRECISION,
    close DOUBLE PRECISION,
    adj_close DOUBLE PRECISION,
    volume DOUBLE PRECISION,
    price_change_pct DOUBLE PRECISION,
    rolling_avg_7day DOUBLE PRECISION,
    rolling_avg_30day DOUBLE PRECISION,
    volatility_7day DOUBLE PRECISION,
    price_trend TEXT
);
CREATE INDEX idx_commodity_date ON fact_commodity_prices(date);
"""

if __name__ == "__main__":
    with engine.begin() as conn:
        conn.execute(text(schema_sql))
    print("Schema created successfully in PostgreSQL!")
