"""
Image Verification Service — Gemini vision gate for report evidence.

Before a report is inserted into the Supabase 'reports' table, the
attached photo is sent to Gemini (gemini-2.5-flash via
GOOGLE_AI_API_KEY) and classified as either a real civic issue — water
leak, garbage, damaged road, electricity issue, flooding, air quality —
or an invalid image such as a selfie, indoor room, pet, meme, or blank
frame. Invalid photos are rejected so the citizen is told to provide
valid evidence.

The call is bounded by a strict 8-second wall-clock deadline
(asyncio.wait_for). If Gemini hangs, times out, or is unreachable, the
verification fails open: a warning is logged and the report is accepted
without a verdict so submission is never blocked.

The API key is read server-side only and is never exposed to clients.
"""

from __future__ import annotations

import asyncio
import base64
import binascii
import json
import logging
from dataclasses import dataclass

import httpx

from app.core.config import settings
from app.services.gemini_utils import (
    extract_text,
    generate_content_url,
    parse_json_object,
)

logger = logging.getLogger(__name__)

# Strict wall-clock ceiling for one full verification (retries included).
# Enforced with asyncio.wait_for — at this deadline the hung provider is
# cancelled and the report is accepted without a verdict (fail-open).
VERIFICATION_TIMEOUT_SECONDS = 8.0

# Per-HTTP-attempt timeout. Kept below the wall-clock ceiling so a single
# hung attempt fails fast and the retry loop stays bounded.
REQUEST_TIMEOUT_SECONDS = 7.0

# Transient provider failures are retried with a short backoff before giving up.
REQUEST_ATTEMPTS = 3
RETRY_BACKOFF_SECONDS = (0.6, 1.8)
RETRYABLE_STATUS_CODES = (429, 500, 502, 503, 504)

# Civic-issue categories an acceptable evidence photo may fall into.
CIVIC_ISSUE_CATEGORIES = (
    "water_leak",
    "garbage",
    "damaged_road",
    "electricity",
    "flooding",
    "air_quality",
)

# Reasons an evidence photo is rejected (kept parallel to the prompt).
INVALID_REASONS = ("selfie", "indoor_room", "pet", "meme", "blank", "other")

# Image formats accepted by Gemini inline_data.
ALLOWED_IMAGE_MIME_TYPES = (
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
)
DEFAULT_IMAGE_MIME_TYPE = "image/jpeg"
MIME_TYPE_ALIASES = {"image/jpg": "image/jpeg"}

# Decoded-size cap — keeps Gemini inline_data requests safely bounded.
MAX_IMAGE_BYTES = 10 * 1024 * 1024  # 10 MB

UNREADABLE_IMAGE_MESSAGE = (
    "The photo could not be read. Please provide valid evidence — a clear "
    "JPEG, PNG, or WebP photo of the civic issue."
)

TOO_LARGE_IMAGE_MESSAGE = (
    "The photo is too large to verify. Please provide valid evidence — "
    "a photo under 10 MB."
)

IMAGE_VERIFICATION_SYSTEM_PROMPT = """\
You are the NigraanOS evidence verifier — a strict gatekeeper that
decides whether a photo can serve as evidence of a civic issue.

A photo is VALID evidence ONLY when it clearly and primarily shows a
real-world civic infrastructure problem in exactly one of these
categories:
- "water_leak": leaking or burst pipes, broken water supply, overflow
- "garbage": piled waste, overflowing bins, illegal dumping
- "damaged_road": potholes, broken pavement, damaged road surface
- "electricity": broken or dangling wires, damaged poles, transformers
- "flooding": street flooding, waterlogging, overflowing drains
- "air_quality": heavy smoke, smog, burning waste, air pollution

A photo is INVALID when it is anything else, including: selfies or
portraits, people posing, indoor rooms or furniture, pets or animals,
memes, screenshots, text or documents, food, unrelated vehicles, or
blank, dark, blurry, or unreadable images. When in doubt, mark the
photo INVALID.

Return ONLY valid JSON with these exact fields:
- "is_civic_issue": boolean — true ONLY for clear civic issue evidence
- "category": one of the valid categories above when is_civic_issue is
  true, otherwise null
- "invalid_reason": null when valid, otherwise one of "selfie",
  "indoor_room", "pet", "meme", "blank", "other"
- "confidence": integer 0-100 for the classification certainty
- "reason": one short sentence explaining the decision

Do not use emojis, markdown, or any extra text outside the JSON.
"""

