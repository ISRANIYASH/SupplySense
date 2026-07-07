"""
SupplySense — Inventory Rebalancing Pipeline DAG
================================================
Optimises inventory levels across warehouses and generates
replenishment orders to prevent stockouts and reduce holding costs.

Runs daily at 2:00 AM UTC.

Tasks:
1. calculate_reorder_needs    — Identify SKUs below reorder point
2. optimize_safety_stock      — Compute optimal safety stock levels via simulation
3. generate_transfer_orders   — Create inter-warehouse transfer recommendations
4. create_replenishment_pos   — Generate purchase orders for external procurement
5. validate_budget_constraints — Check PO amounts against budget limits
6. approve_auto_orders        — Auto-approve POs below threshold
7. publish_to_agents          — Push rebalancing plan to AI agents for action

Schedule: Daily at 02:00 UTC (0 2 * * *)
Owner:    inventory-team
"""

from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timedelta
from typing import Any

import pendulum
from airflow import DAG
from airflow.operators.python import PythonOperator, BranchPythonOperator
from airflow.operators.empty import EmptyOperator
from airflow.providers.postgres.hooks.postgres import PostgresHook
from airflow.utils.trigger_rule import TriggerRule

log = logging.getLogger(__name__)

DEFAULT_ARGS: dict[str, Any] = {
    "owner":            "inventory-team",
    "depends_on_past":  False,
    "email":            ["inventory-alerts@supplysense.io"],
    "email_on_failure": True,
    "email_on_retry":   False,
    "retries":          2,
    "retry_delay":      timedelta(minutes=3),
}

# ── Constants ─────────────────────────────────────────────────
AUTO_APPROVE_THRESHOLD_USD = 5_000
BUDGET_SAFETY_FACTOR       = 0.95  # Leave 5% budget buffer
SERVICE_LEVEL_TARGET       = 0.975  # 97.5% service level for safety stock
Z_SCORE_975                = 1.96


