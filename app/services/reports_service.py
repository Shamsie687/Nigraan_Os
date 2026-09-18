"""
Reports Service — persists citizen incident reports to Supabase.

Writes incoming report payloads directly into the Supabase 'reports'
table through the PostgREST API using SUPABASE_URL and SUPABASE_KEY
(read server-side only — the key is never exposed to clients).

Errors are categorised and returned as structured data. Internal
details are logged server-side and never leaked to the client.
"""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.core.config import settings
from app.schemas.reports import ReportCreateRequest, ReportCreateResponse

logger = logging.getLogger(__name__)

REPORTS_TABLE = "reports"
# Kept below the mobile client's 15s request budget together with the
# 8s verification deadline, so the endpoint always answers in time.
REQUEST_TIMEOUT_SECONDS = 6.0
# PostgREST error code returned when a table is missing from the schema cache
TABLE_NOT_FOUND_CODE = "PGRST205"

# ── Helpers ────────────────────────────────────────────────────────


def _success(report: dict[str, Any] | None) -> ReportCreateResponse:
    """Return a clean 'success' response."""
    return ReportCreateResponse(success=True, status="success", report=report)


def _error(message: str) -> ReportCreateResponse:
    """Return a clean 'error' response without internal details."""
    return ReportCreateResponse(success=False, status="error", error_message=message)


def _unavailable(message: str) -> ReportCreateResponse:
    """Return a clean 'unavailable' response."""
    return ReportCreateResponse(
        success=False, status="unavailable", error_message=message
    )


def _rest_endpoint() -> str:
    """Build the PostgREST endpoint for the reports table.

    SUPABASE_URL may or may not include the /rest/v1 suffix — both
    forms are normalised to a single endpoint URL.
    """
    base = settings.supabase_url.strip().rstrip("/")
    if base.endswith("/rest/v1"):
        return f"{base}/{REPORTS_TABLE}"
    return f"{base}/rest/v1/{REPORTS_TABLE}"


def _error_code(response: httpx.Response) -> str:
    """Best-effort extraction of the PostgREST error code for logging."""
    try:
        body = response.json()
    except ValueError:
        return "(unparseable)"
    if isinstance(body, dict):
        return str(body.get("code", "(no code)"))
    return "(no code)"


# ── Service ─────────────────────────────────────────────────────────


class ReportsService:
    """Persists report payloads into the Supabase 'reports' table."""

    @property
    def is_configured(self) -> bool:
        return bool(settings.supabase_url and settings.supabase_key)

    async def create_report(
        self, request: ReportCreateRequest
    ) -> ReportCreateResponse:
        """Insert one report row directly into the Supabase 'reports' table.

        Returns a structured success/error payload — never raises and
        never exposes Supabase internals or the API key.
        """
        if not self.is_configured:
            logger.warning("Supabase reports storage is not configured")
            return _unavailable("Report storage is not configured")

        payload = {
            "title": request.title,
            "description": request.description,
            "category": request.category,
            "latitude": request.latitude,
            "longitude": request.longitude,
            "image_url": request.image_url,
        }
        headers = {
            "apikey": settings.supabase_key,
            "Authorization": f"Bearer {settings.supabase_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }

        try:
            # Fully awaited async insert — this coroutine does not return
            # until PostgREST confirms the row was stored (or fails).
            async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS) as client:
                response = await client.post(
                    _rest_endpoint(), headers=headers, json=payload
                )
                response.raise_for_status()

            return _success(self._parse_row(response))

        except httpx.TimeoutException:
            logger.warning("Supabase reports insert timed out")
            return _error("Report storage timed out — please try again")

        except httpx.HTTPStatusError as e:
            code = _error_code(e.response)
            logger.error(
                "Supabase reports insert failed: HTTP %s (%s): %s",
                e.response.status_code,
                code,
                e.response.text[:200],
            )
            return self._map_http_error(e.response.status_code, code)

        except httpx.RequestError as e:
            logger.error("Supabase reports insert connection error: %s", type(e).__name__)
            return _error("Report storage is unreachable")

        except Exception as e:
            # Last-resort guard — never crash the endpoint
            logger.error("Unexpected reports storage error: %s", type(e).__name__)
            return _error("Report could not be saved")

    @staticmethod
    def _parse_row(response: httpx.Response) -> dict[str, Any] | None:
        """Extract the inserted row from the PostgREST representation."""
        try:
            data = response.json()
        except ValueError:
            logger.warning("Supabase returned a non-JSON insert response")
            return None
        if isinstance(data, list):
            return data[0] if data else None
        if isinstance(data, dict):
            return data
        return None

    @staticmethod
    def _map_http_error(status: int, code: str) -> ReportCreateResponse:
        """Translate Supabase HTTP failures into clean client messages."""
        if status == 404 or code == TABLE_NOT_FOUND_CODE:
            return _unavailable("Report storage is not available yet")
        if status == 401:
            return _unavailable("Report storage configuration error")
        if status in (400, 409, 422):
            return _error("The report data was rejected by the storage service")
        if status == 403:
            return _error("Report storage rejected this submission")
        if status == 429:
            return _error("Report storage is busy — please try again shortly")
        return _error("Report could not be saved")


# Singleton
reports_service = ReportsService()
