"""
Intelligence request and response schemas.

Defines the typed interface for civic intelligence analysis.
The mobile app sends incident data; the backend returns structured analysis.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class IntelligenceRequest(BaseModel):
    """Incident data sent from mobile for AI analysis."""

    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1, max_length=5000)
    category: str = Field(..., max_length=50)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)


class IntelligenceResponse(BaseModel):
    """Structured civic intelligence analysis."""

    available: bool
    source: str | None = None  # "rules_engine" / "ai_model"
    summary: str | None = None
    incident_type: str | None = None
    severity: str | None = None  # low / medium / high / critical
    confidence: int | None = None  # 0-100
    potential_impacts: list[str] = Field(default_factory=list)  # max 3
    recommended_actions: list[str] = Field(default_factory=list)  # max 3
    urgency_reason: str | None = None
    needs_verification: bool = True

    # Civic Ripple fields
    ripple_trigger: str | None = None
    ripple_effects: list[str] = Field(default_factory=list)  # max 3
    ripple_overall_impact: str | None = None
    ripple_impact_level: str | None = None  # low / medium / high

    status: str = "success"  # success / unavailable / error
    error_message: str | None = None
