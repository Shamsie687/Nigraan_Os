"""
Authentication request and response schemas.

Defines the typed interface for account signup and sign-in. Both
endpoints perform a stateless handshake: validate the payload and issue
a session token the client attaches as an `Authorization: Bearer`
credential on subsequent requests.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

# Pragmatic email shape check — full RFC validation is deliberately out of
# scope for the client auth handshake.
EMAIL_PATTERN = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"


class SignupRequest(BaseModel):
    """Signup payload sent from mobile. Accepts camelCase and snake_case."""

    model_config = ConfigDict(populate_by_name=True)

    display_name: str = Field(..., alias="displayName", min_length=2, max_length=50)
    email: str = Field(..., pattern=EMAIL_PATTERN, max_length=254)


class SigninRequest(BaseModel):
    """Sign-in payload sent from mobile. Accepts camelCase and snake_case."""

    model_config = ConfigDict(populate_by_name=True)

    email: str = Field(..., pattern=EMAIL_PATTERN, max_length=254)
    display_name: str | None = Field(
        default=None, alias="displayName", min_length=2, max_length=50
    )


class AuthUser(BaseModel):
    """User record returned after a successful signup or sign-in."""

    id: str
    display_name: str
    email: str


class AuthSessionResponse(BaseModel):
    """Structured auth result carrying the session token payload."""

    success: bool
    status: str = "success"  # success / error
    token: str | None = None
    user: AuthUser | None = None
    error_message: str | None = None
