"""
Civic Assistant endpoint — POST /api/v1/assistant.

Answers citizen civic questions through Gemini when GOOGLE_AI_API_KEY
is configured, falling back to the deterministic civic rules engine.
The API key is read server-side only and is never exposed to clients.

Errors are returned in the response body (not as HTTP exceptions)
so the mobile app can display the appropriate UI state.
"""

import logging

from fastapi import APIRouter

from app.schemas.assistant import AssistantRequest, AssistantResponse
from app.services.assistant_service import assistant_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["assistant"])


@router.post("/assistant", response_model=AssistantResponse)
async def civic_assistant(request: AssistantRequest) -> AssistantResponse:
    """
    Generate a structured civic assistant reply for a citizen question.

    Returns AI analysis or a clear 'unavailable'/'error' state in the body.
    Internal error details are never exposed to the client.
    """
    try:
        return await assistant_service.respond(request)
    except Exception as e:
        # Final guard — always answer with structured JSON, never a crash
        logger.error("Unhandled error in civic assistant: %s", type(e).__name__)
        return AssistantResponse(
            available=False,
            status="error",
            error_message="Assistant could not complete the request",
        )
