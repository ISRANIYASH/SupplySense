"""
scripts/load_to_postgres.py — High-performance, idempotent data ingestion into PostgreSQL.
Delegates to seed_production_data for streaming COPY and idempotency guarantees.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from scripts.seed_production_data import seed_database

if __name__ == "__main__":
    seed_database()
