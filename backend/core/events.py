"""
SupplySense API - WebSocket Event Broadcaster
Real-time event hub with channel subscriptions and per-user targeting
"""

from __future__ import annotations

import asyncio
import json
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any

import structlog
from fastapi import WebSocket

logger = structlog.get_logger(__name__)

# Event type constants
EVENT_AGENT_ACTIVITY = "agent_activity"
EVENT_ALERT = "alert"
EVENT_KPI_UPDATE = "kpi_update"
EVENT_DECISION = "decision"
EVENT_INVENTORY_UPDATE = "inventory_update"
EVENT_FORECAST_UPDATE = "forecast_update"
EVENT_RISK_UPDATE = "risk_update"
EVENT_SYSTEM = "system"
EVENT_PONG = "pong"

VALID_CHANNELS = {
    "agent_activity",
    "alerts",
    "kpi_updates",
    "decisions",
    "inventory",
    "forecasting",
    "risk",
    "all",
}


class WebSocketConnection:
    """Represents an active WebSocket connection with metadata."""

    def __init__(
        self,
        websocket: WebSocket,
        user_id: str,
        user_email: str,
        user_role: str,
        subscriptions: set[str],
    ) -> None:
        self.websocket = websocket
        self.user_id = user_id
        self.user_email = user_email
        self.user_role = user_role
        self.subscriptions: set[str] = subscriptions
        self.connected_at = datetime.now(timezone.utc)
        self.last_ping: datetime = self.connected_at
        self.message_count: int = 0

    async def send_json(self, data: dict[str, Any]) -> None:
        """Send a JSON message to this connection."""
        try:
            await self.websocket.send_json(data)
            self.message_count += 1
        except Exception as exc:
            logger.warning(
                "ws_send_failed",
                user_id=self.user_id,
                error=str(exc),
            )
            raise


