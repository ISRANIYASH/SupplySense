"""
SupplySense API - Inventory SQLAlchemy Models
Products, Warehouses, InventoryItems, StockMovements
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
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


class Product(Base):
    """
    Master product catalog record.
    """

    __tablename__ = "products"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True
    )
    sku: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    sub_category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    unit_of_measure: Mapped[str] = mapped_column(String(20), nullable=False, default="EACH")
    weight_kg: Mapped[float | None] = mapped_column(Float, nullable=True)
    volume_m3: Mapped[float | None] = mapped_column(Float, nullable=True)
    shelf_life_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_hazardous: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    barcode: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    supplier_sku: Mapped[str | None] = mapped_column(String(100), nullable=True)
    lead_time_days: Mapped[int] = mapped_column(Integer, default=7, nullable=False)
    moq: Mapped[int] = mapped_column(Integer, default=1, nullable=False)  # minimum order qty
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    inventory_items: Mapped[list["InventoryItem"]] = relationship(
        "InventoryItem", back_populates="product", lazy="noload"
    )

    def __repr__(self) -> str:
        return f"<Product sku={self.sku} name={self.name}>"


class Warehouse(Base):
    """
    Distribution center / warehouse.
    """

    __tablename__ = "warehouses"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True
    )
    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    location: Mapped[str] = mapped_column(String(255), nullable=False)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    country: Mapped[str] = mapped_column(String(100), nullable=False)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    capacity_sqm: Mapped[float] = mapped_column(Float, nullable=False)
    current_occupancy_pct: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    manager_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    warehouse_type: Mapped[str] = mapped_column(
        Enum("distribution", "fulfillment", "cold_storage", "bonded", name="warehouse_type"),
        default="distribution",
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    inventory_items: Mapped[list["InventoryItem"]] = relationship(
        "InventoryItem", back_populates="warehouse", lazy="noload"
    )

    def __repr__(self) -> str:
        return f"<Warehouse code={self.code} city={self.city}>"


class InventoryItem(Base):
    """
    Stock position for a product at a specific warehouse.
    Includes AI classifications and replenishment parameters.
    """

    __tablename__ = "inventory_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    warehouse_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("warehouses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    quantity_on_hand: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    quantity_reserved: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    quantity_in_transit: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    reorder_point: Mapped[int] = mapped_column(Integer, nullable=False, default=100)
    safety_stock: Mapped[int] = mapped_column(Integer, nullable=False, default=50)
    max_stock: Mapped[int] = mapped_column(Integer, nullable=False, default=1000)
    unit_cost: Mapped[float] = mapped_column(Numeric(12, 4), nullable=False, default=0.0)
    avg_daily_demand: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    demand_variability: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    # ABC classification: A = high value, B = medium, C = low value
    classification_abc: Mapped[str] = mapped_column(
        Enum("A", "B", "C", name="abc_class"), default="C", nullable=False
    )
    # XYZ classification: X = stable demand, Y = variable, Z = irregular
    classification_xyz: Mapped[str] = mapped_column(
        Enum("X", "Y", "Z", name="xyz_class"), default="Y", nullable=False
    )
    last_replenishment_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    next_replenishment_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    ai_replenishment_suggested: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    ai_suggested_quantity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    ai_suggestion_status: Mapped[str] = mapped_column(
        Enum("pending", "approved", "rejected", "applied", name="suggestion_status"),
        default="pending",
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    product: Mapped["Product"] = relationship("Product", back_populates="inventory_items", lazy="noload")
    warehouse: Mapped["Warehouse"] = relationship(
        "Warehouse", back_populates="inventory_items", lazy="noload"
    )

    @property
    def available_quantity(self) -> int:
        return self.quantity_on_hand - self.quantity_reserved

    @property
    def is_below_reorder_point(self) -> bool:
        return self.quantity_on_hand <= self.reorder_point

    @property
    def days_of_stock(self) -> float:
        if self.avg_daily_demand <= 0:
            return float("inf")
        return self.quantity_on_hand / self.avg_daily_demand

    def __repr__(self) -> str:
        return f"<InventoryItem product={self.product_id} warehouse={self.warehouse_id} qty={self.quantity_on_hand}>"


class StockMovement(Base):
    """
    Ledger of all stock in/out movements for full traceability.
    """

    __tablename__ = "stock_movements"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id"), nullable=False, index=True
    )
    warehouse_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("warehouses.id"), nullable=False, index=True
    )
    movement_type: Mapped[str] = mapped_column(
        Enum(
            "receipt",
            "shipment",
            "transfer_in",
            "transfer_out",
            "adjustment",
            "return",
            "write_off",
            "cycle_count",
            name="movement_type",
        ),
        nullable=False,
        index=True,
    )
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_cost: Mapped[float | None] = mapped_column(Numeric(12, 4), nullable=True)
    reference_type: Mapped[str | None] = mapped_column(String(50), nullable=True)  # PO, SO, etc.
    reference_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    performed_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    batch_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    expiry_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )

    def __repr__(self) -> str:
        return f"<StockMovement type={self.movement_type} qty={self.quantity} ts={self.timestamp}>"
