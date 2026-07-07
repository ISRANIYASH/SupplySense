"""
SupplySense — Kafka Producer
============================
High-level producer for all SupplySense Kafka topics.
Provides typed message schemas and automatic serialisation.

Topics:
    supplysense.demand_signals      — Real-time demand signals
    supplysense.inventory_events    — Inventory movements and changes
    supplysense.supplier_events     — Supplier status changes
    supplysense.risk_alerts         — Risk alerts and warnings
    supplysense.agent_decisions     — AI agent decision log

Usage:
    producer = SupplyChainProducer()
    producer.send_demand_signal(sku_id="SKU-001", value=142.5, source="pos")
    producer.close()
"""

from __future__ import annotations

import json
import logging
import os
import time
import uuid
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from typing import Any, Callable

from confluent_kafka import Producer, KafkaException
from confluent_kafka.schema_registry import SchemaRegistryClient
from confluent_kafka.schema_registry.json_schema import JSONSerializer
from confluent_kafka.serialization import SerializationContext, MessageField

log = logging.getLogger(__name__)

# ── Topic Constants ───────────────────────────────────────────
TOPICS = {
    "demand_signals":    "supplysense.demand_signals",
    "inventory_events":  "supplysense.inventory_events",
    "supplier_events":   "supplysense.supplier_events",
    "risk_alerts":       "supplysense.risk_alerts",
    "agent_decisions":   "supplysense.agent_decisions",
    "forecast_updates":  "supplysense.forecast_updates",
    "po_events":         "supplysense.po_events",
    "ws_broadcast":      "supplysense.ws_broadcast",
}


# ── Message Schemas ───────────────────────────────────────────

@dataclass
class DemandSignal:
    signal_id:   str
    sku_id:      str
    value:       float
    source:      str        # pos, ecommerce, edi, forecast
    warehouse_id: str | None
    timestamp:   str
    metadata:    dict[str, Any]

    @classmethod
    def create(cls, sku_id: str, value: float, source: str,
               warehouse_id: str | None = None,
               metadata: dict[str, Any] | None = None) -> "DemandSignal":
        return cls(
            signal_id=str(uuid.uuid4()),
            sku_id=sku_id,
            value=value,
            source=source,
            warehouse_id=warehouse_id,
            timestamp=datetime.now(timezone.utc).isoformat(),
            metadata=metadata or {},
        )


@dataclass
class InventoryEvent:
    event_id:    str
    event_type:  str   # SALE, RECEIPT, TRANSFER, ADJUSTMENT, RETURN
    sku_id:      str
    quantity:    float
    warehouse_id: str
    reference_id: str | None  # PO number, transfer ID, etc.
    timestamp:   str
    metadata:    dict[str, Any]

    @classmethod
    def create(cls, event_type: str, sku_id: str, quantity: float,
               warehouse_id: str, reference_id: str | None = None,
               metadata: dict[str, Any] | None = None) -> "InventoryEvent":
        return cls(
            event_id=str(uuid.uuid4()),
            event_type=event_type,
            sku_id=sku_id,
            quantity=quantity,
            warehouse_id=warehouse_id,
            reference_id=reference_id,
            timestamp=datetime.now(timezone.utc).isoformat(),
            metadata=metadata or {},
        )


@dataclass
class SupplierEvent:
    event_id:    str
    supplier_id: str
    event_type:  str   # RISK_CHANGE, DELIVERY_UPDATE, CONTRACT_CHANGE, DISRUPTION
    data:        dict[str, Any]
    severity:    str   # info, warning, critical
    timestamp:   str

    @classmethod
    def create(cls, supplier_id: str, event_type: str,
               data: dict[str, Any], severity: str = "info") -> "SupplierEvent":
        return cls(
            event_id=str(uuid.uuid4()),
            supplier_id=supplier_id,
            event_type=event_type,
            data=data,
            severity=severity,
            timestamp=datetime.now(timezone.utc).isoformat(),
        )


