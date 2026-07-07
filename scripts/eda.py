import pandas as pd

dataco = pd.read_csv(r"datasets/raw/dataco/data_co_supply_chain_dataset.csv", 
                       encoding='latin1')

inventory = pd.read_csv(r"datasets/raw/inventory/retail_store_inventory.csv")

copper = pd.read_csv(r"datasets/raw/commodity/copper.csv")

suppliers = pd.read_excel(r"datasets/raw/suppliers/supplier_ranking_grades.xlsx")

print("\n========== DATACO ==========")
print("Shape:", dataco.shape)
print("Columns:", list(dataco.columns))
print(dataco.info())
print("\nSample rows:")
print(dataco.head(3))
print("\nMissing values:")
print(dataco.isnull().sum()[dataco.isnull().sum() > 0])
print("\nDuplicate rows:", dataco.duplicated().sum())

print("\n========== INVENTORY ==========")
print("Shape:", inventory.shape)
print("Columns:", list(inventory.columns))
print(inventory.info())
print("\nSample rows:")
print(inventory.head(3))
print("\nMissing values:")
print(inventory.isnull().sum()[inventory.isnull().sum() > 0])
print("\nDuplicate rows:", inventory.duplicated().sum())

print("\n========== COPPER / COMMODITY ==========")
print("Shape:", copper.shape)
print("Columns:", list(copper.columns))
print(copper.info())
print("\nSample rows:")
print(copper.head(3))
print("\nMissing values:")
print(copper.isnull().sum()[copper.isnull().sum() > 0])

print("\n========== SUPPLIERS ==========")
print("Shape:", suppliers.shape)
print("Columns:", list(suppliers.columns))
print(suppliers.info())
print("\nSample rows:")
print(suppliers.head(3))
print("\nMissing values:")
print(suppliers.isnull().sum()[suppliers.isnull().sum() > 0])
