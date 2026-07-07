import pandas as pd

def clean_dataco(df):
    cols_to_drop = ['Customer Email', 'Customer Fname', 'Customer Lname', 'Customer Password', 
                    'Customer Street', 'Customer Zipcode', 'Order Zipcode', 'Latitude', 'Longitude', 
                    'Product Description', 'Product Image', 'Customer Id', 'Order Customer Id']
    df = df.drop(columns=cols_to_drop)
    df['order date (DateOrders)'] = pd.to_datetime(df['order date (DateOrders)'])
    df['shipping date (DateOrders)'] = pd.to_datetime(df['shipping date (DateOrders)'])
    if df['Product Status'].nunique() == 1:
        df = df.drop(columns=['Product Status'])
    return df

def clean_inventory(df):
    df['Date'] = pd.to_datetime(df['Date'])
    return df

def clean_commodity(df):
    df['Date'] = pd.to_datetime(df['Date'])
    df = df.sort_values(by='Date')
    df = df.ffill()
    return df

def clean_suppliers(df):
    cols_rename = {
        'supplier': 'supplier_id',
        'quality': 'quality_score',
        'quantity': 'quantity_score',
        'conditions and method of payment': 'payment_terms_score',
        'serviceability and communicativeness of the supplier': 'service_score',
        'reputation of the supplier and its competence': 'reputation_score',
        'flexibility': 'flexibility_score',
        'financial condition of the supplier': 'financial_score',
        "condition of the supplier's assets": 'asset_condition_score',
        'business results and number of employees': 'business_results_score',
        'price': 'price_score',
        'delivery time': 'delivery_time',
        "supplier's location and traffic connections": 'location_score'
    }
    df = df.rename(columns=cols_rename)
    return df
