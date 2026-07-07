"""
backend/main.py — SupplySense FastAPI entry point (v3 — all 19 pages connected)
"""
import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

from routers import (
    dashboard, forecast, inventory, suppliers,
    market, procurement, logistics, risk,
    warehouse, analytics, copilot, simulator,
    explainability, mlops, decisions, alerts_router,
    admin, weather, auth
)

app = FastAPI(title="SupplySense API", version="3.0.0",
              description="Real PostgreSQL data powering all 19 SupplySense pages.")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000",
                   "http://localhost:3001", "http://127.0.0.1:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])

# ── Core Data Pages ────────────────────────────────────────────────────────────
app.include_router(dashboard.router,       prefix="/api/dashboard",       tags=["Dashboard"])
app.include_router(forecast.router,        prefix="/api/forecast",        tags=["Forecast"])
app.include_router(inventory.router,       prefix="/api/inventory",       tags=["Inventory"])
app.include_router(suppliers.router,       prefix="/api/suppliers",       tags=["Suppliers"])
app.include_router(market.router,          prefix="/api/market",          tags=["Market"])
app.include_router(procurement.router,     prefix="/api/procurement",     tags=["Procurement"])
app.include_router(logistics.router,       prefix="/api/logistics",       tags=["Logistics"])
app.include_router(risk.router,            prefix="/api/risk",            tags=["Risk"])
app.include_router(warehouse.router,       prefix="/api/warehouse",       tags=["Warehouse"])
app.include_router(analytics.router,       prefix="/api/analytics",       tags=["Analytics"])

# ── AI / Intelligence Pages ────────────────────────────────────────────────────
app.include_router(copilot.router,         prefix="/api/copilot",         tags=["AI Copilot"])
app.include_router(simulator.router,       prefix="/api/simulator",       tags=["Simulator"])
app.include_router(explainability.router,  prefix="/api/explainability",  tags=["Explainability"])
app.include_router(mlops.router,           prefix="/api/mlops",           tags=["MLOps"])
app.include_router(weather.router,         prefix="/api/weather",         tags=["Weather"])

# ── System Pages ───────────────────────────────────────────────────────────────
app.include_router(decisions.router,       prefix="/api/decisions",       tags=["Decisions"])
app.include_router(alerts_router.router,   prefix="/api/alerts",          tags=["Alerts"])
app.include_router(admin.router,           prefix="/api/admin",           tags=["Admin"])


@app.get("/api/health")
def health():
    return {
        "status":  "healthy",
        "version": "3.0.0",
        "pages":   19,
        "routers": 18,
        "database": "PostgreSQL connected"
    }
