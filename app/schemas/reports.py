"""
Report request and response schemas.

Defines the typed interface for persisting incident reports directly
into the Supabase 'reports' table via the backend report endpoint.
Evidence photos travel either as a base64 payload (JSON requests) or a
multipart file upload, and must pass Gemini image verification before
the report is stored.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class ReportCreateRequest(BaseModel):
    """Incident payload sent by the client for storage."""

    title: str = Field(..., min_length=3, max_length=200)
    description: str = Field(..., min_length=10, max_length=5000)
    category: str = Field(..., min_length=1, max_length=50)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    image_url: str | None = Field(default=None, max_length=1000)
    # Evidence photo as base64 (optionally a data URI). Never stored in
    # Supabase — used only for Gemini verification before the insert.
    image_base64: str | None = Field(default=None, max_length=15_000_000)
    image_mime_type: str | None = Field(default=None, max_length=100)


class ImageVerificationInfo(BaseModel):
    """Gemini verdict for one evidence photo."""

    is_civic_issue: bool
    detected_category: str | None = None
    invalid_reason: str | None = None
    confidence: int | None = None
    reason: str | None = None


class ReportCreateResponse(BaseModel):
    """Structured result of a report storage operation."""

    success: bool
    status: str = "success"  # success / rejected / error / unavailable
    report: dict[str, Any] | None = None  # stored row as returned by Supabase
    error_message: str | None = None
    verification: ImageVerificationInfo | None = None
