# SupplySense AI 🧠⚡

> **Intelligent Supply Chain Forecasting Platform** — Full-stack application combining demand forecasting, inventory management, supplier intelligence, and AI-powered decision support.

---

## 🏗️ Project Structure

```
supplysense/
├── frontend/           # Next.js 15 frontend (port 3000)
├── backend/            # FastAPI backend (port 8000)
├── ml/                 # ML training scripts (LSTM, TFT)
├── models/             # Trained model artifacts
├── datasets/           # Raw and processed data files
├── scripts/            # Database setup, ETL, and utility scripts
├── agents/             # CrewAI agent definitions
├── copilot/            # Rule-based AI copilot
├── mlruns/             # MLflow experiment tracking data
├── infra/              # Docker and deployment config
├── docker-compose.yml  # PostgreSQL service
├── package.json        # Root monorepo orchestration
├── pnpm-workspace.yaml # pnpm workspace config
└── turbo.json          # Turborepo task config
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) >= 20.0
- [pnpm](https://pnpm.io/) >= 9.0
- [Python](https://www.python.org/) >= 3.11
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for PostgreSQL)

### 1. Clone and configure

```bash
git clone https://github.com/ISRANIYASH/SupplySense.git
cd supplysense
cp .env.example .env
# Edit .env with your PostgreSQL credentials
```

### 2. Install all dependencies

```bash
npm run setup
```

This runs:
- `pnpm install` — installs all Node.js dependencies
- `pip install -r backend/requirements.txt` — installs Python dependencies

### 3. Start PostgreSQL

```bash
npm run db:up
```

This starts a PostgreSQL 16 container via Docker Compose on port 5432.

### 4. Start the application

```bash
npm run dev
```

This starts **both** services concurrently:

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | Next.js 15 dashboard |
| Backend API | http://localhost:8000 | FastAPI with 19 routers |
| API Docs | http://localhost:8000/docs | Swagger/OpenAPI docs |

Press `Ctrl + C` to stop both services.

---

## 🔑 Default Login

The frontend uses NextAuth with demo credentials:

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@supplysense.ai | any |
| Viewer | viewer@supplysense.ai | any |

---

## 📋 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start frontend + backend together |
| `npm run dev:frontend` | Start frontend only |
| `npm run dev:backend` | Start backend only |
| `npm run setup` | Install all dependencies |
| `npm run build` | Build frontend for production |
| `npm run db:up` | Start PostgreSQL (Docker) |
| `npm run db:down` | Stop PostgreSQL (Docker) |
| `npm run lint` | Lint frontend code |

---

## 🧩 Tech Stack

### Frontend
- **Next.js 15** (App Router) + TypeScript
- **TailwindCSS** + Radix UI components
- **Framer Motion** animations
- **Recharts** + **ECharts** + **D3.js** visualizations
- **AG Grid** data tables
- **Redux Toolkit** + **React Query** state management
- **Leaflet** maps

### Backend
- **FastAPI** + Pydantic v2
- **SQLAlchemy** + **psycopg2** (synchronous)
- **JWT** authentication + RBAC
- 19 API routers covering all dashboard pages

### Database
- **PostgreSQL 16** — all application data

### ML Platform
- **PyTorch** LSTM (3-layer, 256→128→64)
- **Temporal Fusion Transformer** (pytorch_forecasting)
- **MLflow** — experiment tracking
- **SHAP** — model explainability

---

## 🗄️ Database

The application uses PostgreSQL with these key tables:
- `fact_demand_daily` — daily demand aggregations
- `fact_inventory` — daily inventory snapshots
- `dim_suppliers` — supplier master with performance scores
- `dim_products` — product catalog
- `dim_inventory_items` — inventory item master

To set up the database schema and load data:

```bash
cd scripts
python setup_postgres_schema.py
python load_to_postgres.py
```

---

## 📝 License

MIT — See [LICENSE](./LICENSE)
