"""
scripts/email_alerter.py
HTML email alert system for SupplySense commodity signals.
Supports MOCK mode (prints to terminal) and LIVE mode (real SMTP send).
"""

import logging
import os
import smtplib
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger(__name__)

DASHBOARD_URL = "http://localhost:3000/market"


def _signal_color(signal: str) -> str:
    return {
        "STRONG BUY": "#DC2626",
        "BUY":        "#EA580C",
        "WAIT":       "#D97706",
        "HOLD":       "#16A34A",
        "REDUCE":     "#7C3AED",
    }.get(signal, "#64748B")


def _percentile_bar_html(pct: float) -> str:
    fill_color = "#DC2626" if pct < 10 else "#EA580C" if pct < 25 else \
                 "#D97706" if pct < 65 else "#16A34A" if pct < 90 else "#7C3AED"
    return f"""
    <div style="background:#1E2D45;border-radius:6px;height:12px;width:100%;margin:8px 0;">
      <div style="background:{fill_color};border-radius:6px;height:12px;width:{pct:.1f}%;"></div>
    </div>
    <p style="color:#94A3B8;font-size:12px;margin:0;">
      Price is at <strong style="color:#F1F5F9;">{pct:.1f}%</strong>
      of its 1-year range &nbsp;(0% = 1-year low &middot; 100% = 1-year high)
    </p>
    """


