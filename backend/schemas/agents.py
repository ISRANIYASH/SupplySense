"""
SupplySense API - Agent Pydantic Schemas
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class AgentStatusSchema(BaseModel):
    """Status of a single AI agent."""

    name: str
    display_name: str
    description: str
    status: Literal["running", "idle", "error", "disabled"]
    last_run: datetime | None = None
    next_run: datetime | None = None
    decisions_pending: int
    decisions_today: int
    success_rate: float
    avg_run_duration_seconds: float | None = None
    is_enabled: bool


class ReasoningStep(BaseModel):
    """Single step in an agent's reasoning chain."""

    step: int
    action: str
    observation: str
    reasoning: str


class DecisionSchema(BaseModel):
    """Full agent decision with reasoning chain."""

    id: uuid.UUID
    agent_name: str
    decision_type: str
    title: str
    recommendation: str
    reasoning_chain: list[ReasoningStep] = []
    confidence: float
    estimated_value: float | None = None
    status: Literal["pending", "approved", "rejected", "auto_approved", "expired"]
    priority: Literal["critical", "high", "medium", "low"]
    requires_human_approval: bool
    approver_id: uuid.UUID | None = None
    approver_comment: str | None = None
    approved_at: datetime | None = None
    rejection_reason: str | None = None
    outcome: str | None = None
    resource_type: str | None = None
    resource_id: str | None = None
    expires_at: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ApprovalRequest(BaseModel):
    comment: str | None = None


class RejectionRequest(BaseModel):
    reason: str = Field(min_length=5, max_length=500)


class TriggerRequest(BaseModel):
    """Manually trigger an agent run."""

    parameters: dict[str, Any] = {}
    priority: Literal["normal", "high"] = "normal"
    reason: str | None = None


class AgentRunSchema(BaseModel):
    id: uuid.UUID
    agent_name: str
    trigger_source: str
    status: str
    start_time: datetime
    end_time: datetime | None = None
    duration_seconds: float | None = None
    decisions_made: int
    alerts_raised: int
    records_processed: int
    error_message: str | None = None

    model_config = {"from_attributes": True}


class ActivityFeedItem(BaseModel):
    """Single item in the agent activity feed."""

    id: str
    agent_name: str
    agent_display_name: str
    action: str
    description: str
    severity: Literal["info", "warning", "success", "error"]
    timestamp: datetime
    resource_type: str | None = None
    resource_id: str | None = None
    decision_id: uuid.UUID | None = None


class AgentPerformanceSchema(BaseModel):
    agent_name: str
    display_name: str
    decisions_made_7d: int
    decisions_approved_7d: int
    decisions_rejected_7d: int
    approval_rate_7d: float
    avg_confidence_7d: float
    value_generated_7d: float
    runs_completed_7d: int
    runs_failed_7d: int
    uptime_pct: float


class DecisionStatsSchema(BaseModel):
    total_decisions: int
    pending: int
    approved: int
    rejected: int
    auto_approved: int
    expired: int
    approval_rate: float
    avg_confidence: float
    total_estimated_value: float
    by_agent: dict[str, dict[str, int]]
    by_type: dict[str, int]
