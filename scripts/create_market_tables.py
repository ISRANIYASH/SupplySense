"""
Create the alerts table and adapt fact_commodity_prices for live price storage.
"""
from sqlalchemy import create_engine, text

e = create_engine(
    "postgresql://supplysense_admin:secure_supplysense_pwd_2026@localhost:5432/supplysense"
)

with e.begin() as conn:
    # ── alerts table ──────────────────────────────────────────────────────────
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS alerts (
            id          SERIAL PRIMARY KEY,
            type        TEXT NOT NULL DEFAULT 'MARKET_PRICE',
            severity    TEXT NOT NULL DEFAULT 'MEDIUM',
            title       TEXT NOT NULL,
            description TEXT,
            category    TEXT DEFAULT 'Price',
            read        BOOLEAN DEFAULT false,
            resolved    BOOLEAN DEFAULT false,
            created_at  TIMESTAMP DEFAULT NOW()
        )
    """))
    print("OK: alerts table ready")

    # ── live_commodity_prices table (separate from historical OHLC) ───────────
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS live_commodity_prices (
            id              SERIAL PRIMARY KEY,
            date            DATE NOT NULL,
            commodity_name  TEXT NOT NULL,
            current_price   DOUBLE PRECISION,
            previous_close  DOUBLE PRECISION,
            change_pct      DOUBLE PRECISION,
            percentile_rank DOUBLE PRECISION,
            price_1y_low    DOUBLE PRECISION,
            price_1y_high   DOUBLE PRECISION,
            price_1y_avg    DOUBLE PRECISION,
            fetched_at      TIMESTAMP DEFAULT NOW(),
            UNIQUE(date, commodity_name)
        )
    """))
    print("OK: live_commodity_prices table ready")

print("All tables created successfully.")
