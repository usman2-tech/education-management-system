"""
MODULE: AI Service Settings Security - Unit Tests

PURPOSE:
Verifies that the FastAPI microservice configuration strictly validates production secrets (SEC-002 Hardening).
Prevents deployment in production with insecure, default, or empty internal secrets.
"""

import pytest
from pydantic import ValidationError
from src.config.settings import Settings


def test_settings_development_accepts_fallback():
    settings = Settings(
        environment="development",
        internal_secret="dev_internal_secret_key_change_in_production",
    )
    assert settings.environment == "development"
    assert settings.internal_secret == "dev_internal_secret_key_change_in_production"


def test_settings_production_rejects_default_fallback():
    with pytest.raises(ValidationError) as exc_info:
        Settings(
            environment="production",
            internal_secret="dev_internal_secret_key_change_in_production",
        )
    assert "INTERNAL_SERVICE_SECRET must be configured" in str(exc_info.value)


def test_settings_production_rejects_empty_secret():
    with pytest.raises(ValidationError) as exc_info:
        Settings(
            environment="production",
            internal_secret="",
        )
    assert "INTERNAL_SERVICE_SECRET must be configured" in str(exc_info.value)


def test_settings_production_rejects_short_secret():
    with pytest.raises(ValidationError) as exc_info:
        Settings(
            environment="production",
            internal_secret="short_secret",
        )
    assert "minimum of 16 characters" in str(exc_info.value)


def test_settings_production_accepts_secure_secret():
    secure_key = "a_very_secure_production_secret_32chars!"
    settings = Settings(
        environment="production",
        internal_secret=secure_key,
    )
    assert settings.environment == "production"
    assert settings.internal_secret == secure_key


def test_settings_production_accepts_env_aliases():
    secure_key = "another_secure_production_secret_32chars!"
    settings = Settings(
        AI_SERVICE_ENV="production",
        INTERNAL_SERVICE_SECRET=secure_key,
    )
    assert settings.environment == "production"
    assert settings.internal_secret == secure_key
