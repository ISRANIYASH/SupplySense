"""
SupplySense — Kafka Consumer
============================
High-level consumer for all SupplySense Kafka topics.
Provides typed message handlers, offset management, and dead-letter queue support.

Usage:
    consumer = SupplyChainConsumer(group_id="my-service")
    consumer.consume_demand_signals(handler=my_handler)

    # Or use the async multi-topic consumer:
    consumer.consume_all(
        demand_handler=on_demand,
        inventory_handler=on_inventory,
        alert_handler=on_alert,
    )
"""

from __future__ import annotations

import json
import logging
import os
import signal
import threading
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Callable

from confluent_kafka import Consumer, KafkaError, KafkaException, Message, Producer

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
}

# DLQ topic suffix
DLQ_SUFFIX = ".dlq"

# Type alias for message handlers
MessageHandler = Callable[[dict[str, Any], dict[str, str]], None]


# ── Deserialized Message Wrappers ─────────────────────────────

@dataclass
class ConsumedMessage:
    topic:        str
    partition:    int
    offset:       int
    key:          str | None
    payload:      dict[str, Any]
    headers:      dict[str, str]
    timestamp_ms: int

    @property
    def timestamp(self) -> datetime:
        return datetime.fromtimestamp(self.timestamp_ms / 1000, tz=timezone.utc)


# ── Consumer ─────────────────────────────────────────────────

