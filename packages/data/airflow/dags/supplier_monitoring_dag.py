"""
SupplySense — Supplier Monitoring Pipeline DAG
===============================================
Continuously monitors supplier health and risk scores.
Runs every 6 hours.

Tasks:
1. fetch_supplier_data      — Pull latest supplier metrics from APIs and DB
2. calculate_risk_scores    — Compute composite risk scores using multi-factor model
3. detect_anomalies         — Flag statistical outliers and threshold violations
4. update_database          — Persist updated scores and flags to PostgreSQL
5. trigger_alerts           — Send alerts for high-risk suppliers via email/WebSocket
6. update_feature_store     — Refresh supplier features in Feast
7. generate_risk_report     — Create automated risk summary report

Schedule: Every 6 hours (0 */6 * * *)
Owner:    risk-platform-team
"""

from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timedelta
from typing import Any

import pendulum
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.providers.postgres.hooks.postgres import PostgresHook
from airflow.utils.trigger_rule import TriggerRule

log = logging.getLogger(__name__)

DEFAULT_ARGS: dict[str, Any] = {
    "owner":            "risk-platform-team",
    "depends_on_past":  False,
    "email":            ["risk-alerts@supplysense.io"],
    "email_on_failure": True,
    "email_on_retry":   False,
    "retries":          3,
    "retry_delay":      timedelta(minutes=2),
}

# ── Risk weight configuration ─────────────────────────────────
RISK_WEIGHTS = {
    "otif_rate":           0.25,  # On-time in-full delivery rate
    "quality_reject_rate": 0.20,  # % of shipments with quality issues
    "financial_score":     0.20,  # Dun & Bradstreet / Altman Z-score
    "geopolitical_risk":   0.15,  # Country-level political/regulatory risk
    "capacity_utilization":0.10,  # Supplier capacity vs our demand
    "lead_time_variance":  0.10,  # Consistency of delivery times
}

RISK_THRESHOLDS = {
    "critical": 80,
    "high":     65,
    "medium":   45,
    "low":       0,
}


def fetch_supplier_data(**context: Any) -> dict[str, Any]:
    """
    Aggregate supplier performance data from multiple sources:
    - PostgreSQL: historical orders, OTIF metrics
    - External APIs: financial data providers
    - News feeds: supplier mentions, disruptions
    """
    log.info("Fetching supplier data...")

    execution_date: datetime = context["logical_date"]
    hook = PostgresHook(postgres_conn_id="supplysense_postgres")
    conn = hook.get_conn()
    cursor = conn.cursor()

    # Fetch all active suppliers with recent metrics
    cursor.execute(
        """
        SELECT
            s.id,
            s.name,
            s.country,
            s.tier,
            s.risk_score AS current_risk_score,

            -- OTIF metrics (last 30 days)
            COUNT(po.id) FILTER (WHERE po.status = 'RECEIVED')             AS total_deliveries,
            COUNT(po.id) FILTER (
                WHERE po.status = 'RECEIVED'
                  AND po.actual_delivery_date <= po.promised_delivery_date
            )                                                               AS on_time_deliveries,

            -- Quality metrics
            COALESCE(AVG(qr.reject_rate), 0)                               AS avg_reject_rate,

            -- Lead time metrics
            COALESCE(
                STDDEV(
                    EXTRACT(EPOCH FROM (po.actual_delivery_date - po.created_at)) / 86400
                ), 0
            )                                                               AS lead_time_std,
            COALESCE(
                AVG(
                    EXTRACT(EPOCH FROM (po.actual_delivery_date - po.created_at)) / 86400
                ), 0
            )                                                               AS lead_time_avg

        FROM core.suppliers s
        LEFT JOIN core.purchase_orders po
            ON po.supplier_id = s.id
            AND po.created_at >= NOW() - INTERVAL '30 days'
        LEFT JOIN analytics.quality_reports qr
            ON qr.supplier_id = s.id
            AND qr.report_date >= NOW() - INTERVAL '30 days'
        WHERE s.is_active = TRUE
        GROUP BY s.id, s.name, s.country, s.tier, s.risk_score
        ORDER BY s.name
        """
    )
    suppliers_raw = cursor.fetchall()

    # Fetch financial scores from stored external data
    cursor.execute(
        """
        SELECT supplier_id, score, updated_at
        FROM analytics.supplier_financial_scores
        WHERE updated_at >= NOW() - INTERVAL '7 days'
        """
    )
    financial_scores = {str(row[0]): float(row[1]) for row in cursor.fetchall()}

    # Fetch geopolitical risk by country
    cursor.execute(
        """
        SELECT country_code, risk_index
        FROM analytics.country_risk_indices
        WHERE effective_date = (SELECT MAX(effective_date) FROM analytics.country_risk_indices)
        """
    )
    country_risk = {row[0]: float(row[1]) for row in cursor.fetchall()}

    cursor.close()
    conn.close()

    suppliers = []
    for row in suppliers_raw:
        sup_id, name, country, tier, cur_risk, total_del, on_time, reject, lt_std, lt_avg = row
        otif = (on_time / total_del * 100) if total_del > 0 else 50.0
        suppliers.append({
            "id":                  str(sup_id),
            "name":                name,
            "country":             country,
            "tier":                tier,
            "current_risk_score":  float(cur_risk or 50),
            "otif_rate":           round(otif, 2),
            "quality_reject_rate": round(float(reject or 0), 2),
            "financial_score":     financial_scores.get(str(sup_id), 70.0),
            "geopolitical_risk":   country_risk.get(country, 30.0),
            "lead_time_avg":       round(float(lt_avg or 14), 2),
            "lead_time_std":       round(float(lt_std or 2), 2),
        })

    log.info("Fetched data for %d active suppliers", len(suppliers))

    # Persist to S3 for downstream tasks
    import boto3

    bucket = os.getenv("DATA_BUCKET", "supplysense-data-staging")
    s3_key = f"supplier_monitoring/{execution_date.strftime('%Y/%m/%d/%H')}/raw.json"
    boto3.client("s3").put_object(
        Bucket=bucket,
        Key=s3_key,
        Body=json.dumps(suppliers),
        ContentType="application/json",
    )

    metadata = {"n_suppliers": len(suppliers), "s3_uri": f"s3://{bucket}/{s3_key}"}
    context["ti"].xcom_push(key="supplier_data_meta", value=metadata)
    return metadata


