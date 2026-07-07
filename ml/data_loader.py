import os
import torch
from torch.utils.data import Dataset, DataLoader
import pandas as pd
import numpy as np
from sqlalchemy import create_engine
from sklearn.preprocessing import MinMaxScaler, LabelEncoder
from dotenv import load_dotenv

load_dotenv()

DB_USER = os.getenv("POSTGRES_USER", "supplysense_admin")
DB_PASS = os.getenv("POSTGRES_PASSWORD", "secure_supplysense_pwd_2026")
DB_HOST = os.getenv("POSTGRES_HOST", "localhost")
DB_PORT = os.getenv("POSTGRES_PORT", "5432")
DB_NAME = os.getenv("POSTGRES_DB", "supplysense")

def get_data_from_db():
    engine = create_engine(f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}")
    query = """
    SELECT 
      date,
      date_month,
      date_day_of_week,
      date_week,
      weather_condition,
      holiday_promotion,
      seasonality,
      price,
      discount,
      units_sold
    FROM fact_inventory
    WHERE product_id = 'P0002'
    ORDER BY date
    """
    df = pd.read_sql(query, engine)
    return df

class DemandDataset(Dataset):
    def __init__(self, X, y):
        self.X = torch.tensor(X, dtype=torch.float32)
        self.y = torch.tensor(y, dtype=torch.float32)
        
    def __len__(self):
        return len(self.X)
        
    def __getitem__(self, idx):
        return self.X[idx], self.y[idx]

def create_sequences(df, feature_cols, lookback=14):
    df = df.sort_values(by=['date'])
    
    all_X = []
    all_y = []
    
    # units_sold is our target
    target_idx = feature_cols.index('units_sold')
    
    group_vals = df[feature_cols].values
    if len(group_vals) <= lookback:
        return np.array([]), np.array([])
        
    for i in range(len(group_vals) - lookback):
        seq_x = group_vals[i:(i + lookback), :]
        seq_y = group_vals[i + lookback, target_idx]  # scaled target
        all_X.append(seq_x)
        all_y.append(seq_y)
            
    return np.array(all_X, dtype=np.float32), np.array(all_y, dtype=np.float32)

def prepare_dataloaders(lookback=14, batch_size=64):
    df = get_data_from_db()
    
    # Fill missing or convert types if needed
    df['holiday_promotion'] = df['holiday_promotion'].fillna(0).astype(int)
    
    # Encode categorical features
    weather_le = LabelEncoder()
    df['weather_condition'] = weather_le.fit_transform(df['weather_condition'].astype(str))
    
    season_le = LabelEncoder()
    df['seasonality'] = season_le.fit_transform(df['seasonality'].astype(str))
    
    feature_cols = [
        'date_month', 'date_day_of_week', 'date_week', 
        'weather_condition', 'holiday_promotion', 'seasonality', 
        'price', 'discount', 'units_sold'
    ]

    # Time-based split BEFORE scaling
    df = df.sort_values(by=['date']).reset_index(drop=True)

    n = len(df)
    train_end = int(n * 0.70)
    val_end   = int(n * 0.85)
    
    df_train = df.iloc[:train_end].copy()
    
    # Fit scalers on train data
    feat_scaler = MinMaxScaler()
    feat_scaler.fit(df_train[feature_cols])
    
    # Target scaler for 'units_sold'
    target_scaler = MinMaxScaler()
    target_scaler.fit(df_train[['units_sold']])

    # Scale the entire dataframe
    df_scaled = df.copy()
    df_scaled[feature_cols] = feat_scaler.transform(df[feature_cols])

    # Create sequences
    X_scaled, y_scaled = create_sequences(df_scaled, feature_cols, lookback)
    
    # Split the sequences
    n_seq = len(X_scaled)
    seq_train_end = int(n_seq * 0.70)
    seq_val_end   = int(n_seq * 0.85)

    X_train = X_scaled[:seq_train_end]
    y_train = y_scaled[:seq_train_end]

    X_val = X_scaled[seq_train_end:seq_val_end]
    y_val = y_scaled[seq_train_end:seq_val_end]

    X_test = X_scaled[seq_val_end:]
    y_test = y_scaled[seq_val_end:]

    train_dataset = DemandDataset(X_train, y_train)
    val_dataset   = DemandDataset(X_val,   y_val)
    test_dataset  = DemandDataset(X_test,  y_test)

    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=False)
    val_loader   = DataLoader(val_dataset,   batch_size=batch_size, shuffle=False)
    test_loader  = DataLoader(test_dataset,  batch_size=batch_size, shuffle=False)

    print(f"Training samples:   {len(train_dataset)}")
    print(f"Validation samples: {len(val_dataset)}")
    print(f"Test samples:       {len(test_dataset)}")
    print(f"Feature count per timestep: {len(feature_cols)}")

    return train_loader, val_loader, test_loader, len(feature_cols), target_scaler
