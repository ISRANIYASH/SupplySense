"""
scripts/commodity_tracker.py
Real-time commodity price fetcher using the Yahoo Finance v8 JSON API
via the `requests` library (no curl_cffi / SSL issues on Windows).
"""

import json
import os
import logging
import ssl
import certifi
from datetime import datetime, date
from pathlib import Path

import requests
import pandas as pd
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Commodity Map
# ---------------------------------------------------------------------------
COMMODITY_MAP = {
    "Copper": {
        "ticker": "HG=F",
        "ticker_alt": "CPER",       # Copper ETF backup
        "unit": "USD/lb",
        "inventory_categories": ["Electronics", "Wiring", "Cables"]
    },
    "Steel": {
        "ticker": "SLX",
        "ticker_alt": "X",
        "unit": "USD",
        "inventory_categories": ["Hardware", "Construction",
                                   "Outdoor", "Indoor/Outdoor Games"]
    },
    "Aluminum": {
        "ticker": "ALI=F",
        "ticker_alt": "AA",
        "unit": "USD/tonne",
        "inventory_categories": ["Sports", "Outdoors"]
    },
    "Crude Oil / Diesel": {
        "ticker": "CL=F",
        "ticker_alt": "USO",
        "unit": "USD/barrel",
        "inventory_categories": ["Logistics", "Transportation"]
    },
    "Gold": {
        "ticker": "GC=F",
        "ticker_alt": "GLD",
        "unit": "USD/oz",
        "inventory_categories": ["Jewelry", "Accessories"]
    },
    "Cotton": {
        "ticker": "CT=F",
        "ticker_alt": "BAL",
        "unit": "USD/lb",
        "inventory_categories": [
            "Apparel", "Women's Apparel", "Men's Apparel",
            "Clothing", "Women's Clothing", "Men's Clothing",
            "Footwear", "Men's Footwear", "Cleats",
            "Kids", "Women's Footwear"
        ]
    },
    "Rubber": {
        "ticker": "RUBR.SI",
        "ticker_alt": "NTR",        # Nutrien as agricultural proxy
        "unit": "USD",
        "inventory_categories": ["Shoes", "Athletic Wear",
                                   "Fan Shop", "Fitness"]
    }
}

# Yahoo Finance v8 API endpoint (no auth required)
YF_QUOTE_URL    = "https://query1.finance.yahoo.com/v8/finance/chart/{ticker}"
YF_QUOTE_URL_V2 = "https://query2.finance.yahoo.com/v8/finance/chart/{ticker}"

SESSION_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json",
}


def _get_engine():
    user = os.getenv("POSTGRES_USER", "supplysense_admin")
    pwd  = os.getenv("POSTGRES_PASSWORD", "secure_supplysense_pwd_2026")
    host = os.getenv("POSTGRES_HOST", "localhost")
    port = os.getenv("POSTGRES_PORT", "5432")
    db   = os.getenv("POSTGRES_DB", "supplysense")
    return create_engine(f"postgresql://{user}:{pwd}@{host}:{port}/{db}")


def _yf_fetch(ticker: str, period: str = "1y", interval: str = "1d") -> dict | None:
    """
    Fetch Yahoo Finance data via direct v8 JSON API using requests.
    Falls back to query2 mirror if query1 fails.
    Returns raw JSON result dict or None on failure.
    """
    params = {
        "period1": 0,
        "period2": 9999999999,
        "range":   period,
        "interval": interval,
        "includePrePost": False,
        "events": "div,splits",
    }
    for base in [YF_QUOTE_URL, YF_QUOTE_URL_V2]:
        url = base.format(ticker=ticker)
        try:
            resp = requests.get(
                url,
                headers=SESSION_HEADERS,
                params=params,
                timeout=15,
                verify=certifi.where(),
            )
            if resp.status_code == 200:
                data = resp.json()
                result = data.get("chart", {}).get("result")
                if result:
                    return result[0]
            else:
                logger.warning(f"  HTTP {resp.status_code} for {ticker} on {base}")
        except requests.exceptions.SSLError as e:
            logger.warning(f"  SSL error for {ticker}: {e}. Retrying without verify...")
            try:
                resp = requests.get(
                    url, headers=SESSION_HEADERS, params=params,
                    timeout=15, verify=False
                )
                if resp.status_code == 200:
                    data = resp.json()
                    result = data.get("chart", {}).get("result")
                    if result:
                        logger.info(f"  Fetched {ticker} (SSL verify=False)")
                        return result[0]
            except Exception as inner:
                logger.warning(f"  Fallback also failed for {ticker}: {inner}")
        except Exception as exc:
            logger.warning(f"  Request error for {ticker}: {exc}")
    return None