@dataclass
class RiskAlert:
    alert_id:          str
    alert_type:        str    # SUPPLIER_RISK, STOCKOUT, DISRUPTION, BUDGET, ANOMALY
    severity:          str    # CRITICAL, HIGH, MEDIUM, LOW, INFO
    title:             str
    message:           str
    affected_entities: list[dict[str, str]]
    probability:       float  # 0.0-1.0
    impact_score:      float  # 0.0-100.0
    recommended_action: str
    timestamp:         str
    expires_at:        str | None

    @classmethod
    def create(cls, alert_type: str, severity: str, title: str,
               message: str, affected_entities: list[dict[str, str]],
               probability: float = 1.0, impact_score: float = 50.0,
               recommended_action: str = "",
               expires_at: str | None = None) -> "RiskAlert":
        return cls(
            alert_id=str(uuid.uuid4()),
            alert_type=alert_type,
            severity=severity,
            title=title,
            message=message,
            affected_entities=affected_entities,
            probability=probability,
            impact_score=impact_score,
            recommended_action=recommended_action,
            timestamp=datetime.now(timezone.utc).isoformat(),
            expires_at=expires_at,
        )


@dataclass
class AgentDecision:
    decision_id:    str
    agent_name:     str
    decision_type:  str
    input_context:  dict[str, Any]
    output:         dict[str, Any]
    confidence:     float
    reasoning:      str
    requires_approval: bool
    approved_by:    str | None
    timestamp:      str

    @classmethod
    def create(cls, agent_name: str, decision_type: str,
               input_context: dict[str, Any], output: dict[str, Any],
               confidence: float = 1.0, reasoning: str = "",
               requires_approval: bool = False) -> "AgentDecision":
        return cls(
            decision_id=str(uuid.uuid4()),
            agent_name=agent_name,
            decision_type=decision_type,
            input_context=input_context,
            output=output,
            confidence=confidence,
            reasoning=reasoning,
            requires_approval=requires_approval,
            approved_by=None,
            timestamp=datetime.now(timezone.utc).isoformat(),
        )


# ── Producer ─────────────────────────────────────────────────

