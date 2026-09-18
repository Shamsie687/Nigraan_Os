"""
Application configuration loaded from environment variables.

All secrets and environment-specific values are read from the
environment at runtime. No secrets are hardcoded.
"""

from __future__ import annotations

import os

from dotenv import load_dotenv

# Load .env file from the backend/ directory (or cwd)
load_dotenv()


class Settings:
    """Central configuration for the NigraanOS backend."""

    def __init__(self) -> None:
        self.debug: bool = os.getenv("DEBUG", "false").lower() == "true"
        self.backend_port: int = int(os.getenv("BACKEND_PORT", "8000"))
        self.backend_host: str = os.getenv("BACKEND_HOST", "0.0.0.0")

        # Database
        self.database_url: str = os.getenv(
            "DATABASE_URL",
            "postgresql://user:password@localhost:5432/nigraan_os",
        )

        # Supabase
        self.supabase_url: str = os.getenv("SUPABASE_URL", "")
        # Server-side Supabase key used by the reports endpoint. Falls back
        # to the legacy SUPABASE_ANON_KEY name when SUPABASE_KEY is unset.
        self.supabase_key: str = os.getenv("SUPABASE_KEY") or os.getenv(
            "SUPABASE_ANON_KEY", ""
        )
        self.supabase_service_role_key: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

        # AI Providers — accessed only server-side
        self.openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
        self.google_ai_api_key: str = os.getenv("GOOGLE_AI_API_KEY", "")
        # gemini-2.5-flash is retired for new API keys (the API answers
        # 404 and recommends gemini-3.6-flash). Override via GEMINI_MODEL.
        self.gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")

        # CORS
        self.allowed_origins: list[str] = os.getenv(
            "ALLOWED_ORIGINS", "http://localhost:8081"
        ).split(",")


settings = Settings()