def calculate_reorder_needs(**context: Any) -> dict[str, Any]:
    """
    Identify all SKUs that have fallen below their reorder point.
    Computes:
    - Current stock levels per SKU per warehouse
    - Average daily demand (from forecast)
    - Lead time from primary supplier
    - Reorder point = avg_demand × lead_time + safety_stock
    """
    log.info("Calculating reorder needs...")

    execution_date: datetime = context["logical_date"]
    hook = PostgresHook(postgres_conn_id="supplysense_postgres")
    conn = hook.get_conn()
    cursor = conn.cursor()

    # Join inventory with forecasts and supplier lead times
    cursor.execute(
        """
        SELECT
            i.sku_id,
            p.sku          AS sku_code,
            p.name         AS product_name,
            p.category,
            p.unit_cost,
            i.warehouse_id,
            i.quantity_on_hand,
            i.quantity_in_transit,
            i.reorder_point,
            i.safety_stock,
            COALESCE(f.predicted, 10)           AS daily_demand_forecast,
            COALESCE(s.lead_time_days, 14)      AS supplier_lead_time,
            s.id                                AS primary_supplier_id,
            s.name                              AS primary_supplier_name
        FROM analytics.inventory_positions i
        JOIN core.products p ON p.id = i.sku_id
        LEFT JOIN ml.forecasts f
            ON f.sku_id = i.sku_id
            AND f.date = CURRENT_DATE + 1
        LEFT JOIN core.supplier_sku_mapping sm
            ON sm.sku_id = i.sku_id AND sm.is_primary = TRUE
        LEFT JOIN core.suppliers s ON s.id = sm.supplier_id
        WHERE i.is_active = TRUE
          AND (i.quantity_on_hand + i.quantity_in_transit) < i.reorder_point
        ORDER BY (i.quantity_on_hand + i.quantity_in_transit - i.reorder_point) ASC
        """
    )
    reorder_items = cursor.fetchall()

    # Also get all inventory for safety stock optimization
    cursor.execute(
        """
        SELECT
            i.sku_id,
            i.warehouse_id,
            i.quantity_on_hand,
            i.reorder_point,
            i.safety_stock,
            i.max_stock_level,
            COALESCE(f.predicted, 10) AS daily_demand
        FROM analytics.inventory_positions i
        LEFT JOIN ml.forecasts f
            ON f.sku_id = i.sku_id AND f.date = CURRENT_DATE + 1
        WHERE i.is_active = TRUE
        """
    )
    all_inventory = cursor.fetchall()

    cursor.close()
    conn.close()

    reorder_list = []
    for row in reorder_items:
        (sku_id, sku_code, name, category, unit_cost, warehouse_id,
         qty_on_hand, qty_transit, reorder_pt, safety_stk,
         daily_demand, lead_time, supplier_id, supplier_name) = row

        effective_stock  = float(qty_on_hand or 0) + float(qty_transit or 0)
        shortfall        = float(reorder_pt or 0) - effective_stock
        days_of_stock    = effective_stock / max(float(daily_demand or 1), 1)
        order_qty        = max(
            shortfall + float(safety_stk or 0),
            float(daily_demand or 10) * float(lead_time or 14)
        )

        reorder_list.append({
            "sku_id":        str(sku_id),
            "sku_code":      sku_code,
            "product_name":  name,
            "category":      category,
            "unit_cost":     float(unit_cost or 0),
            "warehouse_id":  str(warehouse_id),
            "qty_on_hand":   float(qty_on_hand or 0),
            "qty_in_transit": float(qty_transit or 0),
            "effective_stock": effective_stock,
            "reorder_point": float(reorder_pt or 0),
            "shortfall":     round(shortfall, 2),
            "days_of_stock": round(days_of_stock, 1),
            "recommended_order_qty": round(order_qty, 0),
            "estimated_cost": round(order_qty * float(unit_cost or 0), 2),
            "supplier_id":   str(supplier_id) if supplier_id else None,
            "supplier_name": supplier_name,
            "lead_time_days": float(lead_time or 14),
            "urgency":       "critical" if days_of_stock < float(lead_time or 14) else "normal",
        })

    import boto3
    bucket = os.getenv("DATA_BUCKET", "supplysense-data-staging")
    s3_key = f"inventory/{execution_date.strftime('%Y/%m/%d')}/reorder_needs.json"
    boto3.client("s3").put_object(
        Bucket=bucket, Key=s3_key,
        Body=json.dumps({"reorder_items": reorder_list}),
        ContentType="application/json",
    )

    metadata = {
        "n_reorder_items": len(reorder_list),
        "n_critical":      sum(1 for i in reorder_list if i["urgency"] == "critical"),
        "total_est_cost":  sum(i["estimated_cost"] for i in reorder_list),
        "s3_uri":          f"s3://{bucket}/{s3_key}",
    }
    context["ti"].xcom_push(key="reorder_meta", value=metadata)
    log.info("Found %d SKUs below reorder point (%d critical), est. cost $%.0f",
             metadata["n_reorder_items"], metadata["n_critical"], metadata["total_est_cost"])
    return metadata