class EmailAlerter:

    def __init__(self, mock: bool = True):
        self.mock       = mock
        self.sender     = os.getenv("EMAIL_SENDER",    "your_gmail@gmail.com")
        self.password   = os.getenv("EMAIL_PASSWORD",  "")
        self.recipient  = os.getenv("EMAIL_RECIPIENT", "recipient@gmail.com")
        self.smtp_host  = os.getenv("EMAIL_SMTP_HOST", "smtp.gmail.com")
        self.smtp_port  = int(os.getenv("EMAIL_SMTP_PORT", 587))

    def _build_alert_html(self, a: dict) -> str:
        signal    = a["signal"]
        commodity = a["commodity"]
        color     = _signal_color(signal)
        pct       = a.get("percentile_rank", 50) or 50
        savings   = a.get("potential_savings_pct")
        categories = ", ".join(a.get("affected_inventory_categories", []))
        change    = a.get("change_pct_today", 0) or 0
        current   = a.get("current_price", "N/A")
        low_1y    = a.get("1y_low", "N/A")
        high_1y   = a.get("1y_high", "N/A")
        unit      = a.get("price_unit", "USD")
        reasoning = a.get("reasoning", "")

        savings_block = ""
        if savings and savings > 0:
            savings_block = f"""
            <tr>
              <td style="color:#94A3B8;padding:6px 0;">Potential Savings vs 1Y Avg</td>
              <td style="color:#00D4AA;font-weight:bold;">{savings:.2f}%</td>
            </tr>"""

        return f"""<!DOCTYPE html>
<html>
<body style="background:#0A0F1E;font-family:Inter,Arial,sans-serif;margin:0;padding:32px;">
  <div style="max-width:600px;margin:auto;background:#111827;border-radius:16px;
              border:1px solid #1E2D45;overflow:hidden;">
    <div style="background:{color};padding:28px 32px;">
      <p style="color:rgba(255,255,255,0.8);margin:0 0 4px;font-size:12px;
                text-transform:uppercase;letter-spacing:2px;">SupplySense Market Alert</p>
      <h1 style="color:white;margin:0;font-size:28px;">{signal}</h1>
      <h2 style="color:rgba(255,255,255,0.9);margin:4px 0 0;font-size:18px;
                 font-weight:400;">{commodity}</h2>
    </div>
    <div style="padding:28px 32px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="color:#94A3B8;padding:6px 0;">Current Price</td>
          <td style="color:#F1F5F9;font-weight:bold;font-size:18px;">{current} {unit}</td>
        </tr>
        <tr>
          <td style="color:#94A3B8;padding:6px 0;">Today's Change</td>
          <td style="color:{'#EF4444' if change < 0 else '#22C55E'};font-weight:bold;">
            {change:+.2f}%
          </td>
        </tr>
        <tr>
          <td style="color:#94A3B8;padding:6px 0;">1-Year Low</td>
          <td style="color:#F1F5F9;">{low_1y} {unit}</td>
        </tr>
        <tr>
          <td style="color:#94A3B8;padding:6px 0;">1-Year High</td>
          <td style="color:#F1F5F9;">{high_1y} {unit}</td>
        </tr>
        {savings_block}
      </table>
      <div style="margin:20px 0;">
        <p style="color:#94A3B8;font-size:13px;margin:0 0 4px;">Price Percentile Rank</p>
        {_percentile_bar_html(pct)}
      </div>
      <div style="background:#1C2537;border-radius:10px;padding:18px;margin:20px 0;
                  border-left:4px solid {color};">
        <p style="color:#94A3B8;margin:0 0 6px;font-size:12px;
                  text-transform:uppercase;letter-spacing:1px;">AI Reasoning</p>
        <p style="color:#F1F5F9;margin:0;line-height:1.6;">{reasoning}</p>
      </div>
      <div style="margin:16px 0;">
        <p style="color:#94A3B8;font-size:13px;margin:0 0 8px;">
          Affected Inventory Categories:
        </p>
        <p style="color:#F1F5F9;margin:0;">{categories}</p>
      </div>
      <div style="text-align:center;margin:32px 0 8px;">
        <a href="{DASHBOARD_URL}"
           style="background:{color};color:white;padding:14px 32px;
                  border-radius:8px;text-decoration:none;font-weight:600;
                  font-size:15px;display:inline-block;">
          View in SupplySense Dashboard
        </a>
      </div>
    </div>
    <div style="padding:16px 32px;border-top:1px solid #1E2D45;
                text-align:center;color:#64748B;font-size:12px;">
      SupplySense AI Supply Chain OS &middot;
      Generated {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}
    </div>
  </div>
</body>
</html>"""

    def send_alert(self, a: dict):
        if not a.get("alert_required"):
            return

        subject = f"SupplySense Alert: {a['signal']} on {a['commodity']}"
        html    = self._build_alert_html(a)

        if self.mock:
            print("\n" + "=" * 70)
            print(f"[MOCK EMAIL] Subject: {subject}")
            print(f"  To:       {self.recipient}")
            print(f"  Signal:   {a['signal']}")
            print(f"  Price:    {a.get('current_price')} {a.get('price_unit')}")
            print(f"  Change:   {(a.get('change_pct_today') or 0):+.2f}%")
            pct = a.get("percentile_rank") or 0
            print(f"  Pct Rank: {pct:.1f}%")
            print(f"  Reason:   {a['reasoning'][:110]}...")
            print(f"  [HTML body: {len(html)} chars -- would send via SMTP]")
            print("=" * 70)
        else:
            try:
                msg = MIMEMultipart("alternative")
                msg["Subject"] = subject
                msg["From"]    = self.sender
                msg["To"]      = self.recipient
                msg.attach(MIMEText(html, "html"))

                with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                    server.starttls()
                    server.login(self.sender, self.password)
                    server.sendmail(self.sender, self.recipient, msg.as_string())

                logger.info(
                    f"Email sent to {self.recipient} "
                    f"for {a['commodity']} at {datetime.utcnow().isoformat()}"
                )
            except Exception as exc:
                logger.error(f"Email send FAILED: {exc}")

    def send_daily_summary(self, analyses: list):
        if not any(a.get("alert_required") for a in analyses):
            logger.info("No alerts today -- skipping daily summary email.")
            return

        rows = ""
        for a in analyses:
            sig   = a.get("signal", "N/A")
            color = _signal_color(sig)
            chg   = a.get("change_pct_today", 0) or 0
            rows += f"""
            <tr>
              <td style="padding:10px 12px;color:#F1F5F9;">{a['commodity']}</td>
              <td><span style="background:{color};color:white;padding:3px 10px;
                  border-radius:4px;font-size:12px;font-weight:600;">{sig}</span></td>
              <td style="color:#F1F5F9;">{a.get('current_price','N/A')} {a.get('price_unit','')}</td>
              <td style="color:{'#EF4444' if chg < 0 else '#22C55E'};">{chg:+.2f}%</td>
              <td style="color:#94A3B8;font-size:12px;">{a.get('reasoning','')[:60]}...</td>
            </tr>"""

        html = f"""<!DOCTYPE html>
<html>
<body style="background:#0A0F1E;font-family:Inter,Arial,sans-serif;margin:0;padding:32px;">
  <div style="max-width:700px;margin:auto;background:#111827;border-radius:16px;
              border:1px solid #1E2D45;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#3B8EE8,#00D4AA);padding:24px 32px;">
      <h1 style="color:white;margin:0;font-size:22px;">
        SupplySense Daily Market Summary
      </h1>
      <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px;">
        {datetime.utcnow().strftime('%A, %B %d %Y at %H:%M UTC')}
      </p>
    </div>
    <div style="padding:28px 32px;">
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="border-bottom:1px solid #1E2D45;">
            <th style="color:#64748B;padding:8px 12px;text-align:left;font-size:12px;">COMMODITY</th>
            <th style="color:#64748B;padding:8px 12px;text-align:left;font-size:12px;">SIGNAL</th>
            <th style="color:#64748B;padding:8px 12px;text-align:left;font-size:12px;">PRICE</th>
            <th style="color:#64748B;padding:8px 12px;text-align:left;font-size:12px;">CHANGE</th>
            <th style="color:#64748B;padding:8px 12px;text-align:left;font-size:12px;">REASONING</th>
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
      <div style="text-align:center;margin:28px 0 8px;">
        <a href="{DASHBOARD_URL}"
           style="background:#3B8EE8;color:white;padding:14px 32px;
                  border-radius:8px;text-decoration:none;font-weight:600;">
          Open Dashboard
        </a>
      </div>
    </div>
  </div>
</body>
</html>"""

        subject = (f"SupplySense Daily Market Summary -- "
                   f"{datetime.utcnow().strftime('%Y-%m-%d')}")
        if self.mock:
            print("\n" + "=" * 70)
            print(f"[MOCK DAILY SUMMARY] Subject: {subject}")
            print(f"  To: {self.recipient}")
            print(f"  Commodities: {len(analyses)}")
            print(f"  Alerts triggered: {sum(1 for a in analyses if a.get('alert_required'))}")
            print(f"  [HTML body: {len(html)} chars -- would send via SMTP]")
            print("=" * 70)
        else:
            try:
                msg = MIMEMultipart("alternative")
                msg["Subject"] = subject
                msg["From"]    = self.sender
                msg["To"]      = self.recipient
                msg.attach(MIMEText(html, "html"))
                with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                    server.starttls()
                    server.login(self.sender, self.password)
                    server.sendmail(self.sender, self.recipient, msg.as_string())
                logger.info(f"Daily summary sent to {self.recipient}")
            except Exception as exc:
                logger.error(f"Daily summary FAILED: {exc}")
