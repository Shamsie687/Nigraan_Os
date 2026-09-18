"""
Civic Assistant Service — Gemini-powered civic guidance.

When GOOGLE_AI_API_KEY is configured, the assistant answers citizen
questions through the Gemini API. Without a key, the deterministic
civic rules engine (civic_rules.py) generates the assessment instead,
so the assistant stays useful without an external provider. The API
key is read server-side only and is never exposed to clients.
"""

from __future__ import annotations

import logging

import httpx

from app.core.config import settings
from app.schemas.assistant import AssistantRequest, AssistantResponse
from app.schemas.intelligence import IntelligenceRequest
from app.services.civic_rules import analyze_with_rules
from app.services.gemini_utils import (
    extract_text,
    generate_content_url,
    parse_json_object,
)

logger = logging.getLogger(__name__)

# ── Gemini API ─────────────────────────────────────────────────────

REQUEST_TIMEOUT_SECONDS = 30.0

VALID_SEVERITIES = ("low", "medium", "high", "critical")

ASSISTANT_SYSTEM_PROMPT = """\
You are the NigraanOS Civic Assistant — a calm, precise guide for
civic infrastructure concerns in Pakistan.

Answer the citizen's question and return ONLY valid JSON with these exact fields:
- "reply": 2-4 sentence plain-language answer that addresses the question
- "severity": one of "low", "medium", "high", "critical"
- "confidence": integer 0-100 reflecting how certain the assessment is
- "potential_impacts": array of up to 3 short impact descriptions
- "recommended_actions": array of up to 3 concrete next steps for authorities
- "needs_verification": boolean, true if authority or physical verification is required

Be concise and decision-oriented. Avoid speculation beyond the available information.
Write for civic officials and engaged citizens, not technical audiences.
Do not use emojis, markdown, or excessive formatting.
"""

# Keyword map used to pick a category when the rules engine acts as fallback.
# Ordered so specific urgency contexts (emergency, flooding) are matched first.
_CATEGORY_KEYWORDS: dict[str, tuple[str, ...]] = {
    "emergency": ("emergency", "fire", "accident", "injured", "collapse", "explosion", "gas leak"),
    "flooding": ("flood", "drain", "waterlogging", "rain"),
    "water": ("water", "pipe", "tap", "leak", "supply"),
    "roads": ("road", "pothole", "street", "highway", "bridge", "footpath"),
    "electricity": ("electric", "power", "outage", "blackout", "wire", "transformer"),
    "waste": ("garbage", "waste", "trash", "dump", "sewage", "sanitation"),
    "air_quality": ("air", "smog", "pollution", "smoke"),
    "healthcare": ("hospital", "clinic", "doctor", "medicine", "health"),
    "education": ("school", "college", "student", "education", "class"),
    "public_safety": ("safety", "crime", "theft", "harassment", "danger"),
}

# ── Helpers ────────────────────────────────────────────────────────


def _error(message: str) -> AssistantResponse:
    """Return a clean 'error' response without internal details."""
    return AssistantResponse(
        available=False,
        needs_verification=True,
        status="error",
        error_message=message,
    )


def _unavailable(message: str) -> AssistantResponse:
    """Return a clean 'unavailable' response."""
    return AssistantResponse(
        available=False,
        needs_verification=True,
        status="unavailable",
        error_message=message,
    )


def _detect_category(message: str) -> str:
    """Pick the most relevant civic category from free-text keywords."""
    text = message.lower()
    for category, keywords in _CATEGORY_KEYWORDS.items():
        if any(keyword in text for keyword in keywords):
            return category
    return "other"


def _build_response(data: dict) -> AssistantResponse:
    """Validate the parsed JSON and build a structured assistant response."""
    reply = data.get("reply")
    if not isinstance(reply, str) or not reply.strip():
        raise ValueError("Gemini response contained no reply text")

    severity = data.get("severity", "medium")
    if severity not in VALID_SEVERITIES:
        severity = "medium"

    confidence = data.get("confidence", 50)
    if not isinstance(confidence, int):
        try:
            confidence = int(confidence)
        except (ValueError, TypeError):
            confidence = 50
    confidence = max(0, min(100, confidence))

    raw_impacts = data.get("potential_impacts", [])
    impacts = [str(i) for i in raw_impacts[:3]] if isinstance(raw_impacts, list) else []

    raw_actions = data.get("recommended_actions", [])
    actions = [str(a) for a in raw_actions[:3]] if isinstance(raw_actions, list) else []

    return AssistantResponse(
        available=True,
        source="gemini",
        reply=reply.strip(),
        severity=severity,
        confidence=confidence,
        potential_impacts=impacts,
        recommended_actions=actions,
        needs_verification=bool(data.get("needs_verification", True)),
        status="success",
    )