def optimize_safety_stock(**context: Any) -> dict[str, Any]:
    """
    Compute optimal safety stock levels for all SKUs using:
    - Service level target (97.5%)
    - Demand variability (σ_demand from historical data)
    - Lead time variability (σ_lead_time)
    - Safety stock = Z × √(LT × σ²_demand + D² × σ²_lt)
    """
    log.info("Optimizing safety stock levels...")

    import numpy as np
    import boto3

    ti = context["ti"]
    execution_date: datetime = context["logical_date"]
    hook = PostgresHook(postgres_conn_id="supplysense_postgres")
    conn = hook.get_conn()
    cursor = conn.cursor()

    # Fetch demand and lead time variability stats
    cursor.execute(
        """
        SELECT
            s.sku_id,
            s.warehouse_id,
            COALESCE(s.demand_std_30d, s.avg_demand_30d * 0.15)   AS sigma_demand,
            COALESCE(s.avg_demand_30d, 10)                         AS avg_demand,
            COALESCE(lt.lead_time_std, 2)                          AS sigma_lead_time,
            COALESCE(lt.lead_time_avg, 14)                         AS avg_lead_time,
            s.current_safety_stock
        FROM analytics.inventory_demand_stats s
        LEFT JOIN analytics.supplier_lead_time_stats lt
            ON lt.supplier_id = (
                SELECT supplier_id FROM core.supplier_sku_mapping
                WHERE sku_id = s.sku_id AND is_primary = TRUE
                LIMIT 1
            )
        """
    )
    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    optimizations = []
    for row in rows:
        sku_id, wh_id, sigma_d, avg_d, sigma_lt, avg_lt, cur_ss = row
        sigma_d   = float(sigma_d or 1)
        avg_d     = float(avg_d or 10)
        sigma_lt  = float(sigma_lt or 2)
        avg_lt    = float(avg_lt or 14)
        cur_ss    = float(cur_ss or 0)

        # Safety stock formula
        variance_component = avg_lt * sigma_d**2 + avg_d**2 * sigma_lt**2
        optimal_ss = Z_SCORE_975 * np.sqrt(variance_component)
        optimal_ss = round(max(0.0, optimal_ss), 2)

        change_pct = ((optimal_ss - cur_ss) / max(cur_ss, 1)) * 100

        optimizations.append({
            "sku_id":       str(sku_id),
            "warehouse_id": str(wh_id),
            "current_ss":   cur_ss,
            "optimal_ss":   optimal_ss,
            "change_pct":   round(change_pct, 1),
            "should_update": abs(change_pct) > 10,  # Only update if >10% change
        })

    # Update DB where changes are significant
    hook = PostgresHook(postgres_conn_id="supplysense_postgres")
    conn = hook.get_conn()
    cursor = conn.cursor()
    updates = [(o["optimal_ss"], o["sku_id"], o["warehouse_id"])
               for o in optimizations if o["should_update"]]
    if updates:
        cursor.executemany(
            """
            UPDATE analytics.inventory_positions
            SET safety_stock = %s, updated_at = NOW()
            WHERE sku_id = %s::uuid AND warehouse_id = %s::uuid
            """,
            updates,
        )
        conn.commit()
    cursor.close()
    conn.close()

    bucket = os.getenv("DATA_BUCKET", "supplysense-data-staging")
    s3_key = f"inventory/{execution_date.strftime('%Y/%m/%d')}/safety_stock.json"
    boto3.client("s3").put_object(
        Bucket=bucket, Key=s3_key,
        Body=json.dumps(optimizations), ContentType="application/json",
    )

    metadata = {
        "n_optimized":  len([o for o in optimizations if o["should_update"]]),
        "n_increased":  len([o for o in optimizations if o["change_pct"] > 10]),
        "n_decreased":  len([o for o in optimizations if o["change_pct"] < -10]),
        "s3_uri":       f"s3://{bucket}/{s3_key}",
    }
    ti.xcom_push(key="safety_stock_meta", value=metadata)
    log.info("Safety stock optimization: %d updates (%d↑ %d↓)",
             metadata["n_optimized"], metadata["n_increased"], metadata["n_decreased"])
    return metadata


