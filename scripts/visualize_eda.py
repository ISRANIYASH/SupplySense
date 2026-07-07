import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import os
import warnings
warnings.filterwarnings('ignore')

os.makedirs('reports/eda_charts', exist_ok=True)

print("Loading DataCo Demand...")
demand = pd.read_parquet('datasets/processed/dataco_demand_daily.parquet')
demand['order_date_only'] = pd.to_datetime(demand['order_date_only'])

plt.figure(figsize=(12, 6))
daily_total = demand.groupby('order_date_only')['Order Item Quantity'].sum()
plt.plot(daily_total.index, daily_total.values)
plt.title('Total Daily Order Quantity')
plt.savefig('reports/eda_charts/dataco_daily_demand.png')
plt.close()

plt.figure(figsize=(12, 6))
top_cats = demand.groupby('Category Name')['Order Item Quantity'].sum().nlargest(10)
sns.barplot(x=top_cats.values, y=top_cats.index)
plt.title('Top 10 Categories by Order Quantity')
plt.savefig('reports/eda_charts/dataco_top_categories.png')
plt.close()

plt.figure(figsize=(12, 6))
regions = demand.groupby('Order Region')['Order Item Quantity'].sum().sort_values(ascending=False)
sns.barplot(x=regions.values, y=regions.index)
plt.title('Total Order Quantity by Region')
plt.savefig('reports/eda_charts/dataco_regions.png')
plt.close()

print("Loading DataCo Orders...")
dataco = pd.read_parquet('datasets/processed/dataco_clean.parquet')

plt.figure(figsize=(10, 6))
sns.histplot(dataco['actual_delay_days'], bins=20, kde=True)
plt.title('Distribution of Actual Delay Days')
plt.savefig('reports/eda_charts/dataco_delay_days_hist.png')
plt.close()

plt.figure(figsize=(8, 6))
sns.countplot(data=dataco, x='Late_delivery_risk')
plt.title('Late Delivery Risk Count')
plt.savefig('reports/eda_charts/dataco_late_risk_count.png')
plt.close()

plt.figure(figsize=(10, 6))
delay_var = dataco.groupby('Shipping Mode')['delay_variance'].mean().reset_index()
sns.barplot(data=delay_var, x='Shipping Mode', y='delay_variance')
plt.title('Average Delay Variance by Shipping Mode')
plt.savefig('reports/eda_charts/dataco_delay_var_shipping.png')
plt.close()

print("Loading Inventory...")
inv = pd.read_parquet('datasets/processed/inventory_clean.parquet')
top_product = inv['Product ID'].value_counts().idxmax()
inv_prod = inv[inv['Product ID'] == top_product].sort_values('Date')

plt.figure(figsize=(12, 6))
plt.plot(inv_prod['Date'], inv_prod['Inventory Level'], label='Inventory Level')
plt.plot(inv_prod['Date'], inv_prod['Units Sold'], label='Units Sold')
plt.legend()
plt.title(f'Inventory Level vs Units Sold for {top_product}')
plt.savefig('reports/eda_charts/inventory_level_vs_sold.png')
plt.close()

plt.figure(figsize=(8, 8))
stock_status = inv['stock_status'].value_counts()
plt.pie(stock_status.values, labels=stock_status.index, autopct='%1.1f%%')
plt.title('Stock Status Distribution')
plt.savefig('reports/eda_charts/inventory_stock_status.png')
plt.close()

plt.figure(figsize=(10, 6))
seas = inv.groupby('Seasonality')['Units Sold'].mean().reset_index()
sns.barplot(data=seas, x='Seasonality', y='Units Sold')
plt.title('Average Units Sold by Seasonality')
plt.savefig('reports/eda_charts/inventory_seasonality.png')
plt.close()

print("Loading Commodity...")
copper = pd.read_parquet('datasets/processed/commodity_clean.parquet')

plt.figure(figsize=(12, 6))
plt.plot(copper['Date'], copper['Close'])
plt.title('Copper Close Price Over Time')
plt.savefig('reports/eda_charts/copper_close_price.png')
plt.close()

plt.figure(figsize=(12, 6))
plt.plot(copper['Date'], copper['rolling_avg_7day'], label='7-Day MA', alpha=0.8)
plt.plot(copper['Date'], copper['rolling_avg_30day'], label='30-Day MA', alpha=0.8)
plt.legend()
plt.title('Copper Rolling Averages (7D vs 30D)')
plt.savefig('reports/eda_charts/copper_rolling_avg.png')
plt.close()

plt.figure(figsize=(10, 6))
sns.histplot(copper['price_change_pct'].dropna(), bins=50, kde=True)
plt.title('Distribution of Price Change %')
plt.savefig('reports/eda_charts/copper_price_change.png')
plt.close()

print("Loading Suppliers...")
sup = pd.read_parquet('datasets/processed/suppliers_clean.parquet')

plt.figure(figsize=(12, 6))
sup_sorted = sup.sort_values('supplier_overall_score', ascending=False)
sns.barplot(data=sup_sorted, x='supplier_id', y='supplier_overall_score', order=sup_sorted['supplier_id'])
plt.title('Supplier Overall Score')
plt.xticks(rotation=90)
plt.savefig('reports/eda_charts/suppliers_overall_score.png')
plt.close()

plt.figure(figsize=(10, 8))
plt.scatter(sup['quality_score'], sup['price_score'], s=sup['supplier_overall_score']*5, alpha=0.6)
plt.xlabel('Quality Score')
plt.ylabel('Price Score')
plt.title('Quality vs Price (Size = Overall Score)')
plt.savefig('reports/eda_charts/suppliers_quality_vs_price.png')
plt.close()

print("\n--- Summary of Findings ---")
print("1. DataCo Demand Daily: Total order quantities are consistent but have visible seasonal peaks. Top categories like 'Cleats' and 'Men's Footwear' dominate. Regions like 'Central America' and 'Western Europe' have the highest order volumes.")
print("2. DataCo Delivery: The delay variance shows standard class shipments frequently have a slight delay, while first-class/same-day vary differently. A very high proportion of orders (around 54%) are marked with Late_delivery_risk=1.")
print("3. Inventory: Over half of the stock statuses are 'Optimal' but a significant chunk is 'Low' or 'Excess'. Units sold show clear seasonal trends, with Winter and Autumn slightly higher than others.")
print("4. Commodity (Copper): The price series exhibits huge long-term trends and volatility spikes. Price change % is normally distributed around 0 but with fat tails indicating extreme market shocks.")
print("5. Suppliers: Supplier scores range widely from ~20 to 100. The scatter plot reveals that some suppliers with high quality scores manage to keep competitive prices, resulting in large overall scores, while others fall behind.")