# ── Service ─────────────────────────────────────────────────────────


class CivicAssistantService:
    """Answers civic questions via Gemini, falling back to the rules engine."""

    @property
    def is_available(self) -> bool:
        """True when a Google AI API key is configured."""
        return bool(settings.google_ai_api_key)

    async def respond(self, request: AssistantRequest) -> AssistantResponse:
        """Generate a structured assistant reply for a civic question.

        Returns a structured success/error payload — never raises and
        never exposes internal details or the API key.
        """
        if not self.is_available:
            logger.info("No GOOGLE_AI_API_KEY configured — using civic rules engine")
            return self._rules_fallback(request)

        try:
            return await self._ask_gemini(request)

        except httpx.TimeoutException:
            logger.warning("Gemini request timed out")
            return _error("Assistant took too long to respond — please try again")

        except httpx.HTTPStatusError as e:
            logger.error("Gemini request failed: HTTP %s", e.response.status_code)
            return self._map_http_error(e.response.status_code)

        except httpx.RequestError as e:
            logger.error("Gemini connection failed: %s", type(e).__name__)
            return _error("Assistant service is unreachable")

        except ValueError as e:
            # Unparseable or empty model output (json.JSONDecodeError included)
            logger.error("Gemini returned unparseable output: %s", type(e).__name__)
            return _error("Assistant returned an unparseable response")

        except Exception as e:
            logger.error("Unexpected assistant error: %s", type(e).__name__)
            return _error("Assistant could not complete the request")

    async def _ask_gemini(self, request: AssistantRequest) -> AssistantResponse:
        """Call the Gemini generateContent endpoint and parse the reply."""
        url = generate_content_url()
        body = {
            "systemInstruction": {"parts": [{"text": ASSISTANT_SYSTEM_PROMPT}]},
            "contents": [
                {"role": "user", "parts": [{"text": request.message}]},
            ],
            "generationConfig": {
                "temperature": 0.3,
                "maxOutputTokens": 600,
                "responseMimeType": "application/json",
            },
        }
        headers = {
            # Header auth (not a query param) so the key never appears in URLs
            "x-goog-api-key": settings.google_ai_api_key,
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS) as client:
            response = await client.post(url, headers=headers, json=body)
            response.raise_for_status()
            data = response.json()

        return _build_response(parse_json_object(extract_text(data)))

    @staticmethod
    def _map_http_error(status: int) -> AssistantResponse:
        """Translate Gemini HTTP failures into clean client messages."""
        if status in (401, 403):
            return _unavailable("Assistant service configuration error")
        if status == 404:
            return _unavailable("Assistant service is not available right now")
        if status == 429:
            return _error("Assistant is temporarily unavailable due to high demand")
        if status >= 500:
            return _error("Assistant service is temporarily unavailable")
        return _error("Assistant could not complete the request")

    @staticmethod
    def _rules_fallback(request: AssistantRequest) -> AssistantResponse:
        """Answer from the deterministic rules engine when Gemini is off."""
        try:
            message = request.message.strip()
            analysis = analyze_with_rules(
                IntelligenceRequest(
                    title=message[:200] or "Civic issue",
                    description=message or "Civic issue",
                    category=_detect_category(message),
                    latitude=0.0,
                    longitude=0.0,
                )
            )

            reply_parts: list[str] = []
            if analysis.summary:
                reply_parts.append(analysis.summary)
            if analysis.urgency_reason:
                reply_parts.append(f"Urgency: {analysis.urgency_reason}")
            if analysis.recommended_actions:
                actions = "\n".join(f"• {a}" for a in analysis.recommended_actions)
                reply_parts.append(f"Recommended actions:\n{actions}")

            return AssistantResponse(
                available=True,
                source="rules_engine",
                reply="\n\n".join(reply_parts) or None,
                severity=analysis.severity,
                confidence=analysis.confidence,
                potential_impacts=analysis.potential_impacts,
                recommended_actions=analysis.recommended_actions,
                needs_verification=True,
                status="success",
            )
        except Exception as e:
            logger.error("Assistant rules fallback failed: %s", type(e).__name__)
            return _error("Assessment could not be generated")


# Singleton
assistant_service = CivicAssistantService()
