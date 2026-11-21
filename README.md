# SupplySense AI 🧠⚡

> **Autonomous AI-Driven Supply Chain Operating System & Decision Intelligence Platform**  
> Empowering enterprise operations with autonomous multi-agent intelligence, multi-tier supply chain visibility, predictive demand modeling, and real-time inventory rebalancing.

[![Live Frontend](https://img.shields.io/badge/Vercel-Live%20Frontend-black?logo=vercel)](https://supply-sense-eta-six.vercel.app)
[![Live Backend](https://img.shields.io/badge/Render-Live%20API-46E3B7?logo=render)](https://supplysense-09a0.onrender.com/api/health)
[![Database](https://img.shields.io/badge/Neon-Serverless%20Postgres-00E599?logo=postgresql)](https://neon.tech)
[![Next.js](https://img.shields.io/badge/Next.js-15.5-black?logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-3.0.0-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

---

## 🌟 Overview

SupplySense is a modern full-stack Supply Chain Operating System designed to replace traditional, static, and reactive ERP dashboards. By unifying historical transaction records, supplier scores, and geographical logistics data with deep learning (Temporal Fusion Transformer & PyTorch LSTM) and a multi-agent autonomous framework (CrewAI), SupplySense anticipates demand fluctuations, identifies supply chain bottlenecks, and prescribes automated rebalancing and procurement decisions.

### Live Deployments:
- **Production Web Application:** [https://supply-sense-eta-six.vercel.app](https://supply-sense-eta-six.vercel.app)
- **FastAPI Backend & Health API:** [https://supplysense-09a0.onrender.com/api/health](https://supplysense-09a0.onrender.com/api/health)
- **Interactive OpenAPI Docs:** [https://supplysense-09a0.onrender.com/docs](https://supplysense-09a0.onrender.com/docs)

---

## 🤖 The 8 Autonomous AI Agents

SupplySense utilizes an autonomous multi-agent architecture where 8 specialized CrewAI agents collaborate across a **Sense → Evaluate → Optimize → Act → Learn** lifecycle:

| # | Agent Name | Core Role | Algorithmic Foundation | Primary Action / Output |
|:---:|---|---|---|---|
| **1** | **Demand Sensing Agent** | Multi-Horizon Forecaster | Temporal Fusion Transformer (TFT), PyTorch LSTM, Statistical Process Control | Quantile demand curves ($p_{10}, p_{50}, p_{90}$), surge/stockout alerts |
| **2** | **Supplier Intelligence Agent** | Vendor Risk Evaluator | Multi-Criteria Decision Making (MCDM), Weighted Scoring Matrix | Supplier risk score ($0-100$), alternate vendor recommendations |
| **3** | **Risk Monitoring Agent** | Disruption Forecaster | Bayesian Risk Aggregation, FMEA Disruption Impact Modeling | Expected Financial Loss ($\text{EFL}$), weather & port emergency alerts |
| **4** | **Auto-Procurement Agent** | Autonomous Purchasing | Economic Order Quantity (EOQ), OR-Tools MILP Cost Minimization | Automated Purchase Orders (POs), supplier volume discount allocation |
| **5** | **Inventory Rebalancing Agent** | Network Stock Balancer | Multi-Echelon Inventory Optimization (MEIO), Network Flow Simplex | Dynamic Safety Stock, inter-warehouse inventory transfer orders |
| **6** | **Logistics & Route Optimizer** | Transportation Controller | Vehicle Routing Problem with Time Windows (VRPTW), Graph Shortest Path | Dynamic shipment rerouting, carrier SLA selection, ETA predictions |
| **7** | **Compliance & ESG Agent** | Regulatory & Ethics Auditor | GHG Protocol Scope 3 Carbon Accounting, ISO 28000 Compliance Auditing | Supplier ESG scorecards, carbon footprint tracking, compliance alerts |
| **8** | **Self-Learning MLOps Agent** | Continuous Model Improver | Statistical Drift Detection (PSI / KS tests), Champion/Challenger A/B Testing | Model health metrics, automated PyTorch retraining, zero-downtime promotion |

---

## 📊 Core Application Modules

The application is structured into 5 core navigation domains comprising 16 functional modules:

### 1. Overview
- **Dashboard (`/`):** Real-time command center displaying total orders, SKU counts, service level metrics, and macro demand trends.
- **Demand Prediction (`/forecast`):** Deep learning time-series forecasting with category, region, and horizon filtering.
- **Inventory Management (`/inventory`):** Stock health ratios, ABC analysis, low-stock alerts, and dynamic SKU catalog management.

### 2. Management
- **Purchase Management (`/procurement`):** Spend breakdowns, delivery status analysis, and automated purchase order flows.
- **Supplier Management (`/suppliers`):** Vendor performance scorecards, risk grading, and quality/service evaluations.
- **Delivery Tracking (`/logistics`):** Carrier reliability metrics, transit delay distributions, and shipment corridor tracking.
- **Warehouse Management (`/warehouse`):** Storage utilization, automated inter-hub transfer recommendations, and real-time SKU bin matrix.

### 3. Insights
- **Market Trends (`/market`):** Raw material and commodity price monitoring with automated AI buy/hold/reduce signals.
- **Weather Updates (`/weather`):** Weather condition impact assessments and seasonal correlation modeling.
- **Risk Alerts (`/risk`):** Semicircle risk gauge, probability-impact risk matrix, and critical supplier alerts.

### 4. Tools & Intelligence
- **AI Assistant (`/copilot`):** Natural language conversational copilot querying live PostgreSQL datasets.
- **What-if Analysis (`/simulator`):** Parametric scenario modeling for stress-testing demand, lead-time, and price disruptions.
- **Prediction Explanation (`/explainability`):** SHAP (SHapley Additive exPlanations) feature importance weights and decision traces.
- **Model Performance (`/mlops`):** Pipeline DAG execution status, experiment runs, and model registry metrics.
- **Activity History (`/decisions`):** Comprehensive operational decision log and audit trails.
- **Reports & Analytics (`/analytics`):** Statistical describe summaries, 20-bin Pandas/SciPy demand distributions, and Z-score outlier detection.

### 5. System
- **Alert Center (`/alerts`):** Active alerts categorized by severity (Critical, High, Medium, Low).
- **Admin Center (`/admin`):** Live service health checks, database table row counts, and system diagnostic telemetry.

---

## 🏗️ Monorepo Architecture

```
supplysense/
├── frontend/             # Next.js 15 (App Router), React 18, TypeScript, Tailwind CSS
│   ├── src/
│   │   ├── app/          # Dashboard routes and API routes
│   │   ├── components/   # UI components, layout, maps, charts
│   │   └── lib/          # API client, Redux store, auth, permissions
├── backend/              # FastAPI Python backend (19 routers, SQLAlchemy, Pydantic)
│   ├── routers/          # Modular API routers for each operational domain
│   ├── models/           # SQLAlchemy database models
│   ├── schemas/          # Pydantic data validation schemas
│   └── main.py           # ASGI application entry point
├── agents/               # CrewAI multi-agent definitions and orchestrator
├── ml/                   # Machine learning training pipelines (PyTorch LSTM, TFT)
├── models/               # Serialized neural network weights & scaler checkpoints
├── datasets/             # Processed datasets and commodity tracking data
├── scripts/              # Database migration, seeding, and health audit scripts
├── docker-compose.yml    # Isolated PostgreSQL development environment
├── package.json          # Monorepo orchestration (Turborepo & pnpm)
└── turbo.json            # Pipeline build caching and task dependencies
```

---

## 🛠️ Technology Stack

- **Frontend:** Next.js 15.5, React 18, TypeScript, Tailwind CSS, Framer Motion, Recharts, Lucide Icons, Leaflet Maps
- **State Management & Auth:** Redux Toolkit, NextAuth.js with JWT session persistence & Role-Based Access Control (RBAC)
- **Backend API:** FastAPI, Uvicorn, SQLAlchemy, Pydantic v2
- **Database:** PostgreSQL 16 (Neon Serverless PostgreSQL in production, Docker for local development)
- **Machine Learning & Analytics:** PyTorch, PyTorch Forecasting, Pandas, NumPy, SciPy, Scikit-learn, SHAP
- **Multi-Agent AI:** CrewAI, LangChain
- **Monorepo Tooling:** pnpm Workspaces, Turborepo

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) >= 20.0
- [pnpm](https://pnpm.io/) >= 9.0
- [Python](https://www.python.org/) >= 3.11
- [Docker Desktop](https://www.docker.com/) (optional, for local PostgreSQL)

### 1. Clone the Repository
```bash
git clone https://github.com/Yashisrani99/SupplySense.git
cd SupplySense
```

### 2. Environment Configuration
Create a `.env` file from the provided `.env.example`:
```bash
cp .env.example .env
```
Ensure your `DATABASE_URL` and `NEXT_PUBLIC_API_URL` are configured:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/supplysense
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXTAUTH_SECRET=your-secure-random-secret
NEXTAUTH_URL=http://localhost:3000
```

### 3. Install Dependencies
```bash
pnpm install
pip install -r backend/requirements.txt
```

### 4. Database Setup
To initialize tables and seed production reference data:
```bash
python scripts/setup_postgres_schema.py
python scripts/seed_production_data.py
```

### 5. Run the Application
Launch both the frontend and FastAPI backend concurrently:
```bash
pnpm dev
```
- **Frontend Dashboard:** [http://localhost:3000](http://localhost:3000)
- **Backend API:** [http://localhost:8000](http://localhost:8000)
- **Interactive Swagger Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 🔐 Default Access Accounts

For development and evaluation, the following pre-configured demo roles are available:

| Role | Email | Password | Permissions |
|------|-------|----------|-------------|
| **Super Admin** | `admin@supplysense.ai` | `admin123` | Full administrative and approval permissions across all modules |
| **Procurement Manager** | `procurement@supplysense.ai` | `procurement123` | Purchase order management, supplier evaluations, spend approvals |
| **Warehouse Manager** | `warehouse@supplysense.ai` | `warehouse123` | Inventory rebalancing, safety stock tuning, warehouse grid inspection |
| **Forecast Analyst** | `forecast@supplysense.ai` | `forecast123` | TFT demand prediction, model metrics, scenario simulation |
| **Viewer** | `viewer@supplysense.ai` | `viewer123` | Read-only access across all 16 operational modules |

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](./LICENSE) file for details.
