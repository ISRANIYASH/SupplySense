"""
SupplySense API - MLOps Pydantic Schemas
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class ExperimentSchema(BaseModel):
    experiment_id: str
    name: str
    artifact_location: str
    lifecycle_stage: str
    created_at: datetime | None = None
    run_count: int = 0


class RunMetrics(BaseModel):
    mape: float | None = None
    rmse: float | None = None
    mae: float | None = None
    r_squared: float | None = None
    training_loss: float | None = None
    validation_loss: float | None = None


class ExperimentRunSchema(BaseModel):
    run_id: str
    experiment_id: str
    status: str
    start_time: datetime | None = None
    end_time: datetime | None = None
    duration_seconds: float | None = None
    metrics: RunMetrics
    params: dict[str, str] = {}
    tags: dict[str, str] = {}
    artifact_uri: str | None = None


class ModelVersionSchema(BaseModel):
    id: uuid.UUID
    name: str
    version: str
    model_type: str
    status: Literal["staging", "production", "archived", "failed"]
    is_champion: bool
    mape: float | None = None
    rmse: float | None = None
    artifact_path: str | None = None
    deployed_at: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ModelSchema(BaseModel):
    name: str
    description: str | None = None
    latest_versions: list[ModelVersionSchema] = []
    champion_version: ModelVersionSchema | None = None
    total_versions: int


class PromoteModelRequest(BaseModel):
    version: str
    stage: Literal["staging", "production"]
    comment: str | None = None
    archive_existing: bool = True


class DriftMetric(BaseModel):
    feature: str
    drift_score: float
    is_drifted: bool
    baseline_mean: float | None = None
    current_mean: float | None = None
    p_value: float | None = None


class DriftReport(BaseModel):
    model_name: str
    report_date: datetime
    dataset_drift: bool
    share_drifted_features: float
    features: list[DriftMetric]
    prediction_drift: float | None = None
    recommendation: str


class RetrainJobSchema(BaseModel):
    job_id: str
    model_name: str
    status: Literal["queued", "running", "completed", "failed"]
    triggered_by: str
    triggered_at: datetime
    estimated_duration_minutes: int | None = None
    celery_task_id: str | None = None
