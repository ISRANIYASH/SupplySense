#!/usr/bin/env bash
# ============================================================
# PostgreSQL Multi-Database Initialisation Script
# Creates: supplysense, airflow, mlflow databases
# Runs automatically when the postgres container first starts.
# ============================================================
set -euo pipefail

# The primary DB (POSTGRES_DB) is already created by Docker's
# official image entrypoint. We create additional databases here.

DATABASES=("supplysense" "airflow" "mlflow")

create_database() {
    local db="$1"
    echo ">>> Creating database: $db"
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "postgres" <<-EOSQL
        SELECT 'CREATE DATABASE $db'
        WHERE NOT EXISTS (
            SELECT FROM pg_database WHERE datname = '$db'
        )\gexec

        GRANT ALL PRIVILEGES ON DATABASE $db TO $POSTGRES_USER;
EOSQL
    echo ">>> Database '$db' ready."
}

create_extensions() {
    local db="$1"
    echo ">>> Enabling extensions on: $db"
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$db" <<-EOSQL
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
        CREATE EXTENSION IF NOT EXISTS "pg_trgm";
        CREATE EXTENSION IF NOT EXISTS "btree_gin";
        CREATE EXTENSION IF NOT EXISTS "pgcrypto";
EOSQL
}

# ── supplysense ──────────────────────────────────────────────
create_database "supplysense"
create_extensions "supplysense"

# Create application schemas inside supplysense
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "supplysense" <<-EOSQL
    CREATE SCHEMA IF NOT EXISTS core;
    CREATE SCHEMA IF NOT EXISTS ml;
    CREATE SCHEMA IF NOT EXISTS audit;
    CREATE SCHEMA IF NOT EXISTS analytics;

    -- Core operational tables
    CREATE TABLE IF NOT EXISTS core.users (
        id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email       TEXT UNIQUE NOT NULL,
        full_name   TEXT NOT NULL,
        role        TEXT NOT NULL,
        hashed_pw   TEXT NOT NULL,
        is_active   BOOLEAN NOT NULL DEFAULT TRUE,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS core.suppliers (
        id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name            TEXT NOT NULL,
        country         TEXT NOT NULL,
        risk_score      NUMERIC(5,2),
        otif_rate       NUMERIC(5,2),
        lead_time_days  INTEGER,
        tier            TEXT,
        is_active       BOOLEAN NOT NULL DEFAULT TRUE,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS core.products (
        id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        sku         TEXT UNIQUE NOT NULL,
        name        TEXT NOT NULL,
        category    TEXT,
        unit_cost   NUMERIC(12,2),
        is_active   BOOLEAN NOT NULL DEFAULT TRUE,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS core.purchase_orders (
        id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        po_number   TEXT UNIQUE NOT NULL,
        supplier_id UUID REFERENCES core.suppliers(id),
        status      TEXT NOT NULL DEFAULT 'DRAFT',
        total_amount NUMERIC(15,2),
        currency    TEXT NOT NULL DEFAULT 'USD',
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS ml.forecasts (
        id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        sku_id      UUID REFERENCES core.products(id),
        date        DATE NOT NULL,
        predicted   NUMERIC(12,2) NOT NULL,
        lower_bound NUMERIC(12,2),
        upper_bound NUMERIC(12,2),
        model_version TEXT,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS audit.events (
        id          BIGSERIAL PRIMARY KEY,
        user_id     UUID,
        action      TEXT NOT NULL,
        entity_type TEXT,
        entity_id   UUID,
        payload     JSONB,
        ip_address  INET,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_suppliers_risk_score ON core.suppliers(risk_score);
    CREATE INDEX IF NOT EXISTS idx_products_sku ON core.products USING gin(sku gin_trgm_ops);
    CREATE INDEX IF NOT EXISTS idx_forecasts_sku_date ON ml.forecasts(sku_id, date);
    CREATE INDEX IF NOT EXISTS idx_audit_user ON audit.events(user_id, created_at);
EOSQL

echo ">>> supplysense schemas and tables created."

# ── airflow ──────────────────────────────────────────────────
create_database "airflow"
create_extensions "airflow"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "airflow" <<-EOSQL
    -- Airflow uses its own migrations; we just ensure the role has full access.
    GRANT ALL PRIVILEGES ON ALL TABLES    IN SCHEMA public TO $POSTGRES_USER;
    GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $POSTGRES_USER;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
        GRANT ALL ON TABLES TO $POSTGRES_USER;
EOSQL

echo ">>> airflow database ready."

# ── mlflow ───────────────────────────────────────────────────
create_database "mlflow"
create_extensions "mlflow"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "mlflow" <<-EOSQL
    GRANT ALL PRIVILEGES ON ALL TABLES    IN SCHEMA public TO $POSTGRES_USER;
    GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $POSTGRES_USER;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
        GRANT ALL ON TABLES TO $POSTGRES_USER;
EOSQL

echo ">>> mlflow database ready."

echo "============================================"
echo "All databases initialised successfully:"
for db in "${DATABASES[@]}"; do
    echo "  ✓ $db"
done
echo "============================================"