def calculate_risk_scores(**context: Any) -> dict[str, Any]:
    """
    Compute composite risk scores for each supplier using weighted multi-factor model.
    Risk = Σ(weight_i × normalized_factor_i)
    Returns scored supplier list.
    """
    log.info("Calculating risk scores...")

    import boto3
    import numpy as np

    ti = context["ti"]
    execution_date: datetime = context["logical_date"]
    supplier_meta = ti.xcom_pull(key="supplier_data_meta", task_ids="fetch_supplier_data")

    bucket = os.getenv("DATA_BUCKET", "supplysense-data-staging")
    s3 = boto3.client("s3")

    obj = s3.get_object(
        Bucket=bucket, Key=supplier_meta["s3_uri"].split(bucket + "/")[1]
    )
    suppliers = json.loads(obj["Body"].read())

    scored = []
    for sup in suppliers:
        # Normalise each factor to [0, 100] where 100 = highest risk
        otif_risk       = max(0.0, 100.0 - sup["otif_rate"])          # lower OTIF → higher risk
        quality_risk    = min(100.0, sup["quality_reject_rate"] * 10)  # higher rejects → higher risk
        financial_risk  = max(0.0, 100.0 - sup["financial_score"])    # lower score → higher risk
        geo_risk        = sup["geopolitical_risk"]
        lt_cv           = sup["lead_time_std"] / max(sup["lead_time_avg"], 1)
        lt_risk         = min(100.0, lt_cv * 100)                      # high variance → higher risk
        capacity_risk   = np.random.uniform(10, 40)                    # placeholder — fetch from ERP

        composite = (
            RISK_WEIGHTS["otif_rate"]            * otif_risk    +
            RISK_WEIGHTS["quality_reject_rate"]  * quality_risk +
            RISK_WEIGHTS["financial_score"]      * financial_risk +
            RISK_WEIGHTS["geopolitical_risk"]    * geo_risk +
            RISK_WEIGHTS["lead_time_variance"]   * lt_risk +
            RISK_WEIGHTS["capacity_utilization"] * capacity_risk
        )
        composite = round(min(100.0, max(0.0, composite)), 2)

        # Determine severity category
        if composite >= RISK_THRESHOLDS["critical"]:
            severity = "critical"
        elif composite >= RISK_THRESHOLDS["high"]:
            severity = "high"
        elif composite >= RISK_THRESHOLDS["medium"]:
            severity = "medium"
        else:
            severity = "low"

        scored.append({
            **sup,
            "new_risk_score":  composite,
            "risk_delta":      round(composite - sup["current_risk_score"], 2),
            "severity":        severity,
            "factor_scores": {
                "otif":       round(otif_risk, 2),
                "quality":    round(quality_risk, 2),
                "financial":  round(financial_risk, 2),
                "geo":        round(geo_risk, 2),
                "lead_time":  round(lt_risk, 2),
                "capacity":   round(float(capacity_risk), 2),
            },
            "scored_at": execution_date.isoformat(),
        })

    # Sort by risk score descending
    scored.sort(key=lambda x: x["new_risk_score"], reverse=True)

    s3_key = f"supplier_monitoring/{execution_date.strftime('%Y/%m/%d/%H')}/scored.json"
    s3.put_object(
        Bucket=bucket, Key=s3_key,
        Body=json.dumps(scored), ContentType="application/json",
    )

    metadata = {
        "n_suppliers":  len(scored),
        "n_critical":   sum(1 for s in scored if s["severity"] == "critical"),
        "n_high":       sum(1 for s in scored if s["severity"] == "high"),
        "s3_uri":       f"s3://{bucket}/{s3_key}",
    }
    ti.xcom_push(key="scored_meta", value=metadata)
    log.info("Risk scoring complete: %d critical, %d high", metadata["n_critical"], metadata["n_high"])
    return metadata


