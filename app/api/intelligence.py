"""
Intelligence endpoint — POST /api/v1/intelligence.

Accepts incident data from the mobile app and returns structured
civic intelligence analysis. AI API keys are never exposed to clients.

Errors are returned in the response body (not as HTTP exceptions)
so the mobile app can display the appropriate UI state.
"""

from fastapi import APIRouter

from app.schemas.intelligence import IntelligenceRequest, IntelligenceResponse
from app.services.ai_service import ai_service

router = APIRouter(prefix="/api/v1", tags=["intelligence"])


@router.post("/intelligence", response_model=IntelligenceResponse)
async def analyze_incident(request: IntelligenceRequest) -> IntelligenceResponse:
    """
    Generate structured civic intelligence for an incident report.

    Accepts title, description, category, and coordinates.
    Returns AI analysis or a clear 'unavailable'/'error' state in the body.
    Internal error details are never exposed to the client.
    """
    return await ai_service.analyze_incident(request)
