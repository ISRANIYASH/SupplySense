<<<<<<< HEAD
# SupplySense 🧠⚡

> **Autonomous AI Supply Chain Operating System** — Observe → Forecast → Analyze → Decide → Recommend → Act → Monitor → Learn → Retrain

SupplySense is an enterprise-grade AI-powered Supply Chain OS that combines capabilities of Amazon Supply Chain Control Tower, SAP IBP, Palantir Foundry, Oracle SCM, and a GPT-4o Copilot in a single dark-themed platform.

---

## 🏗️ Architecture

```
supplysense/
├── apps/
│   ├── web/          → Next.js 15 frontend (port 3000)
│   └── api/          → FastAPI backend (port 8000)
├── packages/
│   ├── ml/           → ML platform (TFT, LSTM, CatBoost, SHAP)
│   ├── agents/       → 8 CrewAI autonomous agents
│   ├── data/         → Kafka, Airflow, PySpark, Feast
│   └── shared/       → Shared types and constants
└── infra/
    ├── docker/       → Dockerfiles
    ├── helm/         → Kubernetes Helm charts
    └── terraform/    → AWS infrastructure
```

---

## 🚀 Getting Started (Local Development)

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) ≥ 24.0
- [Node.js](https://nodejs.org/) ≥ 20.0
- [pnpm](https://pnpm.io/) ≥ 9.0
- [Python](https://www.python.org/) ≥ 3.11

### 1. Clone the repository

```bash
git clone https://github.com/your-org/supplysense.git
cd supplysense
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env and fill in your real values:
#   - NEXT_PUBLIC_MAPBOX_TOKEN (get free at mapbox.com)
#   - OPENAI_API_KEY (get at platform.openai.com)
#   - SECRET_KEY (generate: openssl rand -hex 32)
```

### 3. Start all services

```bash
docker-compose up -d
```

This starts **15 services**:

| Service | URL | Description |
|---------|-----|-------------|
| `supplysense-web` | http://localhost:3000 | Next.js frontend |
| `supplysense-api` | http://localhost:8000 | FastAPI backend |
| `supplysense-api/docs` | http://localhost:8000/docs | API Swagger docs |
| `supplysense-ml` | http://localhost:3001 | BentoML model serving |
| `mlflow` | http://localhost:5000 | MLflow experiment tracker |
| `airflow-webserver` | http://localhost:8080 | Airflow DAG scheduler |
| `grafana` | http://localhost:3002 | Monitoring dashboards |
| `prometheus` | http://localhost:9090 | Metrics collection |
| `kafka-ui` | http://localhost:8085 | Kafka topic browser |

### 4. Initialize the database

```bash
docker-compose exec supplysense-api python -m alembic upgrade head
docker-compose exec supplysense-api python scripts/seed_data.py
```

### 5. Start frontend (hot-reload dev mode)

```bash
pnpm install
pnpm dev
```

---

## 🔑 Default Credentials

| Service | Username | Password |
|---------|----------|----------|
| SupplySense (Super Admin) | admin@supplysense.ai | Admin@123! |
| SupplySense (Viewer) | viewer@supplysense.ai | Viewer@123! |
| Grafana | admin | (from .env GRAFANA_ADMIN_PASSWORD) |
| Airflow | airflow | (from .env AIRFLOW_PASSWORD) |
| MLflow | — | — |

---

## 🧩 Tech Stack

### Frontend
- **Next.js 15** (App Router) + TypeScript
- **TailwindCSS** + **Shadcn UI** components
- **Framer Motion** animations
- **Recharts** + **ECharts** + **D3.js** visualizations
- **Mapbox GL JS** supply chain globe
- **AG Grid** enterprise data tables
- **Redux Toolkit** + **Zustand** + **React Query**

### Backend
- **FastAPI** (Python 3.11) + Pydantic v2
- **JWT** + OAuth2 + RBAC middleware
- **WebSocket** real-time events
- **Celery** + **Redis** task queue

### Databases
- **PostgreSQL** — core entities
- **MongoDB** — logs and documents
- **Redis** — cache and sessions
- **InfluxDB** — time-series metrics
- **Elasticsearch** — full-text search
- **Qdrant** — vector embeddings (RAG)

### ML Platform
- **PyTorch** (TFT) + **TensorFlow** (LSTM)
- **CatBoost** + **LightGBM** — tabular forecasting
- **SHAP** + **LIME** — explainability
- **MLflow** — experiment tracking
- **Evidently AI** — drift monitoring
- **BentoML** — model serving

### AI Agents
- **CrewAI** + **LangChain** + **AutoGen**
- **GPT-4o** — Copilot + agent reasoning
- **Qdrant** — RAG knowledge base

### Data Engineering
- **Apache Kafka** — event streaming
- **Apache Airflow** — workflow orchestration
- **PySpark** — batch processing
- **Feast** — feature store
- **Delta Lake** — data lake storage

---

## 👥 User Roles (RBAC)

| Role | Access Level |
|------|-------------|
| Super Admin | Full access, cloud config, delete models |
| Admin | All operations, approve AI decisions |
| Procurement Manager | POs, suppliers, cost analytics |
| Warehouse Manager | Stock, transfers, occupancy |
| Forecast Analyst | Models, forecasts, MLOps |
| Viewer | Read-only all dashboards |
| Auditor | Audit logs only, no edit |

---

## 🤖 AI Agents

1. **Demand Sensing Agent** — Real-time demand signal processing
2. **Supplier Intelligence Agent** — Supplier health monitoring
3. **Risk Monitoring Agent** — Disruption detection
4. **Auto-Procurement Agent** — Automated PO generation
5. **Inventory Rebalancing Agent** — Multi-DC optimization
6. **Logistics Agent** — Route optimization
7. **Compliance & ESG Agent** — Regulatory compliance
8. **Self-Learning Agent** — Model drift + retraining

---

## 📁 Module Documentation

See [`docs/`](./docs/) for detailed documentation:
- [Architecture](./docs/architecture.md)
- [API Reference](./docs/api-reference.md)
- [Agent Specifications](./docs/agent-specs.md)
- [RBAC Matrix](./docs/rbac-matrix.md)

---

## 🛠️ Development Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f supplysense-api
docker-compose logs -f supplysense-web

# Restart a single service
docker-compose restart supplysense-api

# Run database migrations
docker-compose exec supplysense-api alembic upgrade head

# Run backend tests
docker-compose exec supplysense-api pytest

# Rebuild after code changes
docker-compose up --build -d supplysense-web supplysense-api

# Stop all services
docker-compose down

# Full reset (deletes volumes)
docker-compose down -v
```

---

## 📊 Monitoring

- **Grafana**: http://localhost:3002 — Pre-built dashboards for API performance, ML metrics, agent activity
- **Prometheus**: http://localhost:9090 — Raw metrics
- **MLflow**: http://localhost:5000 — Model experiments and registry

---

## 🚢 Production Deployment

See [`infra/terraform/`](./infra/terraform/) for AWS EKS infrastructure and [`infra/helm/`](./infra/helm/) for Kubernetes Helm charts.

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Deploy to Kubernetes
helm upgrade --install supplysense ./infra/helm/supplysense \
  --namespace supplysense \
  --values ./infra/helm/values.prod.yaml
```

---

## 📝 License

MIT — See [LICENSE](./LICENSE)
=======
# SupplySense
ML-powered supply chain demand forecasting platform comparing LSTM vs Temporal Fusion Transformer (TFT) models across 241 product series. Includes MLflow experiment tracking, quantile-based probabilistic forecasts, and a Dockerized PostgreSQL backend. Built for reproducible, production-style ML pipelines.
>>>>>>> f507f296bc6ec2d3c5caa0b9755b5ebe32f9e519