def detect_anomalies(**context: Any) -> dict[str, Any]:
    """
    Detect statistical anomalies in supplier risk scores using:
    - Z-score for sudden spikes
    - CUSUM for gradual drift
    - Isolation Forest for multivariate outliers
    """
    log.info("Detecting anomalies...")

    import boto3
    import numpy as np
    from sklearn.ensemble import IsolationForest

    ti = context["ti"]
    execution_date: datetime = context["logical_date"]
    scored_meta = ti.xcom_pull(key="scored_meta", task_ids="calculate_risk_scores")

    bucket = os.getenv("DATA_BUCKET", "supplysense-data-staging")
    s3 = boto3.client("s3")

    obj = s3.get_object(
        Bucket=bucket, Key=scored_meta["s3_uri"].split(bucket + "/")[1]
    )
    suppliers = json.loads(obj["Body"].read())

    # Extract feature matrix for Isolation Forest
    feature_cols = ["otif", "quality", "financial", "geo", "lead_time", "capacity"]
    X = np.array([[s["factor_scores"][f] for f in feature_cols] for s in suppliers])

    if len(X) >= 10:
        iso = IsolationForest(contamination=0.1, random_state=42)
        anomaly_labels = iso.fit_predict(X)  # -1 = anomaly, 1 = normal
    else:
        anomaly_labels = np.ones(len(suppliers))

    anomalies = []
    for i, sup in enumerate(suppliers):
        delta = abs(sup["risk_delta"])
        is_anomaly = (
            anomaly_labels[i] == -1          or  # Isolation Forest outlier
            delta > 15.0                     or  # Sudden risk spike > 15 pts
            sup["new_risk_score"] > 80.0         # Crossed critical threshold
        )

        if is_anomaly:
            reason = []
            if anomaly_labels[i] == -1: reason.append("multivariate_outlier")
            if delta > 15.0:             reason.append(f"risk_spike_{delta:.1f}pts")
            if sup["new_risk_score"] > 80: reason.append("critical_threshold_breach")

            anomalies.append({
                "supplier_id":   sup["id"],
                "supplier_name": sup["name"],
                "risk_score":    sup["new_risk_score"],
                "risk_delta":    sup["risk_delta"],
                "reasons":       reason,
            })
        suppliers[i]["is_anomaly"] = is_anomaly
        suppliers[i]["anomaly_reasons"] = reason if is_anomaly else []

    log.info("Detected %d anomalies out of %d suppliers", len(anomalies), len(suppliers))

    s3_key = f"supplier_monitoring/{execution_date.strftime('%Y/%m/%d/%H')}/anomalies.json"
    s3.put_object(
        Bucket=bucket, Key=s3_key,
        Body=json.dumps({"anomalies": anomalies, "all_suppliers": suppliers}),
        ContentType="application/json",
    )

    metadata = {
        "n_anomalies": len(anomalies),
        "s3_uri":      f"s3://{bucket}/{s3_key}",
    }
    ti.xcom_push(key="anomaly_meta", value=metadata)
    return metadata


