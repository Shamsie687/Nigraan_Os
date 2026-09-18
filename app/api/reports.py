"""
Reports endpoints — POST /api/v1/reports and POST /api/v1/reports/upload.

Persists incoming incident payloads (title, description, category,
latitude, longitude, image_url) directly into the Supabase 'reports'
table. Storage credentials stay server-side.

Evidence gate: before anything is stored, the attached photo — sent as
a base64 payload or a multipart file upload — is verified by Gemini
(model configured via GEMINI_MODEL) and must show a real civic issue
(water leak, garbage, damaged road, electricity issue, flooding, air
quality). Invalid evidence (selfie, indoor room, pet, meme, blank) is
rejected with HTTP 400 and a message telling the citizen to provide
valid evidence. Verification is bounded by a strict 8-second deadline
and fails open when the provider times out or is unreachable: a warning
is logged and the report is stored without a verdict rather than
blocked. Only persistent verification configuration errors still
answer HTTP 503.

A successful insert answers HTTP 201 Created immediately, with the
stored row and the verification verdict in the JSON body.

Storage-layer failures keep the original contract and are reported in
the response body. Internal details are never exposed to clients.
"""

import base64
import logging

from fastapi import APIRouter, File, Form, UploadFile
from fastapi.responses import JSONResponse

from app.schemas.reports import (
    ImageVerificationInfo,
    ReportCreateRequest,
    ReportCreateResponse,
)
from app.services.image_verification_service import (
    MAX_IMAGE_BYTES,
    TOO_LARGE_IMAGE_MESSAGE,
    ImageVerificationOutcome,
    image_verification_service,
    rejection_message,
)
from app.services.reports_service import reports_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["reports"])

MISSING_IMAGE_MESSAGE = (
    "Image evidence is required. Please provide valid evidence — attach "
    "a photo of the civic issue (image_base64 or a multipart file)."
)


def _json_response(status_code: int, response: ReportCreateResponse) -> JSONResponse:
    """Serialise a structured response with an explicit HTTP status."""
    return JSONResponse(status_code=status_code, content=response.model_dump())


def _verification_info(outcome: ImageVerificationOutcome) -> ImageVerificationInfo:
    """Convert a verification outcome into its response schema."""
    return ImageVerificationInfo(
        is_civic_issue=outcome.is_civic_issue,
        detected_category=outcome.detected_category,
        invalid_reason=outcome.invalid_reason,
        confidence=outcome.confidence,
        reason=outcome.reason,
    )


def _internal_error_response() -> JSONResponse:
    """Final guard — always answer with structured JSON, never a crash."""
    return _json_response(
        500,
        ReportCreateResponse(
            success=False,
            status="error",
            error_message="Report could not be saved",
        ),
    )


async def _process_report(
    payload: ReportCreateRequest,
    image_base64: str | None,
    mime_type: str | None,
) -> JSONResponse:
    """Verify the evidence photo first, then store the report.

    Verification runs before any Supabase write: invalid evidence is
    rejected with HTTP 400 and a message asking for valid evidence.
    Provider timeouts/network failures fail open (the report is stored
    without a verdict); only persistent configuration errors answer
    HTTP 503.
    """
    if not image_base64 or not image_base64.strip():
        return _json_response(
            400,
            ReportCreateResponse(
                success=False,
                status="rejected",
                error_message=MISSING_IMAGE_MESSAGE,
            ),
        )

    outcome = await image_verification_service.verify_base64(image_base64, mime_type)

    if outcome.status == "unavailable":
        return _json_response(
            503,
            ReportCreateResponse(
                success=False,
                status="unavailable",
                error_message=outcome.error_message
                or "Image verification is temporarily unavailable — please try again",
            ),
        )

    if outcome.status != "valid":
        return _json_response(
            400,
            ReportCreateResponse(
                success=False,
                status="rejected",
                error_message=outcome.error_message or rejection_message(outcome),
                verification=_verification_info(outcome),
            ),
        )

    # Evidence verified — only now is the report inserted into Supabase.
    # The insert is fully awaited (async PostgREST call); the stored row
    # is answered immediately afterwards with HTTP 201 Created.
    result = await reports_service.create_report(payload)
    result.verification = _verification_info(outcome)
    return _json_response(201, result)


@router.post("/reports", response_model=ReportCreateResponse)
async def create_report(payload: ReportCreateRequest) -> JSONResponse:
    """
    Save an incident report (JSON request, photo as base64) into Supabase.

    The photo must pass Gemini verification first: invalid evidence
    returns HTTP 400 with a message asking for a valid civic-issue photo.
    """
    try:
        return await _process_report(
            payload, payload.image_base64, payload.image_mime_type
        )
    except Exception as e:
        # Final guard — always answer with structured JSON, never a crash
        logger.error("Unhandled error in report creation: %s", type(e).__name__)
        return _internal_error_response()


@router.post("/reports/upload", response_model=ReportCreateResponse)
async def create_report_upload(
    title: str = Form(..., min_length=3, max_length=200),
    description: str = Form(..., min_length=10, max_length=5000),
    category: str = Form(..., min_length=1, max_length=50),
    latitude: float = Form(..., ge=-90, le=90),
    longitude: float = Form(..., ge=-180, le=180),
    image_url: str | None = Form(default=None, max_length=1000),
    image: UploadFile | None = File(default=None),
) -> JSONResponse:
    """
    Save an incident report (multipart form, photo as a file) into Supabase.

    The uploaded photo must pass Gemini verification first: invalid
    evidence returns HTTP 400 with a message asking for a valid photo.
    """
    try:
        payload = ReportCreateRequest(
            title=title,
            description=description,
            category=category,
            latitude=latitude,
            longitude=longitude,
            image_url=image_url,
        )

        image_base64: str | None = None
        mime_type: str | None = None
        if image is not None:
            if image.size is not None and image.size > MAX_IMAGE_BYTES:
                return _json_response(
                    400,
                    ReportCreateResponse(
                        success=False,
                        status="rejected",
                        error_message=TOO_LARGE_IMAGE_MESSAGE,
                    ),
                )
            raw = await image.read()
            image_base64 = base64.b64encode(raw).decode("ascii")
            content_type = (image.content_type or "").strip().lower()
            mime_type = content_type if content_type.startswith("image/") else None

        return await _process_report(payload, image_base64, mime_type)
    except Exception as e:
        # Final guard — always answer with structured JSON, never a crash
        logger.error("Unhandled error in report upload: %s", type(e).__name__)
        return _internal_error_response()
