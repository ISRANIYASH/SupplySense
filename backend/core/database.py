"""
SupplySense API - Async Database Connections
PostgreSQL (SQLAlchemy async), MongoDB (Motor), Redis (aioredis),
Elasticsearch (async), Qdrant vector store
"""

from __future__ import annotations

import contextlib
from collections.abc import AsyncGenerator
from typing import Any

import structlog
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from core.config import settings

logger = structlog.get_logger(__name__)

# ── SQLAlchemy Base ───────────────────────────────────────────────────────────


class Base(DeclarativeBase):
    """SQLAlchemy declarative base for all ORM models."""

    pass


# ── PostgreSQL ────────────────────────────────────────────────────────────────
_pg_engine: AsyncEngine | None = None
_pg_session_factory: async_sessionmaker[AsyncSession] | None = None


def get_pg_engine() -> AsyncEngine:
    """Return the singleton async PostgreSQL engine."""
    global _pg_engine
    if _pg_engine is None:
        _pg_engine = create_async_engine(
            settings.DATABASE_URL,
            pool_size=settings.DB_POOL_SIZE,
            max_overflow=settings.DB_MAX_OVERFLOW,
            pool_timeout=settings.DB_POOL_TIMEOUT,
            pool_recycle=settings.DB_POOL_RECYCLE,
            pool_pre_ping=True,
            echo=settings.DB_ECHO_SQL,
            future=True,
        )
        logger.info("postgres_engine_created", url=settings.DATABASE_URL.split("@")[-1])
    return _pg_engine


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    """Return the singleton session factory."""
    global _pg_session_factory
    if _pg_session_factory is None:
        _pg_session_factory = async_sessionmaker(
            bind=get_pg_engine(),
            class_=AsyncSession,
            expire_on_commit=False,
            autocommit=False,
            autoflush=False,
        )
    return _pg_session_factory


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency: yield an async DB session, rolling back on error.
    Usage::
        @router.get("/items")
        async def list_items(db: AsyncSession = Depends(get_db)):
            ...
    """
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


# ── MongoDB ───────────────────────────────────────────────────────────────────
_mongo_client: Any | None = None
_mongo_db: Any | None = None


def get_mongo_client() -> Any:
    """Return the singleton Motor async MongoDB client."""
    global _mongo_client
    if _mongo_client is None:
        try:
            from motor.motor_asyncio import AsyncIOMotorClient

            _mongo_client = AsyncIOMotorClient(
                settings.MONGODB_URL,
                maxPoolSize=settings.MONGODB_MAX_CONNECTIONS,
                minPoolSize=settings.MONGODB_MIN_CONNECTIONS,
                serverSelectionTimeoutMS=5000,
            )
            logger.info("mongodb_client_created")
        except Exception as exc:
            logger.warning("mongodb_unavailable", error=str(exc))
            _mongo_client = None
    return _mongo_client


def get_mongo_db() -> Any:
    """Return the MongoDB database object."""
    global _mongo_db
    client = get_mongo_client()
    if client is not None and _mongo_db is None:
        _mongo_db = client[settings.MONGODB_DB_NAME]
    return _mongo_db


async def get_mongo() -> AsyncGenerator[Any, None]:
    """
    FastAPI dependency: yield the MongoDB database reference.
    Usage::
        @router.get("/logs")
        async def get_logs(mongo: Any = Depends(get_mongo)):
            ...
    """
    db = get_mongo_db()
    yield db


# ── Redis ─────────────────────────────────────────────────────────────────────
_redis_pool: Any | None = None


async def get_redis_pool() -> Any:
    """Return the singleton aioredis connection pool."""
    global _redis_pool
    if _redis_pool is None:
        try:
            import aioredis

            _redis_pool = await aioredis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
                max_connections=settings.REDIS_POOL_SIZE,
            )
            logger.info("redis_pool_created", url=settings.REDIS_URL)
        except Exception as exc:
            logger.warning("redis_unavailable", error=str(exc))
            _redis_pool = None
    return _redis_pool


async def get_redis() -> AsyncGenerator[Any | None, None]:
    """
    FastAPI dependency: yield an aioredis connection.
    Usage::
        @router.get("/cache")
        async def get_cached(redis = Depends(get_redis)):
            ...
    """
    pool = await get_redis_pool()
    yield pool


# ── Elasticsearch ─────────────────────────────────────────────────────────────
_es_client: Any | None = None


def get_elasticsearch() -> Any | None:
    """Return the singleton async Elasticsearch client."""
    global _es_client
    if _es_client is None:
        try:
            from elasticsearch import AsyncElasticsearch

            kwargs: dict[str, Any] = {"hosts": [settings.ELASTICSEARCH_URL]}
            if settings.ELASTICSEARCH_USERNAME and settings.ELASTICSEARCH_PASSWORD:
                kwargs["basic_auth"] = (
                    settings.ELASTICSEARCH_USERNAME,
                    settings.ELASTICSEARCH_PASSWORD,
                )
            _es_client = AsyncElasticsearch(**kwargs)
            logger.info("elasticsearch_client_created", url=settings.ELASTICSEARCH_URL)
        except Exception as exc:
            logger.warning("elasticsearch_unavailable", error=str(exc))
            _es_client = None
    return _es_client


async def get_es() -> AsyncGenerator[Any | None, None]:
    """FastAPI dependency: yield the Elasticsearch client."""
    yield get_elasticsearch()


# ── Qdrant ────────────────────────────────────────────────────────────────────
_qdrant_client: Any | None = None


def get_qdrant() -> Any | None:
    """Return the singleton Qdrant vector store client."""
    global _qdrant_client
    if _qdrant_client is None:
        try:
            from qdrant_client import QdrantClient

            kwargs: dict[str, Any] = {"url": settings.QDRANT_URL}
            if settings.QDRANT_API_KEY:
                kwargs["api_key"] = settings.QDRANT_API_KEY
            _qdrant_client = QdrantClient(**kwargs)
            logger.info("qdrant_client_created", url=settings.QDRANT_URL)
        except Exception as exc:
            logger.warning("qdrant_unavailable", error=str(exc))
            _qdrant_client = None
    return _qdrant_client


# ── Lifecycle helpers ─────────────────────────────────────────────────────────
async def connect_all() -> None:
    """Initialize all database connections at startup."""
    logger.info("connecting_to_databases")
    # PostgreSQL: create tables if needed (migrations handle this in prod)
    try:
        engine = get_pg_engine()
        async with engine.connect() as conn:
            await conn.execute(__import__("sqlalchemy").text("SELECT 1"))
        logger.info("postgres_connected")
    except Exception as exc:
        logger.warning("postgres_connection_failed", error=str(exc))

    # MongoDB
    try:
        client = get_mongo_client()
        if client:
            await client.admin.command("ping")
            logger.info("mongodb_connected")
    except Exception as exc:
        logger.warning("mongodb_connection_failed", error=str(exc))

    # Redis
    try:
        pool = await get_redis_pool()
        if pool:
            await pool.ping()
            logger.info("redis_connected")
    except Exception as exc:
        logger.warning("redis_connection_failed", error=str(exc))

    # Qdrant
    try:
        qdrant = get_qdrant()
        if qdrant:
            qdrant.get_collections()
            logger.info("qdrant_connected")
    except Exception as exc:
        logger.warning("qdrant_connection_failed", error=str(exc))


async def disconnect_all() -> None:
    """Close all database connections gracefully at shutdown."""
    global _pg_engine, _mongo_client, _redis_pool, _es_client, _qdrant_client

    if _pg_engine:
        await _pg_engine.dispose()
        logger.info("postgres_disconnected")

    if _mongo_client:
        _mongo_client.close()
        logger.info("mongodb_disconnected")

    if _redis_pool:
        await _redis_pool.close()
        logger.info("redis_disconnected")

    if _es_client:
        await _es_client.close()
        logger.info("elasticsearch_disconnected")

    _qdrant_client = None
    logger.info("all_databases_disconnected")


async def check_all_health() -> dict[str, str]:
    """Check health status of all database connections."""
    health: dict[str, str] = {}

    # PostgreSQL
    try:
        engine = get_pg_engine()
        async with engine.connect() as conn:
            await conn.execute(__import__("sqlalchemy").text("SELECT 1"))
        health["postgres"] = "healthy"
    except Exception as exc:
        health["postgres"] = f"unhealthy: {exc}"

    # MongoDB
    try:
        client = get_mongo_client()
        if client:
            await client.admin.command("ping")
            health["mongodb"] = "healthy"
        else:
            health["mongodb"] = "not configured"
    except Exception as exc:
        health["mongodb"] = f"unhealthy: {exc}"

    # Redis
    try:
        pool = await get_redis_pool()
        if pool:
            await pool.ping()
            health["redis"] = "healthy"
        else:
            health["redis"] = "not configured"
    except Exception as exc:
        health["redis"] = f"unhealthy: {exc}"

    # Elasticsearch
    try:
        es = get_elasticsearch()
        if es:
            info = await es.info()
            health["elasticsearch"] = f"healthy (v{info['version']['number']})"
        else:
            health["elasticsearch"] = "not configured"
    except Exception as exc:
        health["elasticsearch"] = f"unhealthy: {exc}"

    # Qdrant
    try:
        qdrant = get_qdrant()
        if qdrant:
            qdrant.get_collections()
            health["qdrant"] = "healthy"
        else:
            health["qdrant"] = "not configured"
    except Exception as exc:
        health["qdrant"] = f"unhealthy: {exc}"

    return health
