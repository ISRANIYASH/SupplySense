"""
SupplySense API - Inventory Pydantic Schemas
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class WarehouseSchema(BaseModel):
    id: uuid.UUID
    code: str
    name: str
    location: str
    city: str
    country: str
    capacity_sqm: float
    current_occupancy_pct: float
    warehouse_type: str
    is_active: bool

    model_config = {"from_attributes": True}


class ProductSchema(BaseModel):
    id: uuid.UUID
    sku: str
    name: str
    description: str | None = None
    category: str
    sub_category: str | None = None
    unit_of_measure: str
    lead_time_days: int
    moq: int
    is_active: bool
    is_hazardous: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ProductCreateSchema(BaseModel):
    sku: str = Field(min_length=2, max_length=50)
    name: str = Field(min_length=2, max_length=255)
    description: str | None = None
    category: str
    sub_category: str | None = None
    unit_of_measure: str = "EACH"
    lead_time_days: int = Field(default=7, ge=0)
    moq: int = Field(default=1, ge=1)
    is_hazardous: bool = False


class InventoryItemSchema(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    warehouse_id: uuid.UUID
    quantity_on_hand: int
    quantity_reserved: int
    quantity_in_transit: int
    reorder_point: int
    safety_stock: int
    max_stock: int
    unit_cost: float
    avg_daily_demand: float
    classification_abc: Literal["A", "B", "C"]
    classification_xyz: Literal["X", "Y", "Z"]
    ai_replenishment_suggested: bool
    ai_suggested_quantity: int | None = None
    ai_suggestion_status: str
    updated_at: datetime
    # Joined fields
    product: ProductSchema | None = None
    warehouse: WarehouseSchema | None = None

    model_config = {"from_attributes": True}


class InventoryUpdateSchema(BaseModel):
    quantity_on_hand: int | None = Field(None, ge=0)
    reorder_point: int | None = Field(None, ge=0)
    safety_stock: int | None = Field(None, ge=0)
    max_stock: int | None = Field(None, ge=0)
    unit_cost: float | None = Field(None, ge=0)


class StockMovementSchema(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    warehouse_id: uuid.UUID
    movement_type: str
    quantity: int
    unit_cost: float | None = None
    reference_type: str | None = None
    reference_id: str | None = None
    notes: str | None = None
    timestamp: datetime

    model_config = {"from_attributes": True}


class StockTransferRequest(BaseModel):
    product_id: uuid.UUID
    from_warehouse_id: uuid.UUID
    to_warehouse_id: uuid.UUID
    quantity: int = Field(ge=1)
    notes: str | None = None


class ReplenishmentRequest(BaseModel):
    inventory_item_id: uuid.UUID
    quantity: int = Field(ge=1)
    priority: Literal["normal", "urgent", "critical"] = "normal"
    notes: str | None = None


class ReplenishmentApprovalRequest(BaseModel):
    action: Literal["approve", "reject"]
    adjusted_quantity: int | None = Field(None, ge=1)
    rejection_reason: str | None = None


class InventorySummarySchema(BaseModel):
    total_skus: int
    total_value: float
    below_reorder_point: int
    out_of_stock: int
    overstock_items: int
    abc_breakdown: dict[str, int]
    xyz_breakdown: dict[str, int]
    top_warehouses: list[dict]
    avg_days_of_stock: float
    total_movements_today: int


class ABCXYZMatrixSchema(BaseModel):
    ax: int
    ay: int
    az: int
    bx: int
    by: int
    bz: int
    cx: int
    cy: int
    cz: int
    items: list[dict]


class SlowMoverSchema(BaseModel):
    product_id: uuid.UUID
    sku: str
    name: str
    warehouse_id: uuid.UUID
    warehouse_name: str
    quantity_on_hand: int
    days_of_stock: float
    avg_daily_demand: float
    last_movement_date: datetime | None
    unit_cost: float
    total_value: float
    classification_abc: str
    classification_xyz: str