# Citizen-facing labels for rejection messages.
_INVALID_REASON_LABELS = {
    "selfie": "a selfie or portrait",
    "indoor_room": "an indoor scene, not a civic issue",
    "pet": "a photo of a pet or animal",
    "meme": "a meme, screenshot, or text image",
    "blank": "a blank, dark, or blurry image",
    "other": "unrelated to any civic issue",
}


@dataclass
class ImageVerificationOutcome:
    """Result of verifying one evidence photo."""

    status: str  # "valid" | "invalid" | "unavailable"
    is_civic_issue: bool = False
    detected_category: str | None = None
    invalid_reason: str | None = None
    confidence: int | None = None
    reason: str | None = None
    error_message: str | None = None


# ── Helpers ────────────────────────────────────────────────────────


def _unavailable(message: str) -> ImageVerificationOutcome:
    """Return a clean 'unavailable' outcome for infrastructure failures."""
    return ImageVerificationOutcome(status="unavailable", error_message=message)


def _accepted_without_verification(reason: str) -> ImageVerificationOutcome:
    """Fail-open outcome for an unusable provider.

    Report submission must never be blocked by a slow or unreachable
    verification provider: the outcome reports is_civic_issue=True so the
    report is stored, with the reason explaining that verification was
    skipped.
    """
    return ImageVerificationOutcome(
        status="valid",
        is_civic_issue=True,
        reason=f"Verification skipped — {reason}. Report accepted without verification.",
    )


def _retry_delay(attempt: int) -> float:
    """Backoff before the next attempt (clamped to the configured delays)."""
    index = min(attempt, len(RETRY_BACKOFF_SECONDS) - 1)
    return RETRY_BACKOFF_SECONDS[index]


def _resolve_mime_type(mime_type: str | None) -> str:
    """Normalise a declared MIME type; raise ValueError when unsupported."""
    candidate = (mime_type or "").strip().lower()
    candidate = MIME_TYPE_ALIASES.get(candidate, candidate)
    if not candidate:
        return DEFAULT_IMAGE_MIME_TYPE
    if candidate not in ALLOWED_IMAGE_MIME_TYPES:
        raise ValueError("unsupported image type")
    return candidate


def strip_data_uri_prefix(payload: str) -> tuple[str, str | None]:
    """Strip a data URI header (e.g. 'data:image/jpeg;base64,') if present.

    Returns (clean_base64, mime_from_uri). Whitespace (chunked base64) is
    removed as well, so what remains is pure base64 — Gemini never sees a
    'data:' header, which would fail decoding and delay payload parsing.
    """
    cleaned = "".join(payload.split())
    if not cleaned.startswith("data:"):
        return cleaned, None
    header, _, body = cleaned.partition(",")
    mime = header[len("data:"):].split(";")[0] or None
    return body, mime


def normalize_image_payload(
    image_base64: str, mime_type: str | None = None
) -> tuple[bytes, str]:
    """Decode a base64 (or data URI) image payload.

    The data URI header and any whitespace are stripped before decoding,
    so only clean base64 bytes travel onward to Gemini. Returns
    (raw_bytes, mime_type), or raises ValueError with a short internal
    reason when the payload cannot be used as an image.
    """
    cleaned, uri_mime = strip_data_uri_prefix(image_base64)

    resolved_mime = _resolve_mime_type(mime_type or uri_mime)

    try:
        raw = base64.b64decode(cleaned, validate=True)
    except (binascii.Error, ValueError):
        raise ValueError("image data is not valid base64") from None

    if not raw:
        raise ValueError("image data is empty")
    if len(raw) > MAX_IMAGE_BYTES:
        raise ValueError("image exceeds the size limit")
    return raw, resolved_mime


def _as_bool(value: object) -> bool:
    """Interpret the model's boolean field tolerantly."""
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in ("true", "yes", "1")
    return False


def _as_confidence(value: object) -> int | None:
    """Clamp the model's confidence into an integer 0-100."""
    if value is None:
        return None
    try:
        return max(0, min(100, int(float(value))))
    except (TypeError, ValueError):
        return None


