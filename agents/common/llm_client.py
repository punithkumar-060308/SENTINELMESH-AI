"""LLM Client for SentinelMesh AI Agents.
Provides communication with Google Gemini API with fallback to deterministic heuristic generators.
Adheres strictly to the principle:
"The LLM may recommend; deterministic application code enforces permissions and executes approved operations."
"""

import os
import json
import logging
from typing import Type, TypeVar, Optional, Callable, Any
from pydantic import BaseModel
import httpx

logger = logging.getLogger("sentinelmesh.llm_client")

T = TypeVar("T", bound=BaseModel)

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"


class LLMClient:
    """Client for generating structured agent responses."""

    def __init__(self, api_key: Optional[str] = None, timeout: float = 6.0):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        self.timeout = timeout
        self.is_configured = bool(self.api_key and not self.api_key.startswith("your_"))

    def generate_structured(
        self,
        prompt: str,
        system_instruction: str,
        response_model: Type[T],
        fallback_factory: Callable[[], T],
    ) -> T:
        """Generate structured output adhering to `response_model`.
        Uses Gemini API if available, otherwise delegates cleanly to `fallback_factory`.
        """
        # In test or offline environment, or if no valid API key, execute fallback directly
        if not self.is_configured or os.getenv("TESTING") == "true":
            return fallback_factory()

        try:
            payload = {
                "contents": [
                    {
                        "role": "user",
                        "parts": [{"text": prompt}],
                    }
                ],
                "systemInstruction": {
                    "parts": [{"text": system_instruction}]
                },
                "generationConfig": {
                    "temperature": 0.1,
                    "responseMimeType": "application/json",
                },
            }

            url = f"{GEMINI_API_URL}?key={self.api_key}"
            with httpx.Client(timeout=self.timeout) as client:
                res = client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        text_content = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                        parsed_json = json.loads(text_content)
                        return response_model.model_validate(parsed_json)
                    logger.warning("Gemini returned empty candidates. Using fallback.")
                else:
                    logger.warning(f"Gemini API returned status {res.status_code}: {res.text[:150]}. Using fallback.")
        except Exception as exc:
            logger.warning(f"Gemini generation error: {exc}. Falling back to deterministic analysis.")

        return fallback_factory()


# Singleton client instance
llm_client = LLMClient()
