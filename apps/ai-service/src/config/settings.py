"""
MODULE: AI Service Configuration & Settings

PURPOSE:
Provides validated, environment-driven configuration for the FastAPI AI Service,
including inter-service security tokens, host/port settings, and future LLM providers.

SECURITY:
Requires internal shared secrets to authorize incoming orchestrations from the main backend.
"""

from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, model_validator


class Settings(BaseSettings):
    app_name: str = "EMS AI Service"
    app_version: str = "0.1.0"
    environment: str = Field(default="development", alias="AI_SERVICE_ENV")
    host: str = Field(default="127.0.0.1", alias="AI_SERVICE_HOST")
    port: int = Field(default=8000, alias="AI_SERVICE_PORT")
    log_level: str = Field(default="info", alias="AI_LOG_LEVEL")
    main_api_url: str = Field(default="http://localhost:4000/api/v1", alias="MAIN_API_INTERNAL_URL")
    internal_secret: str = Field(
        default="dev_internal_secret_key_change_in_production",
        alias="INTERNAL_SERVICE_SECRET",
    )
    langgraph_enabled: bool = True

    # Google Gemini AI Configuration (TASK 022)
    gemini_api_key: Optional[str] = Field(default=None, alias="GEMINI_API_KEY")
    gemini_model: str = Field(default="gemini-3.8-flash", alias="GEMINI_MODEL")
    gemini_request_timeout: int = Field(default=30, alias="GEMINI_REQUEST_TIMEOUT")
    gemini_max_retries: int = Field(default=3, alias="GEMINI_MAX_RETRIES")
    ai_mock_fallback: bool = Field(default=True, alias="AI_MOCK_FALLBACK")

    @model_validator(mode="after")
    def validate_production_security(self):
        if self.environment == "production":
            if self.internal_secret == "dev_internal_secret_key_change_in_production":
                raise ValueError(
                    "[CRITICAL] INTERNAL_SERVICE_SECRET must be changed from development default in production mode."
                )
        return self

    model_config = SettingsConfigDict(env_file=(".env", "../../.env"), extra="ignore")


settings = Settings()