class SupplyChainProducer:
    """
    Thread-safe Kafka producer for all SupplySense topics.
    Handles serialisation, error callbacks, and delivery receipts.
    """

    def __init__(
        self,
        bootstrap_servers: str | None = None,
        config_overrides: dict[str, Any] | None = None,
    ) -> None:
        servers = bootstrap_servers or os.getenv(
            "KAFKA_BOOTSTRAP_SERVERS", "kafka:9092"
        )

        config: dict[str, Any] = {
            "bootstrap.servers":        servers,
            "client.id":                f"supplysense-producer-{os.getpid()}",
            "acks":                     "all",          # All ISR must ack
            "retries":                  5,
            "retry.backoff.ms":         200,
            "max.in.flight.requests.per.connection": 1,  # Preserve order
            "enable.idempotence":       True,
            "compression.type":         "lz4",
            "linger.ms":                5,              # Micro-batching
            "batch.size":               65536,          # 64KB batches
            "queue.buffering.max.ms":   100,
            "delivery.timeout.ms":      30000,
        }

        if config_overrides:
            config.update(config_overrides)

        # TLS/SASL if configured
        if os.getenv("KAFKA_SECURITY_PROTOCOL"):
            config["security.protocol"]  = os.getenv("KAFKA_SECURITY_PROTOCOL", "PLAINTEXT")
            config["sasl.mechanism"]      = os.getenv("KAFKA_SASL_MECHANISM", "PLAIN")
            config["sasl.username"]       = os.getenv("KAFKA_SASL_USERNAME", "")
            config["sasl.password"]       = os.getenv("KAFKA_SASL_PASSWORD", "")

        self._producer = Producer(config)
        log.info("SupplyChainProducer initialised: %s", servers)

    # ── Internal helpers ──────────────────────────────────────

    def _delivery_callback(self, err: Any, msg: Any) -> None:
        if err:
            log.error(
                "Delivery failed [topic=%s partition=%d]: %s",
                msg.topic(), msg.partition(), err,
            )
        else:
            log.debug(
                "Delivered [topic=%s partition=%d offset=%d]",
                msg.topic(), msg.partition(), msg.offset(),
            )

    def _send(
        self,
        topic: str,
        payload: dict[str, Any],
        key: str | None = None,
        headers: dict[str, str] | None = None,
    ) -> None:
        """Serialise and produce a message to the given topic."""
        value = json.dumps(payload, default=str).encode("utf-8")
        key_bytes = key.encode("utf-8") if key else None
        hdrs = [(k, v.encode()) for k, v in (headers or {}).items()]

        try:
            self._producer.produce(
                topic=topic,
                key=key_bytes,
                value=value,
                headers=hdrs,
                on_delivery=self._delivery_callback,
            )
            self._producer.poll(0)  # Non-blocking flush
        except BufferError:
            log.warning("Producer queue full — flushing before retry")
            self._producer.flush(timeout=5)
            self._producer.produce(
                topic=topic,
                key=key_bytes,
                value=value,
                headers=hdrs,
                on_delivery=self._delivery_callback,
            )
        except KafkaException as e:
            log.error("KafkaException: %s", e)
            raise

    # ── Public API ────────────────────────────────────────────

    def send_demand_signal(
        self,
        sku_id:      str,
        value:       float,
        source:      str,
        warehouse_id: str | None = None,
        metadata:    dict[str, Any] | None = None,
    ) -> str:
        """
        Publish a demand signal for a given SKU.

        Args:
            sku_id:       Product SKU identifier
            value:        Demand quantity
            source:       Signal source (pos, ecommerce, edi, forecast)
            warehouse_id: Optional warehouse context
            metadata:     Additional context (promo_id, channel, etc.)

        Returns:
            signal_id: Unique ID of the produced message
        """
        signal = DemandSignal.create(
            sku_id=sku_id, value=value, source=source,
            warehouse_id=warehouse_id, metadata=metadata,
        )
        payload = asdict(signal)
        self._send(
            topic=TOPICS["demand_signals"],
            payload=payload,
            key=sku_id,
            headers={"source": source, "schema_version": "1.0"},
        )
        log.debug("Demand signal sent: %s sku=%s value=%.2f", signal.signal_id, sku_id, value)
        return signal.signal_id

    def send_inventory_event(
        self,
        event_type:  str,
        sku_id:      str,
        quantity:    float,
        warehouse_id: str,
        reference_id: str | None = None,
        metadata:    dict[str, Any] | None = None,
    ) -> str:
        """
        Publish an inventory event (sale, receipt, transfer, etc.)

        Args:
            event_type:   SALE | RECEIPT | TRANSFER | ADJUSTMENT | RETURN
            sku_id:       Product SKU identifier
            quantity:     Quantity (positive = addition, negative = reduction)
            warehouse_id: Warehouse where event occurred
            reference_id: Optional reference (PO number, transfer ID)
            metadata:     Additional context

        Returns:
            event_id: Unique ID of the produced message
        """
        event = InventoryEvent.create(
            event_type=event_type, sku_id=sku_id, quantity=quantity,
            warehouse_id=warehouse_id, reference_id=reference_id, metadata=metadata,
        )
        payload = asdict(event)
        self._send(
            topic=TOPICS["inventory_events"],
            payload=payload,
            key=f"{warehouse_id}:{sku_id}",
            headers={"event_type": event_type, "schema_version": "1.0"},
        )
        log.debug("Inventory event sent: %s type=%s sku=%s qty=%.2f",
                  event.event_id, event_type, sku_id, quantity)
        return event.event_id

    def send_supplier_event(
        self,
        supplier_id: str,
        event_type:  str,
        data:        dict[str, Any],
        severity:    str = "info",
    ) -> str:
        """
        Publish a supplier status event.

        Args:
            supplier_id: Supplier UUID
            event_type:  RISK_CHANGE | DELIVERY_UPDATE | CONTRACT_CHANGE | DISRUPTION
            data:        Event-specific payload
            severity:    info | warning | critical

        Returns:
            event_id
        """
        event = SupplierEvent.create(
            supplier_id=supplier_id, event_type=event_type,
            data=data, severity=severity,
        )
        payload = asdict(event)
        self._send(
            topic=TOPICS["supplier_events"],
            payload=payload,
            key=supplier_id,
            headers={"event_type": event_type, "severity": severity, "schema_version": "1.0"},
        )
        log.debug("Supplier event sent: %s supplier=%s type=%s",
                  event.event_id, supplier_id, event_type)
        return event.event_id

    def send_risk_alert(
        self,
        alert_type:         str,
        severity:           str,
        title:              str,
        message:            str,
        affected_entities:  list[dict[str, str]],
        probability:        float = 1.0,
        impact_score:       float = 50.0,
        recommended_action: str = "",
        expires_at:         str | None = None,
    ) -> str:
        """
        Publish a risk alert to the alerts topic.

        Args:
            alert_type:         SUPPLIER_RISK | STOCKOUT | DISRUPTION | BUDGET | ANOMALY
            severity:           CRITICAL | HIGH | MEDIUM | LOW | INFO
            title:              Short alert title
            message:            Detailed alert message
            affected_entities:  List of {type: ..., id: ..., name: ...} dicts
            probability:        Estimated probability (0.0-1.0)
            impact_score:       Business impact score (0-100)
            recommended_action: Suggested response
            expires_at:         ISO timestamp when alert expires

        Returns:
            alert_id
        """
        alert = RiskAlert.create(
            alert_type=alert_type, severity=severity, title=title, message=message,
            affected_entities=affected_entities, probability=probability,
            impact_score=impact_score, recommended_action=recommended_action,
            expires_at=expires_at,
        )
        payload = asdict(alert)
        # Use severity as partition key for priority routing
        self._send(
            topic=TOPICS["risk_alerts"],
            payload=payload,
            key=severity,
            headers={"alert_type": alert_type, "severity": severity, "schema_version": "1.0"},
        )
        log.info("Risk alert sent: %s [%s] %s", alert.alert_id, severity, title)
        return alert.alert_id

    def send_agent_decision(
        self,
        agent_name:     str,
        decision_type:  str,
        input_context:  dict[str, Any],
        output:         dict[str, Any],
        confidence:     float = 1.0,
        reasoning:      str = "",
        requires_approval: bool = False,
    ) -> str:
        """
        Publish an AI agent decision to the audit/decision topic.

        Args:
            agent_name:        Name of the agent (e.g., 'demand_forecast_agent')
            decision_type:     Type of decision made
            input_context:     Inputs the agent received
            output:            Decision output/recommendation
            confidence:        Model confidence (0.0-1.0)
            reasoning:         Chain-of-thought / explanation
            requires_approval: Whether human approval is needed

        Returns:
            decision_id
        """
        decision = AgentDecision.create(
            agent_name=agent_name, decision_type=decision_type,
            input_context=input_context, output=output,
            confidence=confidence, reasoning=reasoning,
            requires_approval=requires_approval,
        )
        payload = asdict(decision)
        self._send(
            topic=TOPICS["agent_decisions"],
            payload=payload,
            key=agent_name,
            headers={
                "agent_name":   agent_name,
                "decision_type": decision_type,
                "requires_approval": str(requires_approval).lower(),
                "schema_version": "1.0",
            },
        )
        log.debug("Agent decision sent: %s agent=%s type=%s",
                  decision.decision_id, agent_name, decision_type)
        return decision.decision_id

    def send_forecast_update(
        self,
        model_version: str,
        n_skus:        int,
        metrics:       dict[str, float],
        s3_uri:        str,
    ) -> None:
        """Publish a forecast update notification."""
        self._send(
            topic=TOPICS["forecast_updates"],
            payload={
                "model_version": model_version,
                "n_skus":        n_skus,
                "metrics":       metrics,
                "s3_uri":        s3_uri,
                "timestamp":     datetime.now(timezone.utc).isoformat(),
            },
            key="forecast_update",
        )

    def send_po_event(
        self,
        po_id:      str,
        po_number:  str,
        event_type: str,
        payload:    dict[str, Any],
    ) -> None:
        """Publish a purchase order lifecycle event."""
        self._send(
            topic=TOPICS["po_events"],
            payload={
                "po_id":      po_id,
                "po_number":  po_number,
                "event_type": event_type,
                "payload":    payload,
                "timestamp":  datetime.now(timezone.utc).isoformat(),
            },
            key=po_id,
            headers={"event_type": event_type},
        )

    # ── Lifecycle ─────────────────────────────────────────────

    def flush(self, timeout: float = 10.0) -> int:
        """Flush all pending messages. Returns number of messages still in queue."""
        return self._producer.flush(timeout=timeout)

    def close(self) -> None:
        """Flush and close the producer."""
        remaining = self._producer.flush(timeout=30)
        if remaining > 0:
            log.warning("Producer closed with %d messages still in queue", remaining)
        else:
            log.info("Producer flushed and closed cleanly")

    def __enter__(self) -> "SupplyChainProducer":
        return self

    def __exit__(self, *args: Any) -> None:
        self.close()


# ── Singleton accessor ────────────────────────────────────────

_producer_instance: SupplyChainProducer | None = None


def get_producer() -> SupplyChainProducer:
    """Return the shared singleton producer instance."""
    global _producer_instance
    if _producer_instance is None:
        _producer_instance = SupplyChainProducer()
    return _producer_instance
