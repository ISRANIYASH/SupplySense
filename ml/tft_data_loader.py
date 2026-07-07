import os
import sys
import pandas as pd
from sqlalchemy import text
from pytorch_forecasting import TimeSeriesDataSet, GroupNormalizer

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from backend.db import engine

def load_and_preprocess_data():
    print("Loading data from database...")
    query = """
        SELECT order_date_only as date, category_name, order_region,
               SUM(order_item_quantity) as demand
        FROM fact_demand_daily
        GROUP BY order_date_only, category_name, order_region
        ORDER BY category_name, order_region, order_date_only
    """
    df = pd.read_sql(query, engine)
    
    # Ensure date is datetime
    df['date'] = pd.to_datetime(df['date'])
    
    # Filter groups with fewer than 60 rows
    group_counts = df.groupby(['category_name', 'order_region']).size()
    valid_groups = group_counts[group_counts >= 60].index
    
    original_groups = len(group_counts)
    kept_groups = len(valid_groups)
    print(f"Total groups: {original_groups}. Kept {kept_groups} groups (>= 60 rows), dropped {original_groups - kept_groups}.")
    
    df = df[df.set_index(['category_name', 'order_region']).index.isin(valid_groups)].copy()
    
    print("Engineering features...")
    # Add time_idx
    # We must ensure time_idx is continuous per group. If dates are missing, we should theoretically reindex,
    # but for simplicity we will assign sequential time_idx per group assuming daily data.
    # To be perfectly safe, we sort by date and rank.
    df = df.sort_values(by=['category_name', 'order_region', 'date'])
    df['time_idx'] = df.groupby(['category_name', 'order_region']).cumcount()
    
    # Temporal features (categoricals should be strings)
    df['month'] = df['date'].dt.month.astype(str)
    df['day_of_week'] = df['date'].dt.dayofweek.astype(str)
    df['is_weekend'] = (df['date'].dt.dayofweek >= 5).astype(str)
    
    # Convert demand to float for normalizer
    df['demand'] = df['demand'].astype(float)
    
    return df

def get_dataloaders(df, batch_size=64):
    print("Building TimeSeriesDataSet...")
    max_encoder_length = 30
    max_prediction_length = 7
    
    training_cutoff = df['time_idx'].max() - max_prediction_length
    
    training_dataset = TimeSeriesDataSet(
        df[lambda x: x.time_idx <= training_cutoff],
        time_idx="time_idx",
        target="demand",
        group_ids=["category_name", "order_region"],
        min_encoder_length=max_encoder_length // 2,
        max_encoder_length=max_encoder_length,
        min_prediction_length=1,
        max_prediction_length=max_prediction_length,
        static_categoricals=["category_name", "order_region"],
        time_varying_known_categoricals=["month", "day_of_week", "is_weekend"],
        time_varying_unknown_reals=["demand"],
        target_normalizer=GroupNormalizer(
            groups=["category_name", "order_region"], transformation="softplus"
        ),
        add_relative_time_idx=True,
        add_target_scales=True,
        add_encoder_length=True,
    )
    
    validation_dataset = TimeSeriesDataSet.from_dataset(
        training_dataset, df, predict=True, stop_randomization=True
    )
    
    train_dataloader = training_dataset.to_dataloader(train=True, batch_size=batch_size, num_workers=0)
    val_dataloader = validation_dataset.to_dataloader(train=False, batch_size=batch_size, num_workers=0)
    
    print(f"Total rows used: {len(df)}")
    print(f"Train batches: {len(train_dataloader)}")
    print(f"Val batches: {len(val_dataloader)}")
    
    return training_dataset, validation_dataset, train_dataloader, val_dataloader

if __name__ == "__main__":
    df = load_and_preprocess_data()
    _, _, t, v = get_dataloaders(df)