class PriceFetcher:

    def _extract_closes(self, raw: dict) -> pd.Series | None:
        """Extract closing prices from Yahoo Finance v8 JSON result."""
        try:
            timestamps = raw.get("timestamp", [])
            indicators = raw.get("indicators", {})
            quote      = indicators.get("quote", [{}])[0]
            closes     = quote.get("close", [])
            if not timestamps or not closes:
                return None
            s = pd.Series(closes, index=pd.to_datetime(timestamps, unit="s"))
            return s.dropna()
        except Exception as exc:
            logger.warning(f"  Extract closes failed: {exc}")
            return None

    def fetch_current_price(self, ticker: str, ticker_alt: str = None):
        tickers_to_try = [t for t in [ticker, ticker_alt] if t]
        for t in tickers_to_try:
            raw = _yf_fetch(t, period="5d", interval="1d")
            if raw is None:
                logger.warning(f"  No data from API for {t}")
                continue

            closes = self._extract_closes(raw)
            if closes is None or len(closes) < 2:
                logger.warning(f"  Not enough close prices for {t}")
                continue

            try:
                current_price  = float(closes.iloc[-1])
                previous_close = float(closes.iloc[-2])
                change_pct     = ((current_price - previous_close)
                                  / previous_close) * 100

                # Try to get volume
                volume = None
                try:
                    vols   = raw["indicators"]["quote"][0].get("volume", [])
                    volume = float(vols[-1]) if vols else None
                except Exception:
                    pass

                logger.info(
                    f"  [{t}] price={current_price:.4f}  "
                    f"prev={previous_close:.4f}  chg={change_pct:+.2f}%"
                )
                return {
                    "ticker_used":   t,
                    "current_price": current_price,
                    "previous_close": previous_close,
                    "change_pct":    round(change_pct, 4),
                    "volume":        volume,
                }
            except Exception as exc:
                logger.warning(f"  Parsing failed for {t}: {exc}")

        logger.error(f"  All tickers failed: {tickers_to_try}")
        return None

    def fetch_historical(self, ticker: str, ticker_alt: str = None,
                         period: str = "1y"):
        tickers_to_try = [t for t in [ticker, ticker_alt] if t]
        for t in tickers_to_try:
            raw = _yf_fetch(t, period=period, interval="1d")
            if raw is None:
                continue

            closes = self._extract_closes(raw)
            if closes is None or len(closes) < 10:
                continue

            try:
                low    = float(closes.min())
                high   = float(closes.max())
                avg    = float(closes.mean())
                std    = float(closes.std())
                latest = float(closes.iloc[-1])

                pct_rank = (((latest - low) / (high - low)) * 100
                            if high != low else 50.0)

                return {
                    "ticker_used":     t,
                    "1y_low":          round(low,      4),
                    "1y_high":         round(high,     4),
                    "1y_avg":          round(avg,      4),
                    "1y_std_dev":      round(std,      4),
                    "percentile_rank": round(pct_rank, 2),
                    "data_points":     len(closes),
                }
            except Exception as exc:
                logger.warning(f"  Historical parse failed for {t}: {exc}")

        logger.error(f"  Historical fetch failed: {tickers_to_try}")
        return None

    def fetch_all_commodities(self) -> dict:
        logger.info("=== Starting commodity price fetch ===")
        results = {}

        for name, cfg in COMMODITY_MAP.items():
            logger.info(f"\n--- {name} ({cfg['ticker']}) ---")
            ticker     = cfg["ticker"]
            ticker_alt = cfg.get("ticker_alt")

            current  = self.fetch_current_price(ticker, ticker_alt)
            historic = self.fetch_historical(ticker, ticker_alt)

            entry = {
                "commodity":            name,
                "unit":                 cfg["unit"],
                "inventory_categories": cfg["inventory_categories"],
                "fetched_at":           datetime.utcnow().isoformat(),
            }
            if current:
                entry.update(current)
            if historic:
                entry.update(historic)

            results[name] = entry

        # Save JSON
        out_dir  = Path("datasets/processed")
        out_dir.mkdir(parents=True, exist_ok=True)
        out_path = out_dir / "live_prices.json"
        with open(out_path, "w") as f:
            json.dump(results, f, indent=2)
        logger.info(f"\nSaved live_prices.json -> {out_path.resolve()}")

        # Persist to Postgres
        self._save_to_postgres(results)

        return results

    def _save_to_postgres(self, results: dict):
        try:
            engine = _get_engine()
            today  = date.today()
            insert_sql = text("""
                INSERT INTO live_commodity_prices
                    (date, commodity_name, current_price, previous_close,
                     change_pct, percentile_rank, price_1y_low,
                     price_1y_high, price_1y_avg)
                VALUES
                    (:date, :commodity_name, :current_price,
                     :previous_close, :change_pct, :percentile_rank,
                     :price_1y_low, :price_1y_high, :price_1y_avg)
                ON CONFLICT (date, commodity_name) DO UPDATE SET
                    current_price    = EXCLUDED.current_price,
                    previous_close   = EXCLUDED.previous_close,
                    change_pct       = EXCLUDED.change_pct,
                    percentile_rank  = EXCLUDED.percentile_rank,
                    price_1y_low     = EXCLUDED.price_1y_low,
                    price_1y_high    = EXCLUDED.price_1y_high,
                    price_1y_avg     = EXCLUDED.price_1y_avg
            """)
            inserted = 0
            with engine.begin() as conn:
                for name, d in results.items():
                    if "current_price" not in d:
                        continue
                    conn.execute(insert_sql, {
                        "date":            today,
                        "commodity_name":  name,
                        "current_price":   d.get("current_price"),
                        "previous_close":  d.get("previous_close"),
                        "change_pct":      d.get("change_pct"),
                        "percentile_rank": d.get("percentile_rank"),
                        "price_1y_low":    d.get("1y_low"),
                        "price_1y_high":   d.get("1y_high"),
                        "price_1y_avg":    d.get("1y_avg"),
                    })
                    inserted += 1
            logger.info(f"Upserted {inserted} rows into live_commodity_prices")
        except Exception as exc:
            logger.warning(f"Postgres upsert skipped: {exc}")
