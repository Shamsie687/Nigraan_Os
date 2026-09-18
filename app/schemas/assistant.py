"""
Civic Assistant request and response schemas.

Defines the typed interface for the Gemini-powered civic assistant.
The mobile app sends a citizen question; the backend returns a
structured reply with severity, impacts, and recommended actions.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class AssistantRequest(BaseModel):
    """A civic question or issue description from a citizen."""

    message: str = Field(..., min_length=1, max_length=1000)


class AssistantResponse(BaseModel):
    """Structured civic assistant reply."""

    available: bool
    source: str | None = None  # "gemini" / "rules_engine"
    reply: str | None = None
    severity: str | None = None  # low / medium / high / critical
    confidence: int | None = None  # 0-100
    potential_impacts: list[str] = Field(default_factory=list)  # max 3
    recommended_actions: list[str] = Field(default_factory=list)  # max 3
    needs_verification: bool = True

    status: str = "success"  # success / unavailable / error
    error_message: str | None = None
