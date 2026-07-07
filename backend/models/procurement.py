"""
SupplySense API - Procurement SQLAlchemy Models
Suppliers, PurchaseOrders, POLineItems, Contracts
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


class Supplier(Base):
    """
    Supplier master data with multi-dimensional scorecards.
    """

    __tablename__ = "suppliers"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True
    )
    code: Mapped[str] = mapped_column(String(30), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    country: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    region: Mapped[str | None] = mapped_column(String(100), nullable=True)
    category: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    sub_category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    contact_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    contact_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    contact_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    website: Mapped[str | None] = mapped_column(String(500), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Scorecard metrics (0–100 scale)
    risk_score: Mapped[float] = mapped_column(Float, default=50.0, nullable=False)
    otif_rate: Mapped[float] = mapped_column(Float, default=85.0, nullable=False)  # On-Time-In-Full %
    quality_score: Mapped[float] = mapped_column(Float, default=85.0, nullable=False)
    esg_score: Mapped[float] = mapped_column(Float, default=70.0, nullable=False)
    financial_health: Mapped[float] = mapped_column(Float, default=75.0, nullable=False)
    responsiveness_score: Mapped[float] = mapped_column(Float, default=80.0, nullable=False)
    price_competitiveness: Mapped[float] = mapped_column(Float, default=75.0, nullable=False)

    # Certifications
    iso_9001: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    iso_14001: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    iso_27001: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationship
    lead_time_days: Mapped[int] = mapped_column(Integer, default=14, nullable=False)
    payment_terms: Mapped[str] = mapped_column(String(50), default="Net 30", nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="USD", nullable=False)
    annual_spend: Mapped[float] = mapped_column(Numeric(15, 2), default=0.0, nullable=False)
    total_orders: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_preferred: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    purchase_orders: Mapped[list["PurchaseOrder"]] = relationship(
        "PurchaseOrder", back_populates="supplier", lazy="noload"
    )
    contracts: Mapped[list["Contract"]] = relationship(
        "Contract", back_populates="supplier", lazy="noload"
    )

    @property
    def composite_score(self) -> float:
        """Weighted composite scorecard."""
        return round(
            self.otif_rate * 0.25
            + self.quality_score * 0.25
            + (100 - self.risk_score) * 0.20
            + self.esg_score * 0.15
            + self.financial_health * 0.15,
            2,
        )

    def __repr__(self) -> str:
        return f"<Supplier code={self.code} name={self.name} country={self.country}>"


class PurchaseOrder(Base):
    """
    Purchase order header with approval workflow states.
    """

    __tablename__ = "purchase_orders"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True
    )
    po_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    supplier_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("suppliers.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    status: Mapped[str] = mapped_column(
        Enum(
            "draft",
            "pending_approval",
            "approved",
            "rejected",
            "sent",
            "confirmed",
            "partial",
            "received",
            "cancelled",
            name="po_status",
        ),
        default="draft",
        nullable=False,
        index=True,
    )
    total_amount: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False, default=0.0)
    currency: Mapped[str] = mapped_column(String(10), default="USD", nullable=False)
    payment_terms: Mapped[str] = mapped_column(String(50), default="Net 30", nullable=False)
    delivery_warehouse_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    expected_delivery: Mapped[date | None] = mapped_column(Date, nullable=True)
    actual_delivery: Mapped[date | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    approved_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    is_ai_generated: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    agent_run_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    supplier: Mapped["Supplier"] = relationship(
        "Supplier", back_populates="purchase_orders", lazy="noload"
    )
    line_items: Mapped[list["POLineItem"]] = relationship(
        "POLineItem", back_populates="purchase_order", lazy="noload"
    )

    def __repr__(self) -> str:
        return f"<PurchaseOrder po_number={self.po_number} status={self.status}>"


class POLineItem(Base):
    """
    Individual line items within a purchase order.
    """

    __tablename__ = "po_line_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    po_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("purchase_orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id"), nullable=False
    )
    line_number: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[float] = mapped_column(Numeric(12, 4), nullable=False)
    total_price: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False)
    received_quantity: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    quality_check_passed: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    purchase_order: Mapped["PurchaseOrder"] = relationship(
        "PurchaseOrder", back_populates="line_items", lazy="noload"
    )

    def __repr__(self) -> str:
        return f"<POLineItem po={self.po_id} qty={self.quantity}>"


class Contract(Base):
    """
    Supplier contracts with auto-renewal and value tracking.
    """

    __tablename__ = "contracts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True
    )
    contract_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    supplier_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("suppliers.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    contract_type: Mapped[str] = mapped_column(
        Enum("framework", "blanket", "spot", "service", name="contract_type"),
        default="framework",
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        Enum("draft", "active", "expired", "terminated", "renewed", name="contract_status"),
        default="active",
        nullable=False,
        index=True,
    )
    value: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="USD", nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    auto_renewal: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    renewal_notice_days: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    terms_file_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    supplier: Mapped["Supplier"] = relationship(
        "Supplier", back_populates="contracts", lazy="noload"
    )

    def __repr__(self) -> str:
        return f"<Contract {self.contract_number} supplier={self.supplier_id} status={self.status}>"
