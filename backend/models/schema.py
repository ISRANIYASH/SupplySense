from sqlalchemy import Column, String, Integer, Float, Boolean, ForeignKey, DateTime, JSON, Text
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime, timezone

from core.database import Base

def utcnow():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    role = Column(String, default="viewer")
    department = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utcnow)
    last_login = Column(DateTime)

class Material(Base):
    __tablename__ = "materials"
    id = Column(String, primary_key=True, index=True)
    sku = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    category = Column(String)
    abc_class = Column(String(1)) # A, B, C
    xyz_class = Column(String(1)) # X, Y, Z
    unit_of_measure = Column(String)
    unit_cost = Column(Float)
    created_at = Column(DateTime, default=utcnow)
    
    inventory = relationship("Inventory", back_populates="material")
    po_lines = relationship("PurchaseOrderLine", back_populates="material")

class Warehouse(Base):
    __tablename__ = "warehouses"
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    location = Column(String)
    state = Column(String)
    latitude = Column(Float)
    longitude = Column(Float)
    capacity = Column(Float)
    
    inventory = relationship("Inventory", back_populates="warehouse")

class Inventory(Base):
    __tablename__ = "inventory"
    id = Column(String, primary_key=True, index=True)
    material_id = Column(String, ForeignKey("materials.id"))
    warehouse_id = Column(String, ForeignKey("warehouses.id"))
    current_stock = Column(Float, default=0)
    safety_stock = Column(Float, default=0)
    reorder_point = Column(Float, default=0)
    max_stock = Column(Float, default=0)
    last_updated = Column(DateTime, default=utcnow, onupdate=utcnow)

    material = relationship("Material", back_populates="inventory")
    warehouse = relationship("Warehouse", back_populates="inventory")

class InventoryMovement(Base):
    __tablename__ = "inventory_movements"
    id = Column(String, primary_key=True, index=True)
    material_id = Column(String, ForeignKey("materials.id"))
    warehouse_id = Column(String, ForeignKey("warehouses.id"))
    quantity = Column(Float, nullable=False)
    movement_type = Column(String) # IN, OUT, TRANSFER, ADJUSTMENT
    reference_id = Column(String) # PO ID, Transfer ID, etc
    timestamp = Column(DateTime, default=utcnow)

class Supplier(Base):
    __tablename__ = "suppliers"
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    category = Column(String)
    location = Column(String)
    state = Column(String)
    overall_score = Column(Float)
    lead_time_days = Column(Integer)
    on_time_delivery_pct = Column(Float)
    defect_rate_pct = Column(Float)
    status = Column(String) # active, at_risk, blacklisted
    risk_level = Column(String) # low, medium, high
    created_at = Column(DateTime, default=utcnow)

    purchase_orders = relationship("PurchaseOrder", back_populates="supplier")

class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"
    id = Column(String, primary_key=True, index=True)
    po_number = Column(String, unique=True, index=True, nullable=False)
    supplier_id = Column(String, ForeignKey("suppliers.id"))
    status = Column(String) # Pending, Approved, InTransit, Delivered, Cancelled
    total_cost = Column(Float)
    created_at = Column(DateTime, default=utcnow)
    expected_delivery = Column(DateTime)
    actual_delivery = Column(DateTime)
    ai_score = Column(Float) # AI approval confidence score

    supplier = relationship("Supplier", back_populates="purchase_orders")
    lines = relationship("PurchaseOrderLine", back_populates="po")

class PurchaseOrderLine(Base):
    __tablename__ = "purchase_order_lines"
    id = Column(String, primary_key=True, index=True)
    po_id = Column(String, ForeignKey("purchase_orders.id"))
    material_id = Column(String, ForeignKey("materials.id"))
    quantity = Column(Float, nullable=False)
    unit_price = Column(Float, nullable=False)
    
    po = relationship("PurchaseOrder", back_populates="lines")
    material = relationship("Material", back_populates="po_lines")

class Project(Base):
    __tablename__ = "projects"
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    status = Column(String)
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    budget = Column(Float)
    spend = Column(Float)

class DemandHistory(Base):
    __tablename__ = "demand_history"
    id = Column(String, primary_key=True, index=True)
    material_id = Column(String, ForeignKey("materials.id"), index=True)
    date = Column(DateTime, index=True)
    quantity = Column(Float, nullable=False)
    # Exogenous factors can be merged here or kept separate
    weather_impact = Column(Float)
    event_flag = Column(Boolean, default=False)

class ForecastRun(Base):
    __tablename__ = "forecast_runs"
    id = Column(String, primary_key=True, index=True)
    model_name = Column(String) # LSTM, TFT
    model_version = Column(String)
    mape = Column(Float)
    mae = Column(Float)
    rmse = Column(Float)
    run_date = Column(DateTime, default=utcnow)
    status = Column(String) # success, failed
    
    predictions = relationship("ForecastPrediction", back_populates="run")

class ForecastPrediction(Base):
    __tablename__ = "forecast_predictions"
    id = Column(String, primary_key=True, index=True)
    run_id = Column(String, ForeignKey("forecast_runs.id"))
    material_id = Column(String, ForeignKey("materials.id"))
    target_date = Column(DateTime, index=True)
    predicted_quantity = Column(Float)
    lower_bound = Column(Float)
    upper_bound = Column(Float)
    
    run = relationship("ForecastRun", back_populates="predictions")

class AIDecision(Base):
    __tablename__ = "ai_decisions"
    id = Column(String, primary_key=True, index=True)
    timestamp = Column(DateTime, default=utcnow)
    action_type = Column(String) # PO_APPROVAL, REORDER, ROUTING
    entity_id = Column(String) # ID of PO, Material, etc
    reasoning = Column(Text)
    confidence_score = Column(Float)
    shap_features = Column(JSON) # Store top SHAP values driving the decision
    human_status = Column(String) # auto_accepted, user_accepted, user_rejected, pending
    acted_by_user_id = Column(String, ForeignKey("users.id"), nullable=True)

class Alert(Base):
    __tablename__ = "alerts"
    id = Column(String, primary_key=True, index=True)
    type = Column(String)
    severity = Column(String) # CRITICAL, HIGH, MEDIUM, LOW
    title = Column(String)
    description = Column(Text)
    category = Column(String)
    timestamp = Column(DateTime, default=utcnow)
    is_read = Column(Boolean, default=False)
    is_resolved = Column(Boolean, default=False)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"))
    action = Column(String)
    entity_type = Column(String)
    entity_id = Column(String)
    details = Column(JSON)
    timestamp = Column(DateTime, default=utcnow)

class Scenario(Base):
    __tablename__ = "scenarios"
    id = Column(String, primary_key=True, index=True)
    name = Column(String)
    description = Column(Text)
    parameters = Column(JSON) # e.g. {"demand_surge": 1.2, "lead_time_delay": 5}
    results = Column(JSON) # outcome metrics
    created_by = Column(String, ForeignKey("users.id"))
    created_at = Column(DateTime, default=utcnow)

class Conversation(Base):
    __tablename__ = "conversations"
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"))
    title = Column(String)
    started_at = Column(DateTime, default=utcnow)
    messages = Column(JSON) # array of {role: "user"|"ai", content: "..."}
