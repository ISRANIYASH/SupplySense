import pandas as pd
from sqlalchemy import create_engine, text

DB_USER = "supplysense_admin"
DB_PASS = "secure_supplysense_pwd_2026"
DB_HOST = "localhost"
DB_PORT = "5432"
DB_NAME = "supplysense"

engine = create_engine(f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}")

print("Loading data into PostgreSQL...")

# 1. Suppliers
suppliers = pd.read_parquet("datasets/processed/suppliers_clean.parquet")
suppliers.to_sql('dim_suppliers', engine, if_exists='append', index=False)
print(f"Loaded dim_suppliers: {len(suppliers)} rows")

# 2. Dim Products (Extracted from DataCo)
dataco = pd.read_parquet("datasets/processed/dataco_clean.parquet")
dim_products = dataco[['Product Card Id', 'Product Name', 'Category Name', 'Product Price']].drop_duplicates()
dim_products = dim_products.rename(columns={
    'Product Card Id': 'product_id',
    'Product Name': 'product_name',
    'Category Name': 'category_name',
    'Product Price': 'product_price'
})
dim_products.to_sql('dim_products', engine, if_exists='append', index=False)
print(f"Loaded dim_products: {len(dim_products)} rows")

# 3. Dim Customers (Extracted from DataCo, anonymized)
dim_customers = dataco[['Customer Segment', 'Customer City', 'Customer State', 'Customer Country']].drop_duplicates().reset_index(drop=True)
dim_customers['customer_id'] = dim_customers.index + 1
dim_customers = dim_customers.rename(columns={
    'Customer Segment': 'customer_segment',
    'Customer City': 'customer_city',
    'Customer State': 'customer_state',
    'Customer Country': 'customer_country'
})
# Reorder columns
dim_customers = dim_customers[['customer_id', 'customer_segment', 'customer_city', 'customer_state', 'customer_country']]
dim_customers.to_sql('dim_customers', engine, if_exists='append', index=False)
print(f"Loaded dim_customers: {len(dim_customers)} rows")

# 4. Fact Orders (DataCo)
fact_orders = dataco.copy()

# Map the generated customer_id back to fact_orders
# We temporarily rename dim_customers columns to match dataco for the merge
dim_customers_for_merge = dim_customers.rename(columns={
    'customer_segment': 'Customer Segment',
    'customer_city': 'Customer City',
    'customer_state': 'Customer State',
    'customer_country': 'Customer Country'
})

fact_orders = fact_orders.merge(
    dim_customers_for_merge, 
    on=['Customer Segment', 'Customer City', 'Customer State', 'Customer Country'],
    how='left'
)

# Rename columns to snake_case for postgres
fact_orders.columns = fact_orders.columns.str.lower().str.replace(' ', '_').str.replace('(', '').str.replace(')', '')

# Since we merged, customer_id is added, let's rename it to 'order_customer_id'
fact_orders = fact_orders.rename(columns={'customer_id': 'order_customer_id'})

fact_orders.to_sql('fact_orders', engine, if_exists='append', index=False)
print(f"Loaded fact_orders: {len(fact_orders)} rows")

# 5. Fact Demand Daily
demand = pd.read_parquet("datasets/processed/dataco_demand_daily.parquet")
demand.columns = demand.columns.str.lower().str.replace(' ', '_')
demand.to_sql('fact_demand_daily', engine, if_exists='append', index=False)
print(f"Loaded fact_demand_daily: {len(demand)} rows")

# 6. Fact Inventory
inventory = pd.read_parquet("datasets/processed/inventory_clean.parquet")
inventory.columns = inventory.columns.str.lower().str.replace(' ', '_').str.replace('/', '_')
inventory.to_sql('fact_inventory', engine, if_exists='append', index=False)
print(f"Loaded fact_inventory: {len(inventory)} rows")

# 7. Fact Commodity Prices
commodity = pd.read_parquet("datasets/processed/commodity_clean.parquet")
commodity.columns = commodity.columns.str.lower().str.replace(' ', '_')
commodity.to_sql('fact_commodity_prices', engine, if_exists='append', index=False)
print(f"Loaded fact_commodity_prices: {len(commodity)} rows")

print("\n--- Verifying Row Counts in PostgreSQL ---")
with engine.connect() as conn:
    for table in ['dim_suppliers', 'dim_products', 'dim_customers', 'fact_orders', 'fact_demand_daily', 'fact_inventory', 'fact_commodity_prices']:
        count = conn.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar()
        print(f"Table '{table}' has {count} rows in database.")

print("All tables loaded and verified successfully!")
