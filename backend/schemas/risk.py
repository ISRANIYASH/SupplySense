"""
SupplySense API - Risk Pydantic Schemas
"""

from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class RiskEventSchema(BaseModel):
    id: uuid.UUID
    title: str
    description: str | None = None
    category: str
    source: str
    probability: float
    impact_usd: float
    severity: Literal["critical", "high", "medium", "low"]
    status: Literal["active", "monitoring", "mitigated", "closed"]
    affected_suppliers: list[str] = []
    affected_skus: list[str] = []
    affected_regions: list[str] = []
    mitigation_plan: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    news_url: str | None = None
    risk_score: float
    created_at: datetime

    model_config = {"from_attributes": True}


class RiskEventCreateSchema(BaseModel):
    title: str = Field(min_length=5, max_length=255)
    description: str | None = None
    category: Literal[
        "geopolitical", "natural_disaster", "supplier_financial",
        "cybersecurity", "regulatory", "logistics",
        "demand_shock", "quality", "labor", "currency",
    ]
    probability: float = Field(ge=0.0, le=1.0)
    impact_usd: float = Field(ge=0.0)
    severity: Literal["critical", "high", "medium", "low"]
    affected_suppliers: list[str] = []
    affected_skus: list[str] = []
    mitigation_plan: str | None = None
    start_date: date | None = None
    end_date: date | None = None


class AlertSchema(BaseModel):
    id: uuid.UUID
    alert_type: str
    severity: Literal["critical", "high", "medium", "low", "info"]
    title: str
    message: str
    source: str
    resource_type: str | None = None
    resource_id: str | None = None
    acknowledged: bool
    acknowledged_at: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class AlertAcknowledgeRequest(BaseModel):
    comment: str | None = None


class HeatmapDataPoint(BaseModel):
    id: str
    title: str
    category: str
    probability: float
    impact_usd: float
    impact_normalized: float  # 0-10 scale
    severity: str
    status: str


class HeatmapResponse(BaseModel):
    items: list[HeatmapDataPoint]
    quadrants: dict[str, int]
    total_expected_impact: float
    critical_count: int
    high_count: int


class MonteCarloRequest(BaseModel):
    simulation_name: str = "Supply Chain Risk Simulation"
    iterations: int = Field(default=10000, ge=1000, le=100000)
    horizon_days: int = Field(default=90, ge=30, le=365)
    disruption_probability: float = Field(default=0.15, ge=0.0, le=1.0)
    demand_volatility: float = Field(default=0.20, ge=0.0, le=1.0)
    supplier_failure_rate: float = Field(default=0.05, ge=0.0, le=1.0)
    logistics_delay_factor: float = Field(default=1.2, ge=1.0, le=3.0)
    currency_volatility: float = Field(default=0.10, ge=0.0, le=1.0)


class MonteCarloResponse(BaseModel):
    simulation_id: uuid.UUID
    simulation_name: str
    iterations: int
    status: str
    p10_impact: float | None = None
    p50_impact: float | None = None
    p90_impact: float | None = None
    expected_impact: float | None = None
    max_impact: float | None = None
    probability_of_disruption: float | None = None
    histogram_data: list[dict] | None = None
    duration_seconds: float | None = None
    created_at: datetime


class RiskSummarySchema(BaseModel):
    total_active_risks: int
    critical_risks: int
    high_risks: int
    medium_risks: int
    low_risks: int
    total_expected_impact_usd: float
    risk_trend: str  # "improving", "stable", "worsening"
    top_categories: list[dict]
    unacknowledged_alerts: int
    recent_alerts: int  # last 24h
