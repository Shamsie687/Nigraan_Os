"""
Shared Gemini API helpers.

Small, dependency-free utilities used by every service that talks to
the Gemini generateContent endpoint: URL building plus tolerant
extraction and parsing of the model's JSON output.
"""

from __future__ import annotations

import json

from app.core.config import settings

GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models"


def generate_content_url() -> str:
    """Build the generateContent endpoint URL for the configured model."""
    return f"{GEMINI_API_BASE}/{settings.gemini_model}:generateContent"


def extract_text(data: dict) -> str:
    """Pull the generated text out of a Gemini generateContent response.

    Thought parts (thinking models) and non-text parts are ignored so
    only the model's actual answer is returned.
    """
    candidates = data.get("candidates")
    if not isinstance(candidates, list) or not candidates:
        raise ValueError("no candidates in Gemini response")

    parts = candidates[0].get("content", {}).get("parts")
    if not isinstance(parts, list):
        raise ValueError("no content parts in Gemini response")

    text = "".join(
        str(part.get("text", ""))
        for part in parts
        if isinstance(part, dict) and part.get("thought") is not True
    ).strip()
    if not text:
        raise ValueError("empty text in Gemini response")
    return text


def parse_json_object(text: str) -> dict:
    """Parse the model's text into a JSON object, tolerating code fences."""
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        cleaned = (
            text.strip()
            .removeprefix("```json")
            .removeprefix("```")
            .removesuffix("```")
            .strip()
        )
        data = json.loads(cleaned)

    if not isinstance(data, dict):
        raise ValueError("Gemini response was not a JSON object")
    return data