def generate_transfer_orders(**context: Any) -> dict[str, Any]:
    """
    Identify opportunities to rebalance inventory between warehouses
    before placing external replenishment orders.
    Surplus warehouse → Deficit warehouse transfers.
    """
    log.info("Generating inter-warehouse transfer orders...")

    import boto3

    ti = context["ti"]
    execution_date: datetime = context["logical_date"]
    reorder_meta = ti.xcom_pull(key="reorder_meta", task_ids="calculate_reorder_needs")

    bucket = os.getenv("DATA_BUCKET", "supplysense-data-staging")
    obj = boto3.client("s3").get_object(
        Bucket=bucket,
        Key=reorder_meta["s3_uri"].split(bucket + "/")[1],
    )
    reorder_data = json.loads(obj["Body"].read())
    reorder_items = reorder_data["reorder_items"]

    # Find SKUs with shortfalls and check other warehouses for surplus
    hook = PostgresHook(postgres_conn_id="supplysense_postgres")
    conn = hook.get_conn()
    cursor = conn.cursor()

    transfer_orders = []
    for item in reorder_items:
        if item["shortfall"] <= 0:
            continue

        # Find other warehouses with surplus for this SKU
        cursor.execute(
            """
            SELECT
                i.warehouse_id,
                w.name          AS warehouse_name,
                w.location,
                i.quantity_on_hand - i.reorder_point - i.safety_stock AS transferable_qty
            FROM analytics.inventory_positions i
            JOIN analytics.warehouses w ON w.id = i.warehouse_id
            WHERE i.sku_id = %s::uuid
              AND i.warehouse_id != %s::uuid
              AND (i.quantity_on_hand - i.reorder_point - i.safety_stock) > 0
            ORDER BY (i.quantity_on_hand - i.reorder_point - i.safety_stock) DESC
            LIMIT 1
            """,
            (item["sku_id"], item["warehouse_id"]),
        )
        surplus = cursor.fetchone()

        if surplus:
            src_wh, src_name, src_loc, transferable = surplus
            transfer_qty = min(float(transferable), item["shortfall"])

            if transfer_qty >= 1:
                transfer_orders.append({
                    "sku_id":          item["sku_id"],
                    "sku_code":        item["sku_code"],
                    "src_warehouse_id":   str(src_wh),
                    "src_warehouse_name": src_name,
                    "dst_warehouse_id":   item["warehouse_id"],
                    "transfer_qty":    round(transfer_qty, 0),
                    "unit_cost":       item["unit_cost"],
                    "total_value":     round(transfer_qty * item["unit_cost"], 2),
                    "reduces_shortfall_by": round(transfer_qty, 0),
                    "status":          "pending",
                })

    cursor.close()
    conn.close()

    s3_key = f"inventory/{execution_date.strftime('%Y/%m/%d')}/transfers.json"
    boto3.client("s3").put_object(
        Bucket=bucket, Key=s3_key,
        Body=json.dumps(transfer_orders), ContentType="application/json",
    )

    metadata = {
        "n_transfers":    len(transfer_orders),
        "total_value":    sum(t["total_value"] for t in transfer_orders),
        "s3_uri":         f"s3://{bucket}/{s3_key}",
    }
    ti.xcom_push(key="transfer_meta", value=metadata)
    log.info("Generated %d transfer orders (value: $%.0f)",
             metadata["n_transfers"], metadata["total_value"])
    return metadata


def create_replenishment_pos(**context: Any) -> dict[str, Any]:
    """
    Generate purchase orders for SKUs that cannot be covered by transfers.
    Creates draft POs in the supplysense database.
    """
    log.info("Creating replenishment purchase orders...")

    import boto3

    ti = context["ti"]
    execution_date: datetime = context["logical_date"]
    reorder_meta   = ti.xcom_pull(key="reorder_meta",  task_ids="calculate_reorder_needs")
    transfer_meta  = ti.xcom_pull(key="transfer_meta", task_ids="generate_transfer_orders")

    bucket = os.getenv("DATA_BUCKET", "supplysense-data-staging")
    s3 = boto3.client("s3")

    # Load reorder items and transfers
    reorder_data = json.loads(
        s3.get_object(Bucket=bucket,
                      Key=reorder_meta["s3_uri"].split(bucket + "/")[1])["Body"].read()
    )
    transfers = json.loads(
        s3.get_object(Bucket=bucket,
                      Key=transfer_meta["s3_uri"].split(bucket + "/")[1])["Body"].read()
    )

    # Calculate remaining shortfall after transfers
    transfer_coverage: dict[str, float] = {}
    for t in transfers:
        key = f"{t['sku_id']}:{t['dst_warehouse_id']}"
        transfer_coverage[key] = transfer_coverage.get(key, 0) + t["transfer_qty"]

    pos = []
    hook = PostgresHook(postgres_conn_id="supplysense_postgres")
    conn = hook.get_conn()
    cursor = conn.cursor()

    for item in reorder_data["reorder_items"]:
        if not item.get("supplier_id"):
            log.warning("No supplier mapped for SKU %s, skipping PO", item["sku_code"])
            continue

        coverage_key = f"{item['sku_id']}:{item['warehouse_id']}"
        covered_by_transfer = transfer_coverage.get(coverage_key, 0)
        remaining_shortfall = max(0, item["shortfall"] - covered_by_transfer)

        if remaining_shortfall < 1:
            continue

        order_qty = max(
            remaining_shortfall,
            item["recommended_order_qty"] - covered_by_transfer,
        )

        # Insert draft PO to DB
        import uuid
        po_number = f"PO-{execution_date.strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"
        total_amount = round(order_qty * item["unit_cost"], 2)

        cursor.execute(
            """
            INSERT INTO core.purchase_orders
                (po_number, supplier_id, status, total_amount, currency, created_at, updated_at)
            VALUES (%s, %s::uuid, 'DRAFT', %s, 'USD', NOW(), NOW())
            RETURNING id
            """,
            (po_number, item["supplier_id"], total_amount),
        )
        po_id = str(cursor.fetchone()[0])

        pos.append({
            "po_id":        po_id,
            "po_number":    po_number,
            "sku_id":       item["sku_id"],
            "sku_code":     item["sku_code"],
            "supplier_id":  item["supplier_id"],
            "supplier_name": item["supplier_name"],
            "order_qty":    round(order_qty, 0),
            "unit_cost":    item["unit_cost"],
            "total_amount": total_amount,
            "urgency":      item["urgency"],
            "auto_approve": total_amount <= AUTO_APPROVE_THRESHOLD_USD,
        })

    conn.commit()
    cursor.close()
    conn.close()

    s3_key = f"inventory/{execution_date.strftime('%Y/%m/%d')}/purchase_orders.json"
    s3.put_object(Bucket=bucket, Key=s3_key,
                  Body=json.dumps(pos), ContentType="application/json")

    metadata = {
        "n_pos":          len(pos),
        "total_value":    sum(p["total_amount"] for p in pos),
        "n_auto_approve": sum(1 for p in pos if p["auto_approve"]),
        "s3_uri":         f"s3://{bucket}/{s3_key}",
    }
    ti.xcom_push(key="po_meta", value=metadata)
    log.info("Created %d draft POs (total $%.0f, %d auto-approvable)",
             metadata["n_pos"], metadata["total_value"], metadata["n_auto_approve"])
    return metadata


