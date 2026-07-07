"""
SupplySense API - Procurement Pydantic Schemas
"""

from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field


class SupplierSchema(BaseModel):
    id: uuid.UUID
    code: str
    name: str
    country: str
    region: str | None = None
    category: str
    contact_email: str | None = None
    risk_score: float
    otif_rate: float
    quality_score: float
    esg_score: float
    financial_health: float
    composite_score: float
    lead_time_days: int
    payment_terms: str
    annual_spend: float
    is_active: bool
    is_preferred: bool
    iso_9001: bool
    iso_14001: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class SupplierCreateSchema(BaseModel):
    code: str = Field(min_length=2, max_length=30)
    name: str = Field(min_length=2, max_length=255)
    country: str
    region: str | None = None
    category: str
    sub_category: str | None = None
    contact_name: str | None = None
    contact_email: EmailStr | None = None
    contact_phone: str | None = None
    website: str | None = None
    lead_time_days: int = Field(default=14, ge=1)
    payment_terms: str = "Net 30"
    currency: str = "USD"


class SupplierUpdateSchema(BaseModel):
    name: str | None = None
    contact_email: EmailStr | None = None
    contact_phone: str | None = None
    risk_score: float | None = Field(None, ge=0, le=100)
    otif_rate: float | None = Field(None, ge=0, le=100)
    quality_score: float | None = Field(None, ge=0, le=100)
    esg_score: float | None = Field(None, ge=0, le=100)
    financial_health: float | None = Field(None, ge=0, le=100)
    is_active: bool | None = None
    is_preferred: bool | None = None
    notes: str | None = None


class POLineItemSchema(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    line_number: int
    quantity: int
    unit_price: float
    total_price: float
    received_quantity: int
    quality_check_passed: bool | None = None

    model_config = {"from_attributes": True}


class POLineItemCreateSchema(BaseModel):
    product_id: uuid.UUID
    quantity: int = Field(ge=1)
    unit_price: float = Field(ge=0)


class PurchaseOrderSchema(BaseModel):
    id: uuid.UUID
    po_number: str
    supplier_id: uuid.UUID
    status: str
    total_amount: float
    currency: str
    payment_terms: str
    expected_delivery: date | None = None
    actual_delivery: date | None = None
    notes: str | None = None
    is_ai_generated: bool
    created_at: datetime
    updated_at: datetime
    supplier: SupplierSchema | None = None
    line_items: list[POLineItemSchema] = []

    model_config = {"from_attributes": True}


class POCreateRequest(BaseModel):
    supplier_id: uuid.UUID
    expected_delivery: date | None = None
    payment_terms: str = "Net 30"
    currency: str = "USD"
    notes: str | None = None
    line_items: list[POLineItemCreateSchema] = Field(min_length=1)
    delivery_warehouse_id: uuid.UUID | None = None


class POApproveRequest(BaseModel):
    comment: str | None = None


class PORejectRequest(BaseModel):
    reason: str = Field(min_length=5, max_length=500)


class ContractSchema(BaseModel):
    id: uuid.UUID
    contract_number: str
    supplier_id: uuid.UUID
    title: str
    contract_type: str
    status: str
    value: float
    currency: str
    start_date: date
    end_date: date
    auto_renewal: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class SpendAnalyticsSchema(BaseModel):
    total_spend: float
    by_category: list[dict]
    by_supplier: list[dict]
    by_month: list[dict]
    by_country: list[dict]
    yoy_change_pct: float
    avg_po_value: float
    top_suppliers: list[dict]


class PriceBenchmarkSchema(BaseModel):
    product_id: uuid.UUID
    sku: str
    product_name: str
    our_price: float
    market_avg: float
    market_min: float
    market_max: float
    percentile: float
    savings_opportunity: float
    suppliers: list[dict]
