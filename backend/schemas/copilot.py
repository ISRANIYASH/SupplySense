"""
SupplySense API - Copilot Pydantic Schemas
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    """A single message in a conversation."""

    role: Literal["user", "assistant", "system"]
    content: str
    timestamp: datetime | None = None
    metadata: dict[str, Any] | None = None


class ChatRequest(BaseModel):
    """Request to the copilot chat endpoint."""

    message: str = Field(min_length=1, max_length=4096)
    conversation_id: str | None = None
    context: dict[str, Any] = Field(
        default_factory=dict,
        description="Optional page context: current_page, filters, selected_items etc.",
    )
    stream: bool = False

    model_config = {
        "json_schema_extra": {
            "example": {
                "message": "Which suppliers have the highest delivery risk this week?",
                "conversation_id": "conv_abc123",
                "context": {"current_page": "suppliers", "selected_country": "China"},
            }
        }
    }


class SourceReference(BaseModel):
    """RAG source reference included in copilot responses."""

    title: str
    content_preview: str
    relevance_score: float
    source_type: str  # "supplier_data", "inventory", "news", "historical"


class ChatResponse(BaseModel):
    """Response from the copilot."""

    conversation_id: str
    message: str
    role: Literal["assistant"] = "assistant"
    timestamp: datetime
    sources: list[SourceReference] = []
    suggested_actions: list[str] = []
    tokens_used: int | None = None
    model_used: str | None = None
    is_mock: bool = False


class ConversationSummary(BaseModel):
    """Summary of a past conversation."""

    conversation_id: str
    title: str
    message_count: int
    last_message: str
    last_activity: datetime
    created_at: datetime


class SuggestedPromptSchema(BaseModel):
    """Context-aware suggested prompt."""

    id: str
    prompt: str
    category: str
    icon: str | None = None
    description: str | None = None


class StreamChunk(BaseModel):
    """Single chunk in a streaming SSE response."""

    conversation_id: str
    chunk: str
    is_final: bool = False
    timestamp: datetime