def _build_outcome(data: dict) -> ImageVerificationOutcome:
    """Turn the model's JSON verdict into a validated outcome."""
    is_civic = _as_bool(data.get("is_civic_issue"))
    confidence = _as_confidence(data.get("confidence"))
    raw_reason = data.get("reason")
    reason = raw_reason.strip()[:240] if isinstance(raw_reason, str) else None

    if is_civic:
        category = str(data.get("category") or "").strip().lower()
        if category not in CIVIC_ISSUE_CATEGORIES:
            category = ""
        return ImageVerificationOutcome(
            status="valid",
            is_civic_issue=True,
            detected_category=category or None,
            confidence=confidence,
            reason=reason,
        )

    invalid_reason = str(data.get("invalid_reason") or "").strip().lower()
    if invalid_reason not in INVALID_REASONS:
        invalid_reason = "other"
    return ImageVerificationOutcome(
        status="invalid",
        is_civic_issue=False,
        invalid_reason=invalid_reason,
        confidence=confidence,
        reason=reason,
    )


def rejection_message(outcome: ImageVerificationOutcome) -> str:
    """Citizen-facing message explaining why the photo cannot be used."""
    label = _INVALID_REASON_LABELS.get(
        outcome.invalid_reason or "other", "unrelated to any civic issue"
    )
    return (
        f"The photo appears to be {label}, so it cannot be used as "
        "evidence. Please provide valid evidence — a clear photo of the "
        "civic issue: water leak, garbage, damaged road, electricity "
        "issue, flooding, or air quality."
    )


# ── Service ─────────────────────────────────────────────────────────