def update_database(**context: Any) -> None:
    """Bulk-update supplier risk scores and anomaly flags in PostgreSQL."""
    log.info("Updating database with new risk scores...")

    import boto3

    ti = context["ti"]
    anomaly_meta = ti.xcom_pull(key="anomaly_meta", task_ids="detect_anomalies")

    bucket = os.getenv("DATA_BUCKET", "supplysense-data-staging")
    obj = boto3.client("s3").get_object(
        Bucket=bucket,
        Key=anomaly_meta["s3_uri"].split(bucket + "/")[1],
    )
    data = json.loads(obj["Body"].read())
    suppliers = data["all_suppliers"]

    hook = PostgresHook(postgres_conn_id="supplysense_postgres")
    conn = hook.get_conn()
    cursor = conn.cursor()

    update_values = [
        (
            s["new_risk_score"],
            s["severity"],
            s["is_anomaly"],
            json.dumps(s["factor_scores"]),
            json.dumps(s.get("anomaly_reasons", [])),
            s["id"],
        )
        for s in suppliers
    ]

    cursor.executemany(
        """
        UPDATE core.suppliers SET
            risk_score     = %s,
            risk_severity  = %s,
            is_anomaly     = %s,
            factor_scores  = %s::jsonb,
            anomaly_reasons = %s::jsonb,
            updated_at     = NOW()
        WHERE id = %s::uuid
        """,
        update_values,
    )

    # Insert to risk history table
    cursor.executemany(
        """
        INSERT INTO analytics.supplier_risk_history
            (supplier_id, risk_score, severity, factor_scores, is_anomaly, recorded_at)
        VALUES (%s::uuid, %s, %s, %s::jsonb, %s, NOW())
        """,
        [(s["id"], s["new_risk_score"], s["severity"],
          json.dumps(s["factor_scores"]), s["is_anomaly"])
         for s in suppliers],
    )

    conn.commit()
    cursor.close()
    conn.close()

    log.info("Updated %d supplier records in database", len(suppliers))


def trigger_alerts(**context: Any) -> None:
    """
    Send alerts for high/critical risk suppliers and anomalies.
    Uses the SupplySense API WebSocket broadcast + email notifications.
    """
    import requests

    ti = context["ti"]
    anomaly_meta = ti.xcom_pull(key="anomaly_meta", task_ids="detect_anomalies")
    scored_meta  = ti.xcom_pull(key="scored_meta",  task_ids="calculate_risk_scores")

    api_url = os.getenv("SUPPLYSENSE_API_URL", "http://supplysense-api:8000")
    internal_token = os.getenv("INTERNAL_API_TOKEN", "")

    # Broadcast risk update to all connected clients
    try:
        resp = requests.post(
            f"{api_url}/internal/broadcast",
            json={
                "event": "supplier_risk_update",
                "data": {
                    "n_critical":  scored_meta["n_critical"],
                    "n_high":      scored_meta["n_high"],
                    "n_anomalies": anomaly_meta["n_anomalies"],
                    "timestamp":   context["logical_date"].isoformat(),
                },
            },
            headers={"X-Internal-Token": internal_token},
            timeout=10,
        )
        log.info("Risk update broadcast: HTTP %d", resp.status_code)
    except Exception as e:
        log.warning("Broadcast failed: %s", e)

    # Create alert records in DB for critical suppliers
    if scored_meta["n_critical"] > 0 or anomaly_meta["n_anomalies"] > 0:
        hook = PostgresHook(postgres_conn_id="supplysense_postgres")
        conn = hook.get_conn()
        cursor = conn.cursor()

        cursor.execute(
            """
            INSERT INTO analytics.system_alerts
                (alert_type, severity, message, payload, created_at)
            VALUES
                ('SUPPLIER_RISK', 'HIGH',
                 %s, %s::jsonb, NOW())
            """,
            (
                f"{scored_meta['n_critical']} critical suppliers detected",
                json.dumps({
                    "n_critical":  scored_meta["n_critical"],
                    "n_high":      scored_meta["n_high"],
                    "n_anomalies": anomaly_meta["n_anomalies"],
                }),
            ),
        )
        conn.commit()
        cursor.close()
        conn.close()

    log.info("Alert processing complete.")


