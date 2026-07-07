"""
scripts/market_scheduler.py
One-time test run + APScheduler for recurring market checks.
"""

import sys
import os
import logging

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from commodity_tracker import PriceFetcher
from price_analyst import PriceAnalyst
from email_alerter import EmailAlerter

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger(__name__)


def run_price_check(mock_email: bool = True):
    """Fetch prices, analyze, send individual alerts for triggered signals."""
    print("\n" + "=" * 60)
    print("  SupplySense Market Price Check")
    print("=" * 60)

    prices   = PriceFetcher().fetch_all_commodities()
    analyses = PriceAnalyst().analyze_all(prices)
    alerter  = EmailAlerter(mock=mock_email)

    triggered = [a for a in analyses if a.get("alert_required")]

    print("\n" + "-" * 60)
    print("  COMMODITY ANALYSIS RESULTS")
    print("-" * 60)
    for a in analyses:
        signal = a.get("signal", "N/A")
        price  = a.get("current_price", "N/A")
        unit   = a.get("price_unit", "")
        chg    = a.get("change_pct_today", 0) or 0
        pct    = a.get("percentile_rank", "N/A")
        flag   = " <<< ALERT" if a.get("alert_required") else ""
        print(
            f"  {a['commodity']:25s} | {signal:12s} | "
            f"Price={price} {unit:12s} | "
            f"Chg={chg:+.2f}% | "
            f"Pct={pct}%{flag}"
        )

    print("-" * 60)
    print(f"  Alerts triggered: {len(triggered)} / {len(analyses)}")
    print("-" * 60)

    # Send individual alerts
    for a in triggered:
        alerter.send_alert(a)

    # Also send daily summary if any alerts
    alerter.send_daily_summary(analyses)

    return analyses


def send_daily_summary(mock_email: bool = True):
    prices   = PriceFetcher().fetch_all_commodities()
    analyses = PriceAnalyst().analyze_all(prices)
    EmailAlerter(mock=mock_email).send_daily_summary(analyses)


if __name__ == "__main__":
    logger.info("Running one-time startup price check (REAL email mode)...")
    run_price_check(mock_email=False)

    # ---- Scheduler (uncomment to enable recurring checks) ----
    # from apscheduler.schedulers.blocking import BlockingScheduler
    # scheduler = BlockingScheduler()
    #
    # @scheduler.scheduled_job('cron',
    #     day_of_week='mon-fri', hour='9-17', minute='*/15')
    # def _check():
    #     run_price_check(mock_email=False)
    #
    # @scheduler.scheduled_job('cron',
    #     day_of_week='mon-fri', hour=18, minute=0)
    # def _summary():
    #     send_daily_summary(mock_email=False)
    #
    # logger.info("SupplySense Market Scheduler running...")
    # scheduler.start()

    logger.info("Test run complete. Scheduler NOT started.")
