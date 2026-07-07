"""
SupplySense API - Forecasting Pydantic Schemas
"""

from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class ForecastDataPoint(BaseModel):
    """Single date forecast with prediction intervals."""

    date: date
    predicted: float
    lower_80: float | None = None
    upper_80: float | None = None
    lower_95: float | None = None
    upper_95: float | None = None
    actual: float | None = None
    trend: float | None = None
    seasonal: float | None = None


class ForecastRequest(BaseModel):
    sku: str
    horizon_days: int = Field(default=90, ge=7, le=365)
    model: Literal["prophet", "arima", "lstm", "xgboost", "ensemble", "chronos"] = "ensemble"
    warehouse_id: uuid.UUID | None = None
    confidence_level: Literal[80, 95] = 95


class ForecastResponse(BaseModel):
    sku: str
    product_name: str
    model_used: str
    horizon_days: int
    generated_at: datetime
    mape: float | None = None
    rmse: float | None = None
    mae: float | None = None
    forecast: list[ForecastDataPoint]
    run_id: uuid.UUID | None = None


class ScenarioParameter(BaseModel):
    name: str
    base_value: float
    adjusted_value: float
    unit: str = "%"


class ScenarioRequest(BaseModel):
    sku: str
    horizon_days: int = Field(default=90, ge=7, le=365)
    scenario_name: str = Field(default="Custom Scenario", max_length=100)
    parameters: list[ScenarioParameter]
    base_model: Literal["prophet", "arima", "ensemble"] = "ensemble"


class ScenarioResponse(BaseModel):
    sku: str
    scenario_name: str
    baseline_forecast: list[ForecastDataPoint]
    scenario_forecast: list[ForecastDataPoint]
    impact_summary: dict[str, float]
    generated_at: datetime


class SHAPFeature(BaseModel):
    """SHAP value for a single feature."""

    feature: str
    value: float
    shap_value: float
    impact: Literal["positive", "negative", "neutral"]


class SHAPResponse(BaseModel):
    """SHAP explainability output for a SKU forecast."""

    sku: str
    product_name: str
    base_value: float
    predicted_value: float
    features: list[SHAPFeature]
    explanation: str
    generated_at: datetime


class AccuracyMetricsSchema(BaseModel):
    overall_mape: float
    overall_rmse: float
    overall_mae: float
    overall_bias: float
    coverage_80: float
    coverage_95: float
    by_model: dict[str, dict[str, float]]
    by_category: dict[str, dict[str, float]]
    by_abc_class: dict[str, dict[str, float]]
    trending: list[dict]  # historical MAPE over time


class ForecastHistoryPoint(BaseModel):
    date: date
    sku: str
    predicted: float
    actual: float | None
    error_pct: float | None
    model: str


class ModelInfoSchema(BaseModel):
    name: str
    display_name: str
    description: str
    avg_mape: float
    training_time_seconds: float
    is_champion: bool
    supports_intervals: bool
    best_for: list[str]


class RetrainRequest(BaseModel):
    model_types: list[str] = ["ensemble"]
    skus: list[str] | None = None  # None = all SKUs
    horizon_days: int = Field(default=90, ge=7, le=365)
    notes: str | None = None


class ForecastRunSchema(BaseModel):
    id: uuid.UUID
    model_type: str
    horizon_days: int
    run_date: datetime
    mape: float | None = None
    rmse: float | None = None
    mae: float | None = None
    status: str
    skus_included: int
    duration_seconds: float | None = None

    model_config = {"from_attributes": True}