class ImageVerificationService:
    """Classifies evidence photos as real civic issues or invalid images."""

    @property
    def is_available(self) -> bool:
        """True when a Google AI API key is configured."""
        return bool(settings.google_ai_api_key)

    async def verify_base64(
        self, image_base64: str, mime_type: str | None = None
    ) -> ImageVerificationOutcome:
        """Verify a base64 (or data URI) image payload."""
        try:
            raw, resolved_mime = normalize_image_payload(image_base64, mime_type)
        except ValueError as e:
            logger.info("Image payload rejected before verification: %s", e)
            return ImageVerificationOutcome(
                status="invalid",
                error_message=UNREADABLE_IMAGE_MESSAGE,
            )
        return await self.verify_bytes(raw, resolved_mime)

    async def verify_bytes(
        self, image_bytes: bytes, mime_type: str | None = None
    ) -> ImageVerificationOutcome:
        """Send one image to Gemini and classify it.

        Provider timeouts and network errors fail open (the image is
        reported as accepted so the report can still be stored); only
        genuine rejections and persistent configuration errors keep their
        respective invalid/unavailable status. Never raises and never
        exposes provider internals or the API key.
        """
        if not image_bytes:
            return ImageVerificationOutcome(
                status="invalid", error_message=UNREADABLE_IMAGE_MESSAGE
            )
        if len(image_bytes) > MAX_IMAGE_BYTES:
            return ImageVerificationOutcome(
                status="invalid", error_message=TOO_LARGE_IMAGE_MESSAGE
            )
        try:
            resolved_mime = _resolve_mime_type(mime_type)
        except ValueError:
            return ImageVerificationOutcome(
                status="invalid", error_message=UNREADABLE_IMAGE_MESSAGE
            )

        if not self.is_available:
            logger.warning(
                "Image verification requested but GOOGLE_AI_API_KEY is not set"
            )
            return _unavailable("Image verification is not configured")

        try:
            # Run the (retrying) Gemini call under a strict wall-clock
            # deadline: on timeout the task is cancelled and the report is
            # accepted without verification instead of failing.
            data = await asyncio.wait_for(
                self._ask_gemini(image_bytes, resolved_mime),
                timeout=VERIFICATION_TIMEOUT_SECONDS,
            )
            return _build_outcome(data)

        except (TimeoutError, httpx.TimeoutException):
            logger.warning(
                "Gemini image verification exceeded the %.0fs deadline — "
                "accepting report without verification",
                VERIFICATION_TIMEOUT_SECONDS,
            )
            return _accepted_without_verification("the verification provider timed out")

        except httpx.HTTPStatusError as e:
            status = e.response.status_code
            logger.error(
                "Gemini image verification failed: HTTP %s: %s",
                status,
                e.response.text[:200],
            )
            if status == 429 or status >= 500:
                logger.warning(
                    "Gemini provider transient HTTP %s — accepting report "
                    "without verification",
                    status,
                )
                return _accepted_without_verification(
                    "the verification provider is busy"
                )
            return self._map_http_error(status)

        except httpx.RequestError as e:
            logger.warning(
                "Gemini image verification network error (%s) — accepting "
                "report without verification",
                type(e).__name__,
            )
            return _accepted_without_verification(
                "the verification service is unreachable"
            )

        except ValueError as e:
            # Unparseable or empty model output (json.JSONDecodeError included)
            logger.error("Gemini returned unparseable verdict: %s", type(e).__name__)
            return _unavailable("Image verification returned an unreadable result")

        except Exception as e:
            logger.error("Unexpected image verification error: %s", type(e).__name__)
            return _unavailable("Image verification could not complete")

    async def _ask_gemini(self, image_bytes: bytes, mime_type: str) -> dict:
        """Call the Gemini generateContent endpoint and parse the verdict.

        Transient provider failures (high-demand 429/5xx statuses) and
        unparseable outputs are retried with a short backoff.
        """
        body = {
            "systemInstruction": {"parts": [{"text": IMAGE_VERIFICATION_SYSTEM_PROMPT}]},
            "contents": [
                {
                    "role": "user",
                    "parts": [
                        {
                            "text": (
                                "Classify the attached photo and return "
                                "the JSON verdict."
                            )
                        },
                        {
                            "inline_data": {
                                "mime_type": mime_type,
                                "data": base64.b64encode(image_bytes).decode("ascii"),
                            }
                        },
                    ],
                }
            ],
            "generationConfig": {
                "temperature": 0.0,
                "maxOutputTokens": 1024,
                "responseMimeType": "application/json",
            },
        }
        headers = {
            # Header auth (not a query param) so the key never appears in URLs
            "x-goog-api-key": settings.google_ai_api_key,
            "Content-Type": "application/json",
        }
        url = generate_content_url()
        content = json.dumps(body).encode("utf-8")
        last_attempt = REQUEST_ATTEMPTS - 1

        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS) as client:
            for attempt in range(REQUEST_ATTEMPTS):
                response = await client.post(url, headers=headers, content=content)

                if (
                    response.status_code in RETRYABLE_STATUS_CODES
                    and attempt < last_attempt
                ):
                    delay = _retry_delay(attempt)
                    logger.warning(
                        "Gemini transient HTTP %s (attempt %s/%s) — retrying in %.1fs",
                        response.status_code,
                        attempt + 1,
                        REQUEST_ATTEMPTS,
                        delay,
                    )
                    await asyncio.sleep(delay)
                    continue

                response.raise_for_status()
                text = ""
                try:
                    text = extract_text(response.json())
                    return parse_json_object(text)
                except ValueError as e:
                    if attempt < last_attempt:
                        logger.warning(
                            "Gemini verdict unparseable (attempt %s/%s): %s | %.200s",
                            attempt + 1,
                            REQUEST_ATTEMPTS,
                            e,
                            text,
                        )
                        await asyncio.sleep(_retry_delay(attempt))
                        continue
                    logger.error(
                        "Gemini verdict unparseable after %s attempts: %.200s",
                        REQUEST_ATTEMPTS,
                        text,
                    )
                    raise

        # Defensive — the loop above always returns or raises
        raise RuntimeError("Gemini verification retry loop exhausted")

    @staticmethod
    def _map_http_error(status: int) -> ImageVerificationOutcome:
        """Translate persistent Gemini HTTP failures into clean outcomes.

        Transient failures (429/5xx) never reach this point — they fail
        open so submissions are not blocked. Only persistent configuration
        problems (auth, retired model) still answer 'unavailable'.
        """
        if status in (401, 403):
            return _unavailable("Image verification configuration error")
        if status == 404:
            return _unavailable("Image verification model is not available")
        return _unavailable("Image verification could not complete")


# Singleton
image_verification_service = ImageVerificationService()
