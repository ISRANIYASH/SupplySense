"""
scripts/price_analyst.py
Deterministic AI analysis engine for commodity price signals.
"""

import json
import logging
import os
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger(__name__)

# Thresholds (can be overridden via .env)
STRONG_BUY_PERCENTILE = float(os.getenv("PRICE_STRONG_BUY_PERCENTILE", 10))
BUY_PERCENTILE        = float(os.getenv("PRICE_BUY_SIGNAL_PERCENTILE", 25))
HOLD_MAX_PERCENTILE   = 65.0
WAIT_PERCENTILE       = 65.0
REDUCE_PERCENTILE     = 90.0


def _get_engine():
    user = os.getenv("POSTGRES_USER", "supplysense_admin")
    pwd  = os.getenv("POSTGRES_PASSWORD", "secure_supplysense_pwd_2026")
    host = os.getenv("POSTGRES_HOST", "localhost")
    port = os.getenv("POSTGRES_PORT", "5432")
    db   = os.getenv("POSTGRES_DB", "supplysense")
    return create_engine(f"postgresql://{user}:{pwd}@{host}:{port}/{db}")


class PriceAnalyst:

    # ------------------------------------------------------------------
    def analyze(self, commodity_name: str, price_data: dict) -> dict:
        """
        Analyze a single commodity and return an action signal dict.
        All logic is deterministic — no LLM needed.
        """
        pct_rank   = price_data.get("percentile_rank")
        change_pct = price_data.get("change_pct", 0.0)
        current    = price_data.get("current_price")
        avg_price  = price_data.get("1y_avg")
        low_1y     = price_data.get("1y_low")
        high_1y    = price_data.get("1y_high")
        unit       = price_data.get("unit", "USD")
        categories = price_data.get("inventory_categories", [])

        # ---- Guard: no data ----
        if pct_rank is None or current is None:
            return {
                "commodity":                   commodity_name,
                "signal":                      "NO_DATA",
                "current_price":               None,
                "price_unit":                  unit,
                "change_pct_today":            None,
                "percentile_rank":             None,
                "1y_low":                      low_1y,
                "1y_high":                     high_1y,
                "reasoning":                   "Price data unavailable for this commodity.",
                "affected_inventory_categories": categories,
                "potential_savings_pct":        None,
                "alert_required":              False,
            }

        # ---- Signal determination ----
        if pct_rank < STRONG_BUY_PERCENTILE and change_pct < -3.0:
            signal   = "STRONG BUY"
            severity = "CRITICAL"
            reasoning = (
                f"{commodity_name} is trading at its {pct_rank:.1f}th percentile "
                f"of the past 1 year — near an annual low — AND dropped "
                f"{abs(change_pct):.2f}% today. "
                f"This is an exceptional buying opportunity. "
                f"Stock up now before prices recover."
            )
            alert_required = True

        elif pct_rank < BUY_PERCENTILE or change_pct < -1.5:
            signal   = "BUY"
            severity = "HIGH"
            if pct_rank < BUY_PERCENTILE:
                reasoning = (
                    f"{commodity_name} is in the bottom {pct_rank:.1f}th percentile "
                    f"of its 1-year price range. Prices are historically low. "
                    f"Consider building inventory now."
                )
            else:
                reasoning = (
                    f"{commodity_name} dropped {abs(change_pct):.2f}% today. "
                    f"A single-day dip of this size may present a short-term "
                    f"buying opportunity."
                )
            alert_required = True

        elif pct_rank > REDUCE_PERCENTILE:
            signal   = "REDUCE"
            severity = "MEDIUM"
            reasoning = (
                f"{commodity_name} is near its 1-year high (top {100-pct_rank:.1f}% "
                f"of range). Procurement costs are elevated. "
                f"Avoid new orders — reduce or defer purchases until prices normalise."
            )
            alert_required = True

        elif pct_rank > WAIT_PERCENTILE or change_pct > 2.0:
            signal   = "WAIT"
            severity = "MEDIUM"
            if change_pct > 2.0:
                reasoning = (
                    f"{commodity_name} is spiking today (+{change_pct:.2f}%). "
                    f"Wait for the price to stabilise before placing orders."
                )
            else:
                reasoning = (
                    f"{commodity_name} is in the upper range of its 1-year band "
                    f"(percentile {pct_rank:.1f}). Better value expected soon."
                )
            alert_required = False

        else:
            signal   = "HOLD"
            severity = "LOW"
            reasoning = (
                f"{commodity_name} is trading in its mid-range "
                f"(percentile {pct_rank:.1f} of 1-year). "
                f"No urgent action required — maintain current stock levels."
            )
            alert_required = False

        # ---- Potential savings ----
        savings_pct = None
        if avg_price and current and avg_price > 0:
            savings_pct = round(((avg_price - current) / avg_price) * 100, 2)

        return {
            "commodity":                   commodity_name,
            "signal":                      signal,
            "severity":                    severity,
            "current_price":               round(current, 4) if current else None,
            "price_unit":                  unit,
            "change_pct_today":            round(change_pct, 4),
            "percentile_rank":             round(pct_rank, 2),
            "1y_low":                      low_1y,
            "1y_high":                     high_1y,
            "reasoning":                   reasoning,
            "affected_inventory_categories": categories,
            "potential_savings_pct":        savings_pct,
            "alert_required":              alert_required,
            "analyzed_at":                 datetime.utcnow().isoformat(),
        }

    # ------------------------------------------------------------------
    def analyze_all(self, all_price_data: dict) -> list:
        """
        Run analyze() for every commodity, persist results, return list.
        """
        logger.info("\n=== Running AI Price Analysis ===")
        analyses = []

        for name, data in all_price_data.items():
            result = self.analyze(name, data)
            analyses.append(result)
            logger.info(
                f"  {name:25s} | signal={result['signal']:12s} "
                f"| pct_rank={result.get('percentile_rank', 'N/A')}"
            )

        # ---- Persist analysis JSON ----
        out_dir = Path("datasets/processed")
        out_dir.mkdir(parents=True, exist_ok=True)
        out_path = out_dir / "market_analysis.json"
        with open(out_path, "w") as f:
            json.dump(analyses, f, indent=2)
        logger.info(f"Saved market_analysis.json -> {out_path.resolve()}")

        # ---- Insert alerts into Postgres ----
        self._insert_alerts(analyses)

        return analyses

    # ------------------------------------------------------------------
    def _insert_alerts(self, analyses: list):
        """Insert BUY / REDUCE alerts into the alerts table."""
        try:
            engine = _get_engine()
            insert_sql = text("""
                INSERT INTO alerts
                    (type, severity, title, description, created_at,
                     read, resolved, category)
                VALUES
                    (:type, :severity, :title, :description, :created_at,
                     false, false, :category)
            """)
            inserted = 0
            with engine.begin() as conn:
                for a in analyses:
                    if not a.get("alert_required"):
                        continue
                    signal = a["signal"]
                    commodity = a["commodity"]
                    conn.execute(insert_sql, {
                        "type":        "MARKET_PRICE",
                        "severity":    a.get("severity", "MEDIUM"),
                        "title":       f"{signal}: {commodity}",
                        "description": a["reasoning"],
                        "created_at":  datetime.utcnow(),
                        "category":    "Price",
                    })
                    inserted += 1
            logger.info(f"Inserted {inserted} alert(s) into PostgreSQL alerts table")
        except Exception as exc:
            logger.warning(f"Alert insert skipped: {exc}")
