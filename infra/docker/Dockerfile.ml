# ============================================================
# SupplySense ML — BentoML Serving Dockerfile
# ============================================================

FROM python:3.11-slim AS base
WORKDIR /app

# Install system dependencies for ML libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    git \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Install uv for fast package installation
RUN pip install --no-cache-dir uv

# ── Install ML dependencies ──────────────────────────────────
COPY packages/ml/requirements.txt ./requirements.txt
RUN uv pip install --system --no-cache -r requirements.txt

# ── Copy ML package source ───────────────────────────────────
COPY packages/ml/ ./packages/ml/

# Create model artifact directories
RUN mkdir -p /app/models /app/artifacts /app/logs

# Create non-root user
RUN groupadd --system --gid 1001 mlgroup && \
    useradd  --system --uid 1001 --gid mlgroup mluser && \
    chown -R mluser:mlgroup /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app
ENV BENTOML_HOME=/app/bentoml
ENV MODEL_STORE=/app/models

USER mluser

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -sf http://localhost:3001/healthz || exit 1

CMD ["python", "-m", "packages.ml.serve"]
