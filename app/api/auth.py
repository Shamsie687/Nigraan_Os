"""
Authentication endpoints — POST /api/v1/auth/signup and /api/v1/auth/signin.

Validate account payloads from the mobile app and issue an opaque
session token the client attaches as `Authorization: Bearer <token>`.
Errors are returned in the response body (not as HTTP exceptions) so
the mobile app can display the appropriate UI state.

Both endpoints are stateless: they perform the auth handshake without
writing to any database. Profile persistence happens on the device
(and in Supabase) once the client holds the returned identity.
"""

import logging
import secrets
from uuid import uuid4

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.schemas.auth import (
    AuthSessionResponse,
    AuthUser,
    SigninRequest,
    SignupRequest,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["auth"])

INVALID_NAME_MESSAGE = "Please enter a valid display name (2-50 characters)."
SESSION_TOKEN_BYTES = 32


def _issue_token() -> str:
    """Generate an opaque session token for the client."""
    return secrets.token_urlsafe(SESSION_TOKEN_BYTES)


def _json_response(status_code: int, response: AuthSessionResponse) -> JSONResponse:
    """Serialise a structured response with an explicit HTTP status."""
    return JSONResponse(status_code=status_code, content=response.model_dump())


@router.post("/auth/signup", response_model=AuthSessionResponse)
async def signup(payload: SignupRequest) -> JSONResponse:
    """
    Register a new account.

    Validates the display name and email, then returns
    {success, token, user} for the new session. Invalid payloads are
    rejected by request validation (422); whitespace-only names that
    shrink below the minimum after trimming answer 400.
    """
    display_name = payload.display_name.strip()
    email = payload.email.strip().lower()

    # Field validation checks the raw value — re-check after trimming
    # so padded names ("  a  ") cannot slip through the length bounds.
    if not 2 <= len(display_name) <= 50:
        return _json_response(
            400,
            AuthSessionResponse(
                success=False,
                status="error",
                error_message=INVALID_NAME_MESSAGE,
            ),
        )

    user = AuthUser(id=str(uuid4()), display_name=display_name, email=email)
    logger.info("Signup accepted: display_name=%r email=%s", display_name, email)
    return _json_response(
        200, AuthSessionResponse(success=True, token=_issue_token(), user=user)
    )


@router.post("/auth/signin", response_model=AuthSessionResponse)
async def signin(payload: SigninRequest) -> JSONResponse:
    """
    Sign an existing account in.

    Validates the email and returns {success, token, user} for the
    session. When no display name is provided, the email local part is
    used so the payload always carries a usable name.
    """
    email = payload.email.strip().lower()
    display_name = (payload.display_name or email.split("@")[0]).strip()

    if len(display_name) < 2:
        # Single-character local parts fall back to the full address.
        display_name = email
    display_name = display_name[:50]

    user = AuthUser(id=str(uuid4()), display_name=display_name, email=email)
    logger.info("Sign-in accepted: email=%s", email)
    return _json_response(
        200, AuthSessionResponse(success=True, token=_issue_token(), user=user)
    )