def validate_budget_constraints(**context: Any) -> str:
    """
    Branch: check if total PO value exceeds budget limits.
    Returns task_id to execute next.
    """
    ti = context["ti"]
    po_meta = ti.xcom_pull(key="po_meta", task_ids="create_replenishment_pos")

    monthly_budget = float(os.getenv("MONTHLY_PROCUREMENT_BUDGET_USD", "500000"))
    utilisation_pct = po_meta["total_value"] / (monthly_budget * BUDGET_SAFETY_FACTOR)

    log.info("PO total: $%.0f / budget $%.0f (%.1f%%)",
             po_meta["total_value"], monthly_budget, utilisation_pct * 100)

    ti.xcom_push(key="budget_utilisation", value=utilisation_pct)

    if utilisation_pct > 1.0:
        return "flag_budget_breach"
    return "approve_auto_orders"


def approve_auto_orders(**context: Any) -> None:
    """Auto-approve POs below the auto-approval threshold."""
    import boto3

    ti = context["ti"]
    po_meta = ti.xcom_pull(key="po_meta", task_ids="create_replenishment_pos")

    bucket = os.getenv("DATA_BUCKET", "supplysense-data-staging")
    pos = json.loads(
        boto3.client("s3").get_object(
            Bucket=bucket,
            Key=po_meta["s3_uri"].split(bucket + "/")[1],
        )["Body"].read()
    )

    auto_pos = [p for p in pos if p["auto_approve"]]
    if not auto_pos:
        log.info("No POs eligible for auto-approval")
        return

    hook = PostgresHook(postgres_conn_id="supplysense_postgres")
    conn = hook.get_conn()
    cursor = conn.cursor()

    cursor.executemany(
        """
        UPDATE core.purchase_orders
        SET status = 'APPROVED', updated_at = NOW()
        WHERE id = %s::uuid AND status = 'DRAFT'
        """,
        [(p["po_id"],) for p in auto_pos],
    )
    conn.commit()
    cursor.close()
    conn.close()

    log.info("Auto-approved %d POs (total $%.0f)",
             len(auto_pos), sum(p["total_amount"] for p in auto_pos))


def flag_budget_breach(**context: Any) -> None:
    """Flag budget breach and notify procurement team for manual review."""
    import requests

    ti = context["ti"]
    po_meta = ti.xcom_pull(key="po_meta", task_ids="create_replenishment_pos")
    utilisation = ti.xcom_pull(key="budget_utilisation", task_ids="validate_budget_constraints")

    api_url = os.getenv("SUPPLYSENSE_API_URL", "http://supplysense-api:8000")
    try:
        requests.post(
            f"{api_url}/internal/broadcast",
            json={
                "event": "budget_breach_alert",
                "data": {
                    "po_total":     po_meta["total_value"],
                    "utilisation":  utilisation,
                    "n_pos":        po_meta["n_pos"],
                    "action_required": True,
                },
            },
            headers={"X-Internal-Token": os.getenv("INTERNAL_API_TOKEN", "")},
            timeout=10,
        )
    except Exception as e:
        log.warning("Broadcast failed: %s", e)

    log.warning("BUDGET BREACH: PO total exceeds monthly budget by %.1f%%",
                (utilisation - 1) * 100)


