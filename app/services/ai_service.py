"""
Intelligence Service — Provider-first with rules-engine fallback.

When an external AI provider (OpenAI) is configured, it is used for analysis.
When no provider is available, the deterministic civic rules engine generates
structured assessments. The response 'source' field distinguishes the two.
No secrets are exposed to the client.
"""

from __future__ import annotations

import json
import logging

from app.core.config import settings
from app.schemas.intelligence import IntelligenceRequest, IntelligenceResponse
from app.services.civic_rules import analyze_with_rules

logger = logging.getLogger(__name__)

# ── System Prompt ──────────────────────────────────────────────────

SYSTEM_PROMPT = """\
You are NigraanOS civic intelligence — a calm, precise analyst for civic
infrastructure reports in Pakistan.

Analyze the incident and return ONLY valid JSON with these exact fields:
- "summary": 1-2 sentence plain-language explanation of what is happening
- "incident_type": specific infrastructure category (e.g., "Water infrastructure failure")
- "severity": one of "low", "medium", "high", "critical"
- "confidence": integer 0-100 reflecting analysis certainty
- "potential_impacts": array of up to 3 short impact descriptions
- "recommended_actions": array of up to 3 concrete next steps for authorities
- "urgency_reason": brief explanation of why the severity level was assigned
- "needs_verification": boolean, true if physical or authority verification is required

Be concise and decision-oriented. Avoid speculation beyond the available data.
Write for civic officials and engaged citizens, not technical audiences.
Do not use emojis, markdown, or excessive formatting.
"""

# ── Helpers ────────────────────────────────────────────────────────


def _unavailable(message: str) -> IntelligenceResponse:
    """Return a clean 'unavailable' response."""
    return IntelligenceResponse(
        available=False,
        needs_verification=True,
        status="unavailable",
        error_message=message,
    )


def _error(message: str) -> IntelligenceResponse:
    """Return a clean 'error' response without internal details."""
    return IntelligenceResponse(
        available=False,
        needs_verification=True,
        status="error",
        error_message=message,
    )


def _parse_ai_response(content: str) -> IntelligenceResponse:
    """Parse and validate the AI's JSON response."""
    data = json.loads(content)

    # Validate severity
    severity = data.get("severity", "medium")
    if severity not in ("low", "medium", "high", "critical"):
        severity = "medium"

    # Validate confidence
    confidence = data.get("confidence", 50)
    if not isinstance(confidence, int):
        try:
            confidence = int(confidence)
        except (ValueError, TypeError):
            confidence = 50
    confidence = max(0, min(100, confidence))

    # Ensure list fields are actually lists, truncate to 3
    raw_impacts = data.get("potential_impacts", [])
    impacts = [str(i) for i in raw_impacts[:3]] if isinstance(raw_impacts, list) else []

    raw_actions = data.get("recommended_actions", [])
    actions = [str(a) for a in raw_actions[:3]] if isinstance(raw_actions, list) else []

    return IntelligenceResponse(
        available=True,
        source="ai_model",
        summary=data.get("summary"),
        incident_type=data.get("incident_type"),
        severity=severity,
        confidence=confidence,
        potential_impacts=impacts,
        recommended_actions=actions,
        urgency_reason=data.get("urgency_reason"),
        needs_verification=data.get("needs_verification", True),
        status="success",
    )


# ── Service ─────────────────────────────────────────────────────────


class AIService:
    """Generates structured civic intelligence from incident reports."""

    def __init__(self) -> None:
        self._client = None
        if settings.openai_api_key:
            try:
                from openai import AsyncOpenAI

                self._client = AsyncOpenAI(
                    api_key=settings.openai_api_key,
                    timeout=30.0,
                    max_retries=1,
                )
            except ImportError:
                logger.warning("openai package not installed")
                self._client = None

    @property
    def is_available(self) -> bool:
        return self._client is not None

    async def analyze_incident(
        self, request: IntelligenceRequest
    ) -> IntelligenceResponse:
        """Generate structured intelligence for an incident report.

        Uses external AI if configured; otherwise falls back to the
        deterministic civic rules engine.
        """
        if not self.is_available:
            # No external AI — use civic rules engine
            logger.info("No AI provider configured — using civic rules engine")
            try:
                return analyze_with_rules(request)
            except Exception as e:
                logger.error("Rules engine failed: %s", type(e).__name__)
                return _error("Analysis could not be completed")

        try:
            user_prompt = (
                f"Incident Report:\n"
                f"Title: {request.title}\n"
                f"Description: {request.description}\n"
                f"Category: {request.category}\n"
                f"Location: {request.latitude:.4f}, {request.longitude:.4f}"
            )

            response = await self._client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                response_format={"type": "json_object"},
                temperature=0.3,
                max_tokens=500,
            )

            content = response.choices[0].message.content
            if not content:
                return _error("AI returned empty response")

            return _parse_ai_response(content)

        except json.JSONDecodeError:
            logger.error("OpenAI returned unparseable JSON")
            return _error("AI returned unparseable response")

        except Exception as e:
            # Import specific OpenAI exception types for granular handling
            try:
                from openai import (
                    APIConnectionError,
                    APITimeoutError,
                    AuthenticationError,
                    RateLimitError,
                )

                if isinstance(e, AuthenticationError):
                    logger.error("OpenAI authentication failed")
                    return _unavailable("AI service configuration error")

                if isinstance(e, RateLimitError):
                    logger.warning("OpenAI rate limit reached")
                    return _error(
                        "AI analysis is temporarily unavailable due to high demand"
                    )

                if isinstance(e, APITimeoutError):
                    logger.warning("OpenAI request timed out")
                    return _error("AI analysis timed out — please try again")

                if isinstance(e, APIConnectionError):
                    logger.error("OpenAI connection failed")
                    return _error("AI service is unreachable")

            except ImportError:
                pass

            # Fallback for unknown exceptions — log but never expose internals
            logger.error("Unexpected AI error: %s", type(e).__name__)
            return _error("Analysis could not be completed")


# Singleton
ai_service = AIService()