class SupplyChainConsumer:
    """
    Multi-topic Kafka consumer with:
    - Automatic offset commit on successful processing
    - Dead-letter queue routing on processing failures
    - Graceful shutdown via SIGTERM/SIGINT
    - Per-topic handler dispatch
    - Back-pressure and retry support
    """

    def __init__(
        self,
        group_id:   str = "supplysense-default-group",
        bootstrap_servers: str | None = None,
        auto_offset_reset: str = "earliest",
        max_poll_interval_ms: int = 300_000,
        config_overrides: dict[str, Any] | None = None,
    ) -> None:
        servers = bootstrap_servers or os.getenv(
            "KAFKA_BOOTSTRAP_SERVERS", "kafka:9092"
        )
        self._group_id = group_id
        self._running  = True

        config: dict[str, Any] = {
            "bootstrap.servers":            servers,
            "group.id":                     group_id,
            "auto.offset.reset":            auto_offset_reset,
            "enable.auto.commit":           False,   # Manual commit for at-least-once
            "max.poll.interval.ms":         max_poll_interval_ms,
            "session.timeout.ms":           30_000,
            "heartbeat.interval.ms":        10_000,
            "fetch.min.bytes":              1,
            "fetch.max.wait.ms":            500,
            "max.partition.fetch.bytes":    1_048_576,
        }

        if config_overrides:
            config.update(config_overrides)

        # TLS/SASL if configured
        if os.getenv("KAFKA_SECURITY_PROTOCOL"):
            config["security.protocol"]  = os.getenv("KAFKA_SECURITY_PROTOCOL", "PLAINTEXT")
            config["sasl.mechanism"]      = os.getenv("KAFKA_SASL_MECHANISM", "PLAIN")
            config["sasl.username"]       = os.getenv("KAFKA_SASL_USERNAME", "")
            config["sasl.password"]       = os.getenv("KAFKA_SASL_PASSWORD", "")

        self._consumer = Consumer(config)

        # DLQ producer for failed messages
        self._dlq_producer = Producer({
            "bootstrap.servers":  servers,
            "client.id":          f"dlq-producer-{group_id}",
            "acks":               "1",
            "retries":            3,
        })

        # Graceful shutdown
        signal.signal(signal.SIGTERM, self._shutdown_handler)
        signal.signal(signal.SIGINT,  self._shutdown_handler)

        log.info("SupplyChainConsumer initialised: group=%s servers=%s", group_id, servers)

    # ── Internal helpers ──────────────────────────────────────

    def _shutdown_handler(self, signum: int, frame: Any) -> None:
        log.info("Shutdown signal received (%d) — stopping consumer...", signum)
        self._running = False

    def _decode_message(self, msg: Message) -> ConsumedMessage | None:
        """Decode a Kafka message to a ConsumedMessage dataclass."""
        try:
            raw_value = msg.value()
            if raw_value is None:
                return None
            payload = json.loads(raw_value.decode("utf-8"))

            raw_key = msg.key()
            key = raw_key.decode("utf-8") if raw_key else None

            headers: dict[str, str] = {}
            if msg.headers():
                for k, v in msg.headers():
                    if v is not None:
                        headers[k] = v.decode("utf-8")

            ts_type, ts_val = msg.timestamp()
            return ConsumedMessage(
                topic=msg.topic(),
                partition=msg.partition(),
                offset=msg.offset(),
                key=key,
                payload=payload,
                headers=headers,
                timestamp_ms=ts_val if ts_val > 0 else int(time.time() * 1000),
            )
        except (json.JSONDecodeError, UnicodeDecodeError) as e:
            log.error("Failed to decode message: %s", e)
            return None

    def _send_to_dlq(self, msg: Message, error: Exception) -> None:
        """Route a failed message to the dead-letter queue topic."""
        dlq_topic = msg.topic() + DLQ_SUFFIX
        dlq_payload = {
            "original_topic":   msg.topic(),
            "original_partition": msg.partition(),
            "original_offset":  msg.offset(),
            "error":            str(error),
            "error_type":       type(error).__name__,
            "failed_at":        datetime.now(timezone.utc).isoformat(),
            "group_id":         self._group_id,
            "original_value":   msg.value().decode("utf-8", errors="replace") if msg.value() else None,
        }
        try:
            self._dlq_producer.produce(
                topic=dlq_topic,
                key=msg.key(),
                value=json.dumps(dlq_payload).encode("utf-8"),
            )
            self._dlq_producer.poll(0)
            log.warning("Message sent to DLQ: %s (offset=%d)", dlq_topic, msg.offset())
        except Exception as dlq_err:
            log.error("Failed to send to DLQ: %s", dlq_err)

    def _run_consumer_loop(
        self,
        topics:  list[str],
        handler: MessageHandler,
        poll_timeout: float = 1.0,
        max_retries: int = 3,
    ) -> None:
        """Core polling loop. Commits only after successful handler invocation."""
        self._consumer.subscribe(
            topics,
            on_assign=lambda c, ps: log.info(
                "Assigned partitions: %s", [(p.topic, p.partition) for p in ps]
            ),
            on_revoke=lambda c, ps: log.info(
                "Revoked partitions: %s", [(p.topic, p.partition) for p in ps]
            ),
        )
        log.info("Subscribed to topics: %s", topics)

        while self._running:
            msg = self._consumer.poll(poll_timeout)

            if msg is None:
                continue

            if msg.error():
                if msg.error().code() == KafkaError._PARTITION_EOF:
                    log.debug("Reached end of partition %s[%d]", msg.topic(), msg.partition())
                else:
                    log.error("Consumer error: %s", msg.error())
                continue

            decoded = self._decode_message(msg)
            if decoded is None:
                self._consumer.commit(message=msg)
                continue

            success = False
            for attempt in range(max_retries):
                try:
                    handler(decoded.payload, decoded.headers)
                    success = True
                    break
                except Exception as e:
                    log.warning(
                        "Handler error (attempt %d/%d) [%s offset=%d]: %s",
                        attempt + 1, max_retries, msg.topic(), msg.offset(), e,
                    )
                    if attempt < max_retries - 1:
                        time.sleep(2 ** attempt)  # Exponential backoff

            if not success:
                self._send_to_dlq(msg, RuntimeError(f"Handler failed after {max_retries} attempts"))

            self._consumer.commit(message=msg)

    # ── Public API ────────────────────────────────────────────

    def consume_demand_signals(
        self,
        handler:       MessageHandler,
        poll_timeout:  float = 1.0,
        max_retries:   int = 3,
    ) -> None:
        """
        Consume demand signal events.

        Args:
            handler:      Callable(payload: dict, headers: dict) → None
                          Called for each demand signal message.
            poll_timeout: Seconds to wait for a message per poll.
            max_retries:  Number of handler retry attempts before DLQ.

        Blocks until stopped.
        """
        self._run_consumer_loop(
            topics=[TOPICS["demand_signals"]],
            handler=handler,
            poll_timeout=poll_timeout,
            max_retries=max_retries,
        )

    def consume_inventory_events(
        self,
        handler:       MessageHandler,
        poll_timeout:  float = 1.0,
        max_retries:   int = 3,
    ) -> None:
        """
        Consume inventory events (SALE, RECEIPT, TRANSFER, ADJUSTMENT, RETURN).

        Args:
            handler:      Callable(payload: dict, headers: dict) → None
            poll_timeout: Seconds to wait per poll.
            max_retries:  Retry attempts before DLQ routing.

        Blocks until stopped.
        """
        self._run_consumer_loop(
            topics=[TOPICS["inventory_events"]],
            handler=handler,
            poll_timeout=poll_timeout,
            max_retries=max_retries,
        )

    def consume_supplier_events(
        self,
        handler:       MessageHandler,
        poll_timeout:  float = 1.0,
        max_retries:   int = 3,
    ) -> None:
        """
        Consume supplier status events.

        Args:
            handler:      Callable(payload: dict, headers: dict) → None
            poll_timeout: Seconds per poll.
            max_retries:  Retry attempts before DLQ routing.

        Blocks until stopped.
        """
        self._run_consumer_loop(
            topics=[TOPICS["supplier_events"]],
            handler=handler,
            poll_timeout=poll_timeout,
            max_retries=max_retries,
        )

    def consume_risk_alerts(
        self,
        handler:       MessageHandler,
        poll_timeout:  float = 0.5,
        max_retries:   int = 5,
    ) -> None:
        """
        Consume risk alerts (higher priority — shorter poll timeout).

        Args:
            handler:      Callable(payload: dict, headers: dict) → None
            poll_timeout: Seconds per poll (default 0.5 for faster response).
            max_retries:  Retry attempts before DLQ routing.

        Blocks until stopped.
        """
        self._run_consumer_loop(
            topics=[TOPICS["risk_alerts"]],
            handler=handler,
            poll_timeout=poll_timeout,
            max_retries=max_retries,
        )

    def consume_agent_decisions(
        self,
        handler:       MessageHandler,
        poll_timeout:  float = 1.0,
        max_retries:   int = 3,
    ) -> None:
        """
        Consume AI agent decision records for audit/approval workflows.

        Args:
            handler:      Callable(payload: dict, headers: dict) → None
            poll_timeout: Seconds per poll.
            max_retries:  Retry attempts before DLQ routing.

        Blocks until stopped.
        """
        self._run_consumer_loop(
            topics=[TOPICS["agent_decisions"]],
            handler=handler,
            poll_timeout=poll_timeout,
            max_retries=max_retries,
        )

    def consume_all(
        self,
        demand_handler:    MessageHandler | None = None,
        inventory_handler: MessageHandler | None = None,
        supplier_handler:  MessageHandler | None = None,
        alert_handler:     MessageHandler | None = None,
        decision_handler:  MessageHandler | None = None,
        po_handler:        MessageHandler | None = None,
        forecast_handler:  MessageHandler | None = None,
        poll_timeout:      float = 1.0,
        max_retries:       int = 3,
    ) -> None:
        """
        Consume from all configured topics in a single consumer loop.
        Routes messages to the appropriate handler based on topic.

        Args:
            demand_handler:    Handler for demand signals
            inventory_handler: Handler for inventory events
            supplier_handler:  Handler for supplier events
            alert_handler:     Handler for risk alerts
            decision_handler:  Handler for agent decisions
            po_handler:        Handler for PO events
            forecast_handler:  Handler for forecast updates
            poll_timeout:      Seconds per poll
            max_retries:       Retry attempts per handler

        Blocks until stopped.
        """
        topic_handler_map: dict[str, MessageHandler] = {}

        if demand_handler:    topic_handler_map[TOPICS["demand_signals"]]   = demand_handler
        if inventory_handler: topic_handler_map[TOPICS["inventory_events"]] = inventory_handler
        if supplier_handler:  topic_handler_map[TOPICS["supplier_events"]]  = supplier_handler
        if alert_handler:     topic_handler_map[TOPICS["risk_alerts"]]      = alert_handler
        if decision_handler:  topic_handler_map[TOPICS["agent_decisions"]]  = decision_handler
        if po_handler:        topic_handler_map[TOPICS["po_events"]]        = po_handler
        if forecast_handler:  topic_handler_map[TOPICS["forecast_updates"]] = forecast_handler

        if not topic_handler_map:
            log.warning("No handlers registered — nothing to consume")
            return

        def dispatch_handler(payload: dict[str, Any], headers: dict[str, str]) -> None:
            # Headers don't carry topic; routing handled inside loop below
            pass

        active_topics = list(topic_handler_map.keys())
        self._consumer.subscribe(
            active_topics,
            on_assign=lambda c, ps: log.info(
                "Assigned: %s", [(p.topic, p.partition) for p in ps]
            ),
        )
        log.info("Multi-topic consumer subscribed: %s", active_topics)

        while self._running:
            msg = self._consumer.poll(poll_timeout)

            if msg is None:
                continue
            if msg.error():
                if msg.error().code() != KafkaError._PARTITION_EOF:
                    log.error("Consumer error: %s", msg.error())
                continue

            decoded = self._decode_message(msg)
            if decoded is None:
                self._consumer.commit(message=msg)
                continue

            handler = topic_handler_map.get(msg.topic())
            if handler is None:
                log.warning("No handler for topic: %s", msg.topic())
                self._consumer.commit(message=msg)
                continue

            success = False
            for attempt in range(max_retries):
                try:
                    handler(decoded.payload, decoded.headers)
                    success = True
                    break
                except Exception as e:
                    log.warning("Handler error (attempt %d/%d): %s", attempt + 1, max_retries, e)
                    if attempt < max_retries - 1:
                        time.sleep(2 ** attempt)

            if not success:
                self._send_to_dlq(msg, RuntimeError("Handler failed"))

            self._consumer.commit(message=msg)

    def in_thread(
        self,
        topics:      list[str],
        handler:     MessageHandler,
        daemon:      bool = True,
        max_retries: int = 3,
    ) -> threading.Thread:
        """
        Run the consumer in a background thread.
        Useful for integrating with async frameworks.

        Returns the started thread.
        """
        def run() -> None:
            self._run_consumer_loop(topics, handler, max_retries=max_retries)

        t = threading.Thread(target=run, daemon=daemon)
        t.start()
        return t

    # ── Lifecycle ─────────────────────────────────────────────

    def stop(self) -> None:
        """Signal the consumer loop to stop gracefully."""
        self._running = False

    def close(self) -> None:
        """Stop and close the consumer."""
        self._running = False
        self._consumer.close()
        self._dlq_producer.flush(timeout=5)
        log.info("SupplyChainConsumer closed")

    def __enter__(self) -> "SupplyChainConsumer":
        return self

    def __exit__(self, *args: Any) -> None:
        self.close()