def publish_to_agents(**context: Any) -> None:
    """
    Push the complete rebalancing plan to AI agents via Kafka
    for automated action and human-in-the-loop approval workflows.
    """
    import requests

    ti = context["ti"]
    execution_date: datetime = context["logical_date"]
    reorder_meta   = ti.xcom_pull(key="reorder_meta",  task_ids="calculate_reorder_needs")
    transfer_meta  = ti.xcom_pull(key="transfer_meta", task_ids="generate_transfer_orders")
    po_meta        = ti.xcom_pull(key="po_meta",       task_ids="create_replenishment_pos")
    ss_meta        = ti.xcom_pull(key="safety_stock_meta", task_ids="optimize_safety_stock")

    api_url = os.getenv("SUPPLYSENSE_API_URL", "http://supplysense-api:8000")

    plan_summary = {
        "plan_date":        execution_date.strftime("%Y-%m-%d"),
        "reorder_items":    reorder_meta["n_reorder_items"],
        "critical_items":   reorder_meta["n_critical"],
        "transfer_orders":  transfer_meta["n_transfers"],
        "transfer_value":   transfer_meta["total_value"],
        "purchase_orders":  po_meta["n_pos"],
        "po_value":         po_meta["total_value"],
        "auto_approved_pos": po_meta["n_auto_approve"],
        "safety_stock_updates": ss_meta["n_optimized"],
    }

    try:
        resp = requests.post(
            f"{api_url}/internal/agent-task",
            json={
                "agent":   "inventory_optimization_agent",
                "task":    "execute_rebalancing_plan",
                "payload": plan_summary,
                "priority": "high" if reorder_meta["n_critical"] > 0 else "normal",
            },
            headers={"X-Internal-Token": os.getenv("INTERNAL_API_TOKEN", "")},
            timeout=15,
        )
        log.info("Published to agents: HTTP %d", resp.status_code)
    except Exception as e:
        log.warning("Agent publish failed: %s", e)

    log.info("Rebalancing plan summary: %s", json.dumps(plan_summary, indent=2))


# ── DAG Definition ───────────────────────────────────────────

with DAG(
    dag_id="inventory_rebalancing_pipeline",
    description="Daily inventory rebalancing and replenishment order generation",
    schedule="0 2 * * *",  # Daily at 02:00 UTC
    start_date=pendulum.datetime(2024, 1, 1, tz="UTC"),
    catchup=False,
    max_active_runs=1,
    default_args=DEFAULT_ARGS,
    tags=["inventory", "procurement", "rebalancing"],
    doc_md=__doc__,
) as dag:

    t_reorder = PythonOperator(
        task_id="calculate_reorder_needs",
        python_callable=calculate_reorder_needs,
    )

    t_safety = PythonOperator(
        task_id="optimize_safety_stock",
        python_callable=optimize_safety_stock,
    )

    t_transfers = PythonOperator(
        task_id="generate_transfer_orders",
        python_callable=generate_transfer_orders,
    )

    t_pos = PythonOperator(
        task_id="create_replenishment_pos",
        python_callable=create_replenishment_pos,
    )

    t_budget = BranchPythonOperator(
        task_id="validate_budget_constraints",
        python_callable=validate_budget_constraints,
    )

    t_approve = PythonOperator(
        task_id="approve_auto_orders",
        python_callable=approve_auto_orders,
    )

    t_breach = PythonOperator(
        task_id="flag_budget_breach",
        python_callable=flag_budget_breach,
    )

    t_publish = PythonOperator(
        task_id="publish_to_agents",
        python_callable=publish_to_agents,
        trigger_rule=TriggerRule.NONE_FAILED_MIN_ONE_SUCCESS,
    )

    # Dependencies
    [t_reorder, t_safety] >> t_transfers >> t_pos >> t_budget
    t_budget >> [t_approve, t_breach]
    [t_approve, t_breach] >> t_publish