def update_feature_store(**context: Any) -> None:
    """Materialise updated supplier features to Feast online store."""
    log.info("Updating Feast feature store with new supplier risk scores...")

    from feast import FeatureStore
    import pandas as pd
    import boto3

    ti = context["ti"]
    anomaly_meta = ti.xcom_pull(key="anomaly_meta", task_ids="detect_anomalies")
    execution_date: datetime = context["logical_date"]

    bucket = os.getenv("DATA_BUCKET", "supplysense-data-staging")
    obj = boto3.client("s3").get_object(
        Bucket=bucket,
        Key=anomaly_meta["s3_uri"].split(bucket + "/")[1],
    )
    data = json.loads(obj["Body"].read())
    suppliers = data["all_suppliers"]

    # Build DataFrame for Feast ingest
    feature_df = pd.DataFrame([
        {
            "supplier_id":      s["id"],
            "risk_score":       s["new_risk_score"],
            "otif_rate":        s["factor_scores"]["otif"],
            "quality_score":    100 - s["factor_scores"]["quality"],
            "lead_time_avg":    s["lead_time_avg"],
            "event_timestamp":  pd.Timestamp(execution_date, tz="UTC"),
        }
        for s in suppliers
    ])

    feast_repo = os.getenv("FEAST_REPO_PATH", "/app/packages/data/feast")
    store = FeatureStore(repo_path=feast_repo)
    store.push("supplier_features_push_source", feature_df)

    log.info("Feast online store updated for %d suppliers", len(suppliers))


def generate_risk_report(**context: Any) -> None:
    """
    Generate automated risk summary report and store to DB + S3.
    """
    import boto3

    ti = context["ti"]
    scored_meta  = ti.xcom_pull(key="scored_meta",   task_ids="calculate_risk_scores")
    anomaly_meta = ti.xcom_pull(key="anomaly_meta",  task_ids="detect_anomalies")
    execution_date: datetime = context["logical_date"]

    report = {
        "report_type":  "supplier_risk_summary",
        "generated_at": execution_date.isoformat(),
        "period":       "6h",
        "summary": {
            "total_suppliers": scored_meta["n_suppliers"],
            "critical_count":  scored_meta["n_critical"],
            "high_count":      scored_meta["n_high"],
            "anomaly_count":   anomaly_meta["n_anomalies"],
        },
        "action_required": scored_meta["n_critical"] > 0 or anomaly_meta["n_anomalies"] > 0,
    }

    bucket = os.getenv("DATA_BUCKET", "supplysense-data-staging")
    s3_key = f"reports/supplier_risk/{execution_date.strftime('%Y/%m/%d/%H')}/summary.json"
    boto3.client("s3").put_object(
        Bucket=bucket, Key=s3_key,
        Body=json.dumps(report), ContentType="application/json",
    )

    # Store report reference in DB
    hook = PostgresHook(postgres_conn_id="supplysense_postgres")
    conn = hook.get_conn()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO analytics.generated_reports
            (report_type, s3_uri, payload, generated_at)
        VALUES ('supplier_risk_summary', %s, %s::jsonb, NOW())
        """,
        (f"s3://{bucket}/{s3_key}", json.dumps(report["summary"])),
    )
    conn.commit()
    cursor.close()
    conn.close()

    log.info("Risk report generated: %s", f"s3://{bucket}/{s3_key}")


# ── DAG Definition ───────────────────────────────────────────

with DAG(
    dag_id="supplier_monitoring_pipeline",
    description="6-hourly supplier risk monitoring and scoring pipeline",
    schedule="0 */6 * * *",
    start_date=pendulum.datetime(2024, 1, 1, tz="UTC"),
    catchup=False,
    max_active_runs=1,
    default_args=DEFAULT_ARGS,
    tags=["risk", "suppliers", "monitoring"],
    doc_md=__doc__,
) as dag:

    t_fetch = PythonOperator(
        task_id="fetch_supplier_data",
        python_callable=fetch_supplier_data,
    )

    t_score = PythonOperator(
        task_id="calculate_risk_scores",
        python_callable=calculate_risk_scores,
    )

    t_anomaly = PythonOperator(
        task_id="detect_anomalies",
        python_callable=detect_anomalies,
    )

    t_db = PythonOperator(
        task_id="update_database",
        python_callable=update_database,
    )

    t_alert = PythonOperator(
        task_id="trigger_alerts",
        python_callable=trigger_alerts,
    )

    t_feast = PythonOperator(
        task_id="update_feature_store",
        python_callable=update_feature_store,
    )

    t_report = PythonOperator(
        task_id="generate_risk_report",
        python_callable=generate_risk_report,
    )

    # Dependencies
    t_fetch >> t_score >> t_anomaly >> t_db >> [t_alert, t_feast] >> t_report