class ConnectionManager:
    """
    WebSocket connection manager with:
    - Per-user targeting
    - Channel-based subscriptions
    - Heartbeat / ping-pong
    - Graceful disconnect cleanup
    """

    def __init__(self) -> None:
        # All active connections
        self._connections: list[WebSocketConnection] = []
        # user_id → list of connections (one user may have multiple tabs)
        self._user_connections: dict[str, list[WebSocketConnection]] = defaultdict(list)
        # channel → list of connections
        self._channel_connections: dict[str, list[WebSocketConnection]] = defaultdict(list)
        self._lock = asyncio.Lock()

    async def connect(
        self,
        websocket: WebSocket,
        user_id: str,
        user_email: str,
        user_role: str,
        subscriptions: set[str] | None = None,
    ) -> WebSocketConnection:
        """Accept a new WebSocket connection and register it."""
        await websocket.accept()
        subs = subscriptions or {"all"}
        # Validate subscriptions
        valid_subs = subs & VALID_CHANNELS
        if not valid_subs:
            valid_subs = {"all"}

        conn = WebSocketConnection(
            websocket=websocket,
            user_id=user_id,
            user_email=user_email,
            user_role=user_role,
            subscriptions=valid_subs,
        )

        async with self._lock:
            self._connections.append(conn)
            self._user_connections[user_id].append(conn)
            for channel in valid_subs:
                self._channel_connections[channel].append(conn)

        logger.info(
            "ws_connected",
            user_id=user_id,
            email=user_email,
            subscriptions=list(valid_subs),
            total_connections=len(self._connections),
        )

        # Send welcome message
        await conn.send_json(
            {
                "type": EVENT_SYSTEM,
                "data": {
                    "message": "Connected to SupplySense real-time hub",
                    "subscriptions": list(valid_subs),
                    "server_time": datetime.now(timezone.utc).isoformat(),
                },
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        )
        return conn

    async def disconnect(self, conn: WebSocketConnection) -> None:
        """Remove a connection from all registries."""
        async with self._lock:
            if conn in self._connections:
                self._connections.remove(conn)
            user_list = self._user_connections.get(conn.user_id, [])
            if conn in user_list:
                user_list.remove(conn)
            for channel in conn.subscriptions:
                ch_list = self._channel_connections.get(channel, [])
                if conn in ch_list:
                    ch_list.remove(conn)

        logger.info(
            "ws_disconnected",
            user_id=conn.user_id,
            email=conn.user_email,
            messages_sent=conn.message_count,
            total_connections=len(self._connections),
        )

    async def broadcast(
        self,
        event_type: str,
        data: dict[str, Any],
        exclude_user: str | None = None,
    ) -> None:
        """Broadcast an event to ALL connected clients."""
        message = _build_message(event_type, data)
        dead_conns: list[WebSocketConnection] = []

        async with self._lock:
            targets = list(self._connections)

        for conn in targets:
            if exclude_user and conn.user_id == exclude_user:
                continue
            try:
                await conn.send_json(message)
            except Exception:
                dead_conns.append(conn)

        for dead in dead_conns:
            await self.disconnect(dead)

    async def broadcast_to_user(
        self,
        user_id: str,
        event_type: str,
        data: dict[str, Any],
    ) -> None:
        """Send an event to all connections belonging to a specific user."""
        message = _build_message(event_type, data)
        async with self._lock:
            targets = list(self._user_connections.get(user_id, []))

        dead_conns: list[WebSocketConnection] = []
        for conn in targets:
            try:
                await conn.send_json(message)
            except Exception:
                dead_conns.append(conn)

        for dead in dead_conns:
            await self.disconnect(dead)

    async def broadcast_to_channel(
        self,
        channel: str,
        event_type: str,
        data: dict[str, Any],
    ) -> None:
        """Send an event to all connections subscribed to a channel."""
        message = _build_message(event_type, data)

        # Also send to "all" subscribers
        async with self._lock:
            targets = list(
                set(
                    self._channel_connections.get(channel, [])
                    + self._channel_connections.get("all", [])
                )
            )

        dead_conns: list[WebSocketConnection] = []
        for conn in targets:
            try:
                await conn.send_json(message)
            except Exception:
                dead_conns.append(conn)

        for dead in dead_conns:
            await self.disconnect(dead)

    async def send_to_connection(
        self,
        conn: WebSocketConnection,
        event_type: str,
        data: dict[str, Any],
    ) -> None:
        """Send a targeted message to one specific connection."""
        message = _build_message(event_type, data)
        try:
            await conn.send_json(message)
        except Exception:
            await self.disconnect(conn)

    async def handle_ping(self, conn: WebSocketConnection) -> None:
        """Respond to a client ping."""
        conn.last_ping = datetime.now(timezone.utc)
        await conn.send_json(
            {
                "type": EVENT_PONG,
                "data": {"server_time": conn.last_ping.isoformat()},
                "timestamp": conn.last_ping.isoformat(),
            }
        )

    async def handle_subscribe(
        self,
        conn: WebSocketConnection,
        channels: list[str],
    ) -> None:
        """Handle dynamic channel subscription updates."""
        valid_new = set(channels) & VALID_CHANNELS
        newly_added = valid_new - conn.subscriptions

        async with self._lock:
            for channel in newly_added:
                self._channel_connections[channel].append(conn)
            conn.subscriptions |= newly_added

        await conn.send_json(
            {
                "type": EVENT_SYSTEM,
                "data": {
                    "message": "Subscriptions updated",
                    "subscriptions": list(conn.subscriptions),
                },
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        )

    @property
    def connection_count(self) -> int:
        return len(self._connections)

    @property
    def stats(self) -> dict[str, Any]:
        return {
            "total_connections": len(self._connections),
            "unique_users": len(self._user_connections),
            "channels": {
                ch: len(conns)
                for ch, conns in self._channel_connections.items()
                if conns
            },
        }


def _build_message(event_type: str, data: dict[str, Any]) -> dict[str, Any]:
    """Build a standard WebSocket message envelope."""
    return {
        "type": event_type,
        "data": data,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# ── Singleton instance ────────────────────────────────────────────────────────
manager = ConnectionManager()
