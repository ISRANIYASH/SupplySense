"""
SupplySense API - Forecasting SQLAlchemy Models
ForecastRun, ForecastItem, ModelRegistry
"""

from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from core.database import Base


class ForecastRun(Base):
    """
    A single forecast execution with metadata and accuracy metrics.
    """

    __tablename__ = "forecast_runs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True
    )
    model_type: Mapped[str] = mapped_column(
        Enum(
            "prophet",
            "arima",
            "lstm",
            "xgboost",
            "ensemble",
            "chronos",
            name="model_type",
        ),
        nullable=False,
        index=True,
    )
    run_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    horizon_days: Mapped[int] = mapped_column(Integer, nullable=False, default=90)
    run_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
    # Accuracy metrics
    mape: Mapped[float | None] = mapped_column(Float, nullable=True)   # Mean Absolute Percentage Error
    rmse: Mapped[float | None] = mapped_column(Float, nullable=True)   # Root Mean Squared Error
    mae: Mapped[float | None] = mapped_column(Float, nullable=True)    # Mean Absolute Error
    bias: Mapped[float | None] = mapped_column(Float, nullable=True)   # Forecast bias
    coverage_80: Mapped[float | None] = mapped_column(Float, nullable=True)  # 80% PI coverage
    coverage_95: Mapped[float | None] = mapped_column(Float, nullable=True)  # 95% PI coverage
    status: Mapped[str] = mapped_column(
        Enum("running", "completed", "failed", "cancelled", name="run_status"),
        default="running",
        nullable=False,
        index=True,
    )
    triggered_by: Mapped[str] = mapped_column(
        Enum("scheduled", "manual", "agent", name="trigger_source"),
        default="scheduled",
        nullable=False,
    )
    triggered_by_user: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    mlflow_run_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    artifact_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    parameters: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON
    skus_included: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    duration_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    forecast_items: Mapped[list["ForecastItem"]] = relationship(
        "ForecastItem", back_populates="run", lazy="noload"
    )

    def __repr__(self) -> str:
        return f"<ForecastRun model={self.model_type} status={self.status} mape={self.mape}>"


class ForecastItem(Base):
    """
    Per-SKU, per-day forecast data point with prediction intervals.
    """

    __tablename__ = "forecast_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    run_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("forecast_runs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    warehouse_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    forecast_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    predicted_quantity: Mapped[float] = mapped_column(Float, nullable=False)
    lower_bound_80: Mapped[float | None] = mapped_column(Float, nullable=True)
    upper_bound_80: Mapped[float | None] = mapped_column(Float, nullable=True)
    lower_bound_95: Mapped[float | None] = mapped_column(Float, nullable=True)
    upper_bound_95: Mapped[float | None] = mapped_column(Float, nullable=True)
    actual_quantity: Mapped[float | None] = mapped_column(Float, nullable=True)
    # SHAP values stored as JSON string
    shap_values: Mapped[str | None] = mapped_column(Text, nullable=True)
    trend_component: Mapped[float | None] = mapped_column(Float, nullable=True)
    seasonal_component: Mapped[float | None] = mapped_column(Float, nullable=True)
    residual_component: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Relationships
    run: Mapped["ForecastRun"] = relationship(
        "ForecastRun", back_populates="forecast_items", lazy="noload"
    )

    def __repr__(self) -> str:
        return f"<ForecastItem product={self.product_id} date={self.forecast_date} qty={self.predicted_quantity}>"


class ModelRegistry(Base):
    """
    ML model registry tracking versions, performance, and deployment.
    """

    __tablename__ = "model_registry"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    version: Mapped[str] = mapped_column(String(20), nullable=False)
    model_type: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Performance metrics
    mape: Mapped[float | None] = mapped_column(Float, nullable=True)
    rmse: Mapped[float | None] = mapped_column(Float, nullable=True)
    mae: Mapped[float | None] = mapped_column(Float, nullable=True)
    r_squared: Mapped[float | None] = mapped_column(Float, nullable=True)
    training_samples: Mapped[int | None] = mapped_column(Integer, nullable=True)
    validation_samples: Mapped[int | None] = mapped_column(Integer, nullable=True)
    training_duration_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Registry status
    status: Mapped[str] = mapped_column(
        Enum("staging", "production", "archived", "failed", name="model_status"),
        default="staging",
        nullable=False,
        index=True,
    )
    is_champion: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # MLflow integration
    mlflow_experiment_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    mlflow_run_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    artifact_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    parameters: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON hyperparameters
    feature_names: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON list

    deployed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    deployed_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    retired_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    def __repr__(self) -> str:
        return f"<ModelRegistry name={self.name} v={self.version} status={self.status}>"
