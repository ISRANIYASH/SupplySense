import pandas as pd
from clean_data import clean_dataco, clean_inventory, clean_commodity, clean_suppliers

print("Loading and cleaning datasets...")
dataco_raw = pd.read_csv("datasets/raw/dataco/data_co_supply_chain_dataset.csv", encoding='latin1')
dataco = clean_dataco(dataco_raw)

inventory_raw = pd.read_csv("datasets/raw/inventory/retail_store_inventory.csv")
inventory = clean_inventory(inventory_raw)

copper_raw = pd.read_csv("datasets/raw/commodity/copper.csv")
copper = clean_commodity(copper_raw)

suppliers_raw = pd.read_excel("datasets/raw/suppliers/supplier_ranking_grades.xlsx")
suppliers = clean_suppliers(suppliers_raw)

print("Feature engineering DataCo...")
dataco['order_month'] = dataco['order date (DateOrders)'].dt.month
dataco['order_quarter'] = dataco['order date (DateOrders)'].dt.quarter
dataco['order_day_of_week'] = dataco['order date (DateOrders)'].dt.dayofweek
dataco['order_is_weekend'] = dataco['order_day_of_week'].isin([5, 6]).astype(int)
dataco['order_week_of_year'] = dataco['order date (DateOrders)'].dt.isocalendar().week
dataco['actual_delay_days'] = (dataco['shipping date (DateOrders)'] - dataco['order date (DateOrders)']).dt.days
dataco['delay_variance'] = dataco['Days for shipping (real)'] - dataco['Days for shipment (scheduled)']

dataco['order_date_only'] = dataco['order date (DateOrders)'].dt.date
dataco_demand_daily = dataco.groupby(['order_date_only', 'Category Name', 'Order Region'])['Order Item Quantity'].sum().reset_index()

print("Feature engineering Inventory...")
inventory['date_month'] = inventory['Date'].dt.month
inventory['date_week'] = inventory['Date'].dt.isocalendar().week
inventory['date_day_of_week'] = inventory['Date'].dt.dayofweek

inventory = inventory.sort_values(by=['Product ID', 'Date'])
inventory['rolling_mean'] = inventory.groupby('Product ID')['Units Sold'].transform(lambda x: x.rolling(window=14, min_periods=1).mean())
inventory['rolling_std'] = inventory.groupby('Product ID')['Units Sold'].transform(lambda x: x.rolling(window=14, min_periods=1).std().fillna(0))
inventory['safety_stock'] = inventory['rolling_mean'] + 1.65 * inventory['rolling_std']

inventory['avg_daily_demand'] = inventory.groupby('Product ID')['Units Sold'].transform(lambda x: x.expanding().mean())
assumed_lead_time_days = 7
inventory['reorder_point'] = inventory['avg_daily_demand'] * assumed_lead_time_days

def get_stock_status(row):
    if row['Inventory Level'] < row['safety_stock']: return 'Low'
    if row['Inventory Level'] > 2 * row['safety_stock']: return 'Excess'
    return 'Optimal'

inventory['stock_status'] = inventory.apply(get_stock_status, axis=1)
inventory = inventory.drop(columns=['rolling_mean', 'rolling_std', 'avg_daily_demand'])

print("Feature engineering Commodity...")
copper['price_change_pct'] = copper['Close'].pct_change() * 100
copper['rolling_avg_7day'] = copper['Close'].rolling(window=7, min_periods=1).mean()
copper['rolling_avg_30day'] = copper['Close'].rolling(window=30, min_periods=1).mean()
copper['volatility_7day'] = copper['Close'].rolling(window=7, min_periods=1).std()

def get_price_trend(change):
    if pd.isna(change): return 'STABLE'
    if change > 1.0: return 'UP'
    if change < -1.0: return 'DOWN'
    return 'STABLE'

copper['price_trend'] = copper['price_change_pct'].apply(get_price_trend)

print("Feature engineering Suppliers...")
suppliers['supplier_overall_score'] = (
    suppliers['quality_score'] * 0.25 + 
    ((10 - suppliers['delivery_time']) / 10 * 100) * 0.20 + 
    suppliers['price_score'] * 0.15 + 
    suppliers['reputation_score'] * 0.15 + 
    suppliers['financial_score'] * 0.15 + 
    suppliers['flexibility_score'] * 0.10
)
min_score = suppliers['supplier_overall_score'].min()
max_score = suppliers['supplier_overall_score'].max()
suppliers['supplier_overall_score'] = (suppliers['supplier_overall_score'] - min_score) / (max_score - min_score) * 100

print("Saving to Parquet...")
dataco.to_parquet("datasets/processed/dataco_clean.parquet")
dataco_demand_daily.to_parquet("datasets/processed/dataco_demand_daily.parquet")
inventory.to_parquet("datasets/processed/inventory_clean.parquet")
copper.to_parquet("datasets/processed/commodity_clean.parquet")
suppliers.to_parquet("datasets/processed/suppliers_clean.parquet")

print("\n========== FINAL SHAPES & DTYPES ==========")
print("\nDATACO CLEAN:")
print(dataco.shape)
print(dataco.dtypes)

print("\nDATACO DEMAND DAILY:")
print(dataco_demand_daily.shape)
print(dataco_demand_daily.dtypes)

print("\nINVENTORY CLEAN:")
print(inventory.shape)
print(inventory.dtypes)

print("\nCOMMODITY CLEAN:")
print(copper.shape)
print(copper.dtypes)

print("\nSUPPLIERS CLEAN:")
print(suppliers.shape)
print(suppliers.dtypes)
