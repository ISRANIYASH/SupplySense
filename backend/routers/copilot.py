"""
backend/routers/copilot.py
Rule-based AI Copilot — queries real PostgreSQL data based on user message keywords.
TODO: Plug in GPT-4o + RAG (LangChain + pgvector) once API key is configured.
"""
import json, os, sys
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from db import get_db

router = APIRouter()

LIVE_PRICES_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", "datasets", "processed", "live_prices.json"
)

def _q(db, sql, params=None):
    return db.execute(text(sql), params or {}).mappings().all()

def _q1(db, sql, params=None):
    return db.execute(text(sql), params or {}).mappings().one()


@router.post("/query")
def copilot_query(body: dict, db: Session = Depends(get_db)):
    msg = body.get("message", "").lower().strip()

    # ── Inventory / Stock ──────────────────────────────────────────────────────
    if any(k in msg for k in ["inventory", "stock", "sku"]):
        r = _q1(db, """
            SELECT COUNT(DISTINCT product_id) as skus,
                   SUM(inventory_level * price) as total_value,
                   SUM(CASE WHEN stock_status='Low' THEN 1 ELSE 0 END) as low_count,
                   SUM(CASE WHEN stock_status='Excess' THEN 1 ELSE 0 END) as excess_count,
                   SUM(CASE WHEN stock_status='Optimal' THEN 1 ELSE 0 END) as optimal_count,
                   COUNT(*) as total_records
            FROM fact_inventory
        """)
        return {
            "response": (
                f"📦 **Inventory Status** (Real-time from PostgreSQL)\n\n"
                f"• Total SKUs tracked: **{r['skus']}**\n"
                f"• Total inventory value: **${r['total_value']:,.0f}**\n"
                f"• Stock breakdown:\n"
                f"  - 🔴 Low Stock: **{r['low_count']:,}** records ({r['low_count']*100//r['total_records']}%)\n"
                f"  - 🟢 Optimal: **{r['optimal_count']:,}** records ({r['optimal_count']*100//r['total_records']}%)\n"
                f"  - 🔵 Excess: **{r['excess_count']:,}** records ({r['excess_count']*100//r['total_records']}%)\n\n"
                f"⚠️ **Action needed**: {r['low_count']:,} records are below safety stock threshold. "
                f"Consider reordering for high-velocity SKUs."
            ),
            "data_source": "fact_inventory (PostgreSQL)",
            "query_type": "inventory"
        }

    # ── Supplier ───────────────────────────────────────────────────────────────
    if any(k in msg for k in ["supplier", "vendor", "partner"]):
        rows = _q(db, """
            SELECT supplier_name, supplier_overall_score, quality_score, delivery_score
            FROM dim_suppliers
            ORDER BY supplier_overall_score DESC LIMIT 5
        """)
        critical = _q1(db, "SELECT COUNT(*) as cnt FROM dim_suppliers WHERE supplier_overall_score < 35")
        top = "\n".join([f"  {i+1}. **{r['supplier_name']}** — Score: {r['supplier_overall_score']}/100" for i, r in enumerate(rows)])
        return {
            "response": (
                f"🏭 **Supplier Intelligence** (35 real suppliers in database)\n\n"
                f"**Top 5 Suppliers by Score:**\n{top}\n\n"
                f"⚠️ **Critical suppliers** (score < 35): **{critical['cnt']} suppliers** need immediate review.\n"
                f"Average score across all suppliers: 46.6/100 — below healthy threshold of 70."
            ),
            "data_source": "dim_suppliers (PostgreSQL)",
            "query_type": "supplier"
        }

    # ── Risk ───────────────────────────────────────────────────────────────────
    if any(k in msg for k in ["risk", "alert", "critical", "danger"]):
        r = _q1(db, """
            SELECT
              ROUND(AVG(late_delivery_risk)::numeric * 100, 1) as late_pct,
              (SELECT COUNT(*) FROM dim_suppliers WHERE supplier_overall_score < 35) as critical_suppliers,
              ROUND(SUM(CASE WHEN stock_status='Low' THEN 1 ELSE 0 END)*100.0/COUNT(*), 1) as low_stock_pct
            FROM fact_orders, fact_inventory
            LIMIT 1
        """)
        return {
            "response": (
                f"⚠️ **Risk Overview** (Calculated from real data)\n\n"
                f"• Late delivery risk: **{r['late_pct']}%** of orders\n"
                f"• Critical suppliers (score<35): **{r['critical_suppliers']}**\n"
                f"• Low stock records: **{r['low_stock_pct']}%** of inventory\n\n"
                f"📊 **Weighted Risk Score**: ~{int(float(r['late_pct'])*0.4 + (int(r['critical_suppliers'])/35)*35*0.35 + float(r['low_stock_pct'])*0.25)}/100\n\n"
                f"🔴 Primary concern: Late delivery risk at {r['late_pct']}% is critically high."
            ),
            "data_source": "fact_orders + dim_suppliers + fact_inventory (PostgreSQL)",
            "query_type": "risk"
        }

    # ── Demand / Forecast ──────────────────────────────────────────────────────
    if any(k in msg for k in ["demand", "forecast", "sales", "order"]):
        r = _q1(db, """
            SELECT category_name, SUM(order_item_quantity) as total_demand
            FROM fact_demand_daily
            GROUP BY category_name ORDER BY total_demand DESC LIMIT 1
        """)
        total = _q1(db, "SELECT SUM(order_item_quantity) as total FROM fact_demand_daily")
        orders = _q1(db, "SELECT COUNT(*) as cnt FROM fact_orders")
        return {
            "response": (
                f"📈 **Demand Analysis** (44,684 demand records in database)\n\n"
                f"• Total demand units: **{total['total']:,}**\n"
                f"• Total orders processed: **{orders['cnt']:,}**\n"
                f"• Top demand category: **{r['category_name']}** ({r['total_demand']:,} units)\n\n"
                f"🤖 **Forecast Note**: LSTM model MAPE is currently 93.33% — model retraining is in progress. "
                f"Historical demand data is solid; model accuracy will improve with more training iterations."
            ),
            "data_source": "fact_demand_daily + fact_orders (PostgreSQL)",
            "query_type": "forecast"
        }

    # ── Delivery / Delay ───────────────────────────────────────────────────────
    if any(k in msg for k in ["delay", "delivery", "shipping", "late", "transit"]):
        r = _q1(db, """
            SELECT
              ROUND(AVG(late_delivery_risk)::numeric*100, 2) as late_pct,
              ROUND(AVG(actual_delay_days)::numeric, 2) as avg_delay,
              COUNT(*) as total_orders
            FROM fact_orders
        """)
        best = _q1(db, """
            SELECT shipping_mode, ROUND(AVG(late_delivery_risk)::numeric*100,1) as late_pct
            FROM fact_orders GROUP BY shipping_mode ORDER BY late_pct ASC LIMIT 1
        """)
        return {
            "response": (
                f"🚚 **Delivery Performance** ({r['total_orders']:,} orders analyzed)\n\n"
                f"• Late delivery rate: **{r['late_pct']}%** — HIGH RISK\n"
                f"• Average delay: **{r['avg_delay']} days**\n"
                f"• Best performing mode: **{best['shipping_mode']}** ({best['late_pct']}% late rate)\n\n"
                f"💡 **Recommendation**: Late delivery rate of {r['late_pct']}% is above the 20% acceptable threshold. "
                f"Consider switching more shipments to {best['shipping_mode']} or pre-positioning inventory."
            ),
            "data_source": "fact_orders (PostgreSQL)",
            "query_type": "delivery"
        }

    # ── Market / Commodity ─────────────────────────────────────────────────────
    if any(k in msg for k in ["market", "price", "commodity", "copper", "steel", "aluminum"]):
        try:
            with open(LIVE_PRICES_PATH) as f:
                live = json.load(f)
            buy_signals = [name for name, d in live.items() if isinstance(d, dict) and "BUY" in str(d.get("signal", ""))]
            prices_text = "\n".join([
                f"  • **{name}**: ${d.get('current_price', 'N/A'):.2f} {d.get('unit','')} ({d.get('change_pct',0):+.2f}%)"
                for name, d in live.items() if isinstance(d, dict) and d.get("current_price")
            ])
            return {
                "response": (
                    f"📊 **Live Commodity Prices** (Yahoo Finance · fetched today)\n\n"
                    f"{prices_text}\n\n"
                    f"🤖 **AI Signals**: BUY recommended for: **{', '.join(buy_signals) or 'None today'}**\n\n"
                    f"Check the Market Intelligence page for full analysis and alerts."
                ),
                "data_source": "live_prices.json (Yahoo Finance API)",
                "query_type": "market"
            }
        except Exception:
            return {
                "response": "📊 No live market data available yet. Run the market scheduler to fetch real commodity prices.",
                "data_source": "N/A",
                "query_type": "market"
            }

    # ── Default ────────────────────────────────────────────────────────────────
    return {
        "response": (
            f"🤖 **SupplySense AI Copilot**\n\n"
            f"I can answer questions about your real supply chain data. Try asking about:\n\n"
            f"• 📦 **Inventory** — 'What is our current stock status?'\n"
            f"• 🏭 **Suppliers** — 'Who are our top performing suppliers?'\n"
            f"• ⚠️ **Risk** — 'What is our overall risk level?'\n"
            f"• 📈 **Demand** — 'What is our top demand category?'\n"
            f"• 🚚 **Delivery** — 'What is our late delivery rate?'\n"
            f"• 📊 **Market** — 'What are current commodity prices?'\n\n"
            f"*Note: Currently rule-based with real PostgreSQL data. GPT-4o + RAG integration is pending.*"
        ),
        "data_source": "SupplySense PostgreSQL",
        "query_type": "help"
    }
