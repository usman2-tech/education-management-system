"""
MODULE: Google Gemini Provider Adapter
PURPOSE:
Robust, asynchronous adapter for Google Gemini models using the official google-genai SDK.
Handles exponential backoff, rate limits, timeouts, and safe mock fallback when API keys are absent.

SECURITY:
API key is read strictly from environment configuration.
Never logs keys, tokens, or sensitive prompt contents.
"""

import asyncio
import logging
import time
from typing import Optional, List, Dict, Any
from src.config.settings import settings

logger = logging.getLogger("ems-gemini-adapter")

try:
    from google import genai
    from google.genai import types
    from google.genai.errors import APIError
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False
    logger.warning("google-genai SDK not installed or failed to import. Running in mock fallback mode.")


class GeminiAdapter:
    def __init__(self):
        self.api_key: Optional[str] = settings.gemini_api_key
        self.model_name: str = settings.gemini_model or "gemini-3.8-flash"
        self.timeout: int = settings.gemini_request_timeout or 30
        self.max_retries: int = settings.gemini_max_retries or 3
        self.client = None

        if GENAI_AVAILABLE and self.api_key and self.api_key.strip() and self.api_key != "your_gemini_api_key_here":
            try:
                self.client = genai.Client(api_key=self.api_key.strip())
                logger.info(f"Initialized Google Gen AI Client with model={self.model_name}")
            except Exception as e:
                logger.error(f"Failed to initialize Google Gen AI Client: {e}")
                self.client = None
        else:
            logger.info("Operating in Mock/Fallback Gemini mode (No valid GEMINI_API_KEY configured).")

    @property
    def is_live(self) -> bool:
        return self.client is not None

    async def generate_response(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        context_data: Optional[Dict[str, Any]] = None,
        history: Optional[List[Dict[str, str]]] = None,
    ) -> Dict[str, Any]:
        """
        Asynchronously generates a response with retries and timeout protection.
        """
        if not self.is_live:
            return self._generate_mock_response(prompt, system_instruction, context_data)

        # Build combined prompt with retrieved EMS records if present
        full_prompt = prompt
        if context_data:
            full_prompt = (
                f"VERIFIED LIVE EMS RECORDS (Read-only verified data from PostgreSQL):\n"
                f"{context_data}\n\n"
                f"USER QUESTION:\n{prompt}\n\n"
                f"Please provide an accurate, helpful answer grounded strictly in the verified data above."
            )

        # Attempt with bounded retries and exponential backoff
        last_error = None
        for attempt in range(1, self.max_retries + 1):
            try:
                start_time = time.time()
                logger.info(f"Dispatching Gemini request (attempt {attempt}/{self.max_retries}) model={self.model_name}")

                # Configure instruction
                config = types.GenerateContentConfig(
                    system_instruction=system_instruction or "You are the institutional AI assistant for Samahat Taibah Group.",
                    temperature=0.3,
                )

                # Execute with asyncio timeout
                response = await asyncio.wait_for(
                    self.client.aio.models.generate_content(
                        model=self.model_name,
                        contents=full_prompt,
                        config=config,
                    ),
                    timeout=self.timeout,
                )

                elapsed = time.time() - start_time
                text_output = response.text if hasattr(response, "text") and response.text else ""

                tokens = 0
                if hasattr(response, "usage_metadata") and response.usage_metadata:
                    tokens = getattr(response.usage_metadata, "total_token_count", 0)

                return {
                    "text": text_output,
                    "model_name": self.model_name,
                    "tokens_used": tokens or int((len(full_prompt) + len(text_output)) / 4),
                    "is_live": True,
                    "latency_sec": round(elapsed, 2),
                }

            except asyncio.TimeoutError:
                last_error = f"Gemini API request timed out after {self.timeout}s"
                logger.warning(f"Timeout on attempt {attempt}: {last_error}")
            except Exception as e:
                last_error = str(e)
                logger.warning(f"Error on attempt {attempt}: {last_error}")

            if attempt < self.max_retries:
                backoff_time = 2 ** attempt
                await asyncio.sleep(backoff_time)

        # If retries exhausted and mock fallback is enabled
        if settings.ai_mock_fallback:
            logger.warning(f"Live Gemini calls failed ({last_error}). Falling back to mock adapter.")
            mock_res = self._generate_mock_response(prompt, system_instruction, context_data)
            mock_res["fallback_reason"] = last_error
            return mock_res

        raise RuntimeError(f"Gemini API call failed after {self.max_retries} attempts: {last_error}")

    def _generate_mock_response(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        context_data: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Deterministic, realistic mock response generator when no live API key is present.
        """
        text = "Hello! I am your **Samahat Taibah Group AI Academic Assistant**.\n\n"

        if context_data:
            text += "Based on verified institutional records in our system:\n\n"
            for k, v in context_data.items():
                if isinstance(v, dict):
                    text += f"**{k.replace('_', ' ').title()}**:\n"
                    for subk, subv in v.items():
                        text += f"- {subk.replace('_', ' ').capitalize()}: {subv}\n"
                elif isinstance(v, list):
                    text += f"**{k.replace('_', ' ').title()}** ({len(v)} entries):\n"
                    for item in v[:3]:
                        text += f"- {item}\n"
                else:
                    text += f"- **{k.replace('_', ' ').capitalize()}**: {v}\n"
            text += "\n*Source: Live Educational Management System Records.*"
        else:
            text += (
                "I am fully integrated with the Educational Management System. You can ask me "
                "about your class timetable, attendance statistics, exam grades, homework tasks, "
                "or fee invoices, and I will retrieve your live records securely."
            )

        return {
            "text": text,
            "model_name": f"{self.model_name} (mock-adapter)",
            "tokens_used": int((len(prompt) + len(text)) / 4),
            "is_live": False,
            "latency_sec": 0.05,
        }


gemini_adapter = GeminiAdapter()
