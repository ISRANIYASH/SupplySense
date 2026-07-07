"""
SupplySense API - Core Configuration
Pydantic Settings v2 with full environment variable support
"""

from __future__ import annotations

from functools import lru_cache
from typing import Annotated, Any, Literal

from pydantic import AnyHttpUrl, AnyUrl, Field, PostgresDsn, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    All values can be overridden via .env file or actual env vars.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── App ──────────────────────────────────────────────────────────────────
    APP_NAME: str = "SupplySense API"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: Literal["development", "staging", "production", "testing"] = "development"
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"
    API_V1_STR: str = "/api/v1"

    # ── Security ─────────────────────────────────────────────────────────────
    SECRET_KEY: str = "super-secret-key-change-in-production-min-32-chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    MFA_ISSUER: str = "SupplySense"
    COOKIE_SECURE: bool = False  # True in production (HTTPS)
    COOKIE_HTTPONLY: bool = True
    COOKIE_SAMESITE: str = "lax"

    # ── CORS ─────────────────────────────────────────────────────────────────
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "https://supplysense.vercel.app",
        "https://app.supplysense.ai",
    ]
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: list[str] = ["*"]
    CORS_ALLOW_HEADERS: list[str] = ["*"]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: str | list[str]) -> list[str]:
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v

    # ── PostgreSQL ────────────────────────────────────────────────────────────
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "supplysense"
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/supplysense"
    DB_POOL_SIZE: int = 20
    DB_MAX_OVERFLOW: int = 40
    DB_POOL_TIMEOUT: int = 30
    DB_POOL_RECYCLE: int = 3600
    DB_ECHO_SQL: bool = False

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def assemble_db_url(cls, v: str | None, info: Any) -> str:  # noqa: ANN001
        if v:
            return v
        # Fallback: build from components
        data = info.data if hasattr(info, "data") else {}
        host = data.get("POSTGRES_HOST", "localhost")
        port = data.get("POSTGRES_PORT", 5432)
        user = data.get("POSTGRES_USER", "postgres")
        password = data.get("POSTGRES_PASSWORD", "postgres")
        db = data.get("POSTGRES_DB", "supplysense")
        return f"postgresql+asyncpg://{user}:{password}@{host}:{port}/{db}"

    # ── MongoDB ───────────────────────────────────────────────────────────────
    MONGODB_URL: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "supplysense"
    MONGODB_MAX_CONNECTIONS: int = 10
    MONGODB_MIN_CONNECTIONS: int = 1

    # ── Redis ─────────────────────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_CACHE_TTL: int = 300  # seconds
    REDIS_POOL_SIZE: int = 20

    # ── Elasticsearch ─────────────────────────────────────────────────────────
    ELASTICSEARCH_URL: str = "http://localhost:9200"
    ELASTICSEARCH_USERNAME: str = ""
    ELASTICSEARCH_PASSWORD: str = ""
    ELASTICSEARCH_INDEX_PREFIX: str = "supplysense"

    # ── Qdrant ────────────────────────────────────────────────────────────────
    QDRANT_URL: str = "http://localhost:6333"
    QDRANT_API_KEY: str = ""
    QDRANT_COLLECTION_NAME: str = "supplysense_knowledge"
    QDRANT_VECTOR_SIZE: int = 1536  # OpenAI text-embedding-ada-002

    # ── OpenAI ────────────────────────────────────────────────────────────────
    OPENAI_API_KEY: str = "YOUR_OPENAI_API_KEY"
    OPENAI_MODEL: str = "gpt-4o"
    OPENAI_EMBEDDING_MODEL: str = "text-embedding-ada-002"
    OPENAI_MAX_TOKENS: int = 2048
    OPENAI_TEMPERATURE: float = 0.1

    # ── Kafka ─────────────────────────────────────────────────────────────────
    KAFKA_BOOTSTRAP_SERVERS: str = "localhost:9092"
    KAFKA_TOPIC_EVENTS: str = "supplysense.events"
    KAFKA_TOPIC_ALERTS: str = "supplysense.alerts"
    KAFKA_TOPIC_DECISIONS: str = "supplysense.decisions"
    KAFKA_CONSUMER_GROUP: str = "supplysense-api"
    KAFKA_ENABLED: bool = False  # Toggle to disable for dev without Kafka

    # ── Celery ────────────────────────────────────────────────────────────────
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    # ── MLflow ────────────────────────────────────────────────────────────────
    MLFLOW_TRACKING_URI: str = "http://localhost:5000"
    MLFLOW_EXPERIMENT_NAME: str = "supplysense-forecasting"

    # ── OAuth ─────────────────────────────────────────────────────────────────
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/oauth/google/callback"
    OAUTH_STATE_SECRET: str = "oauth-state-secret-change-me"

    # ── Email ─────────────────────────────────────────────────────────────────
    SMTP_HOST: str = "smtp.sendgrid.net"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAIL_FROM: str = "noreply@supplysense.ai"
    EMAIL_ENABLED: bool = False

    # ── Feature Flags ─────────────────────────────────────────────────────────
    FEATURE_AI_AGENTS: bool = True
    FEATURE_COPILOT: bool = True
    FEATURE_MONTE_CARLO: bool = True
    FEATURE_SCENARIO_PLANNING: bool = True
    FEATURE_ESG_SCORING: bool = True
    FEATURE_BLOCKCHAIN_TRACE: bool = False
    FEATURE_MULTITENANCY: bool = False

    # ── Monitoring ────────────────────────────────────────────────────────────
    PROMETHEUS_ENABLED: bool = True
    SENTRY_DSN: str = ""
    SENTRY_TRACES_SAMPLE_RATE: float = 0.1

    # ── Pagination ────────────────────────────────────────────────────────────
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 200

    # ── File Storage ──────────────────────────────────────────────────────────
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_S3_BUCKET: str = "supplysense-artifacts"
    AWS_REGION: str = "us-east-1"

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    @property
    def is_testing(self) -> bool:
        return self.ENVIRONMENT == "testing"

    @property
    def use_real_openai(self) -> bool:
        return self.OPENAI_API_KEY not in ("YOUR_OPENAI_API_KEY", "", "sk-placeholder")

    @property
    def kafka_bootstrap_list(self) -> list[str]:
        return self.KAFKA_BOOTSTRAP_SERVERS.split(",")


@lru_cache
def get_settings() -> Settings:
    """Return cached Settings singleton."""
    return Settings()


settings: Settings = get_settings()
