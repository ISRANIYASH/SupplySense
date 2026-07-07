"""
SupplySense API - AI Agents SQLAlchemy Models
AgentDecision, AgentRun — tracks all autonomous AI agent activity
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    Float,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from core.database import Base

# The 8 SupplySense AI Agents
AGENT_NAMES = [
    "demand_sensing",
    "supplier_intelligence",
    "risk_monitoring",
    "inventory_rebalancing",
    "procurement_automation",
    "compliance_check",
    "logistics_optimizer",
    "learning_agent",
]


class AgentRun(Base):
    """
    Execution record for a single agent invocation.
    """

    __tablename__ = "agent_runs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True
    )
    agent_name: Mapped[str] = mapped_column(
        Enum(*AGENT_NAMES, name="agent_name"),
        nullable=False,
        index=True,
    )
    trigger_source: Mapped[str] = mapped_column(
        Enum("scheduled", "manual", "event", name="agent_trigger"),
        default="scheduled",
        nullable=False,
    )
    triggered_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    status: Mapped[str] = mapped_column(
        Enum("running", "completed", "failed", "cancelled", name="agent_run_status"),
        default="running",
        nullable=False,
        index=True,
    )
    start_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
    end_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)
    decisions_made: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    alerts_raised: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    records_processed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    logs: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON log entries
    celery_task_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    parameters: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON run params

    def __repr__(self) -> str:
        return f"<AgentRun agent={self.agent_name} status={self.status} ts={self.start_time}>"


class AgentDecision(Base):
    """
    An autonomous decision made by an AI agent, with human-in-the-loop approval.
    """

    __tablename__ = "agent_decisions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True
    )
    agent_name: Mapped[str] = mapped_column(
        Enum(*AGENT_NAMES, name="agent_name_dec"),
        nullable=False,
        index=True,
    )
    run_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True, index=True
    )
    decision_type: Mapped[str] = mapped_column(
        Enum(
            "replenishment",
            "supplier_switch",
            "risk_alert",
            "price_negotiation",
            "transfer_request",
            "contract_renewal",
            "demand_adjustment",
            "route_optimization",
            "compliance_flag",
            "model_retrain",
            name="decision_type",
        ),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    recommendation: Mapped[str] = mapped_column(Text, nullable=False)
    reasoning_chain: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON array of reasoning steps
    confidence: Mapped[float] = mapped_column(Float, nullable=False)  # 0.0 – 1.0
    estimated_value: Mapped[float | None] = mapped_column(Float, nullable=True)  # USD impact
    status: Mapped[str] = mapped_column(
        Enum("pending", "approved", "rejected", "auto_approved", "expired", name="decision_status"),
        default="pending",
        nullable=False,
        index=True,
    )
    priority: Mapped[str] = mapped_column(
        Enum("critical", "high", "medium", "low", name="decision_priority"),
        default="medium",
        nullable=False,
    )
    requires_human_approval: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    auto_approve_threshold: Mapped[float] = mapped_column(Float, default=0.95, nullable=False)

    # Action taken
    approver_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    approver_comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Outcome tracking
    outcome: Mapped[str | None] = mapped_column(Text, nullable=True)
    actual_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    outcome_recorded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Context references
    resource_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    resource_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    metadata_json: Mapped[str | None] = mapped_column(Text, nullable=True)  # Additional context

    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    def __repr__(self) -> str:
        return f"<AgentDecision agent={self.agent_name} type={self.decision_type} status={self.status}>"


class AgentPerformanceMetric(Base):
    """
    Rolling performance metrics per agent for monitoring dashboards.
    """

    __tablename__ = "agent_performance_metrics"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    agent_name: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    metric_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    decisions_made: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    decisions_approved: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    decisions_rejected: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    decisions_auto_approved: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    avg_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    total_value_generated: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    runs_completed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    runs_failed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    avg_run_duration_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)

    @property
    def approval_rate(self) -> float:
        total = self.decisions_approved + self.decisions_rejected
        if total == 0:
            return 0.0
        return self.decisions_approved / total

    def __repr__(self) -> str:
        return f"<AgentMetric agent={self.agent_name} date={self.metric_date}>"
