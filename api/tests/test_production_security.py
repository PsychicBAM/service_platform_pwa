import importlib.util
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.config import Settings, get_settings
from app.main import app


def _load_env_script():
    project_root = Path(__file__).resolve().parents[2]
    candidates = [
        project_root / "scripts" / "check_production_env.py",
        Path("/scripts/check_production_env.py"),
    ]
    script_path = next((path for path in candidates if path.is_file()), None)
    assert script_path is not None
    spec = importlib.util.spec_from_file_location("check_production_env", script_path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def test_docs_enabled_for_local_dev(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("APP_ENV", "local")
    monkeypatch.delenv("API_DOCS_ENABLED", raising=False)
    get_settings.cache_clear()
    settings = get_settings()
    assert settings.docs_enabled is True


def test_docs_disabled_when_production_and_api_docs_false(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("API_DOCS_ENABLED", "false")
    monkeypatch.setenv("CORS_ORIGINS", "https://app.example.com")
    get_settings.cache_clear()
    settings = get_settings()
    assert settings.docs_enabled is False


def test_docs_can_be_enabled_explicitly_in_production(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("API_DOCS_ENABLED", "true")
    monkeypatch.setenv("CORS_ORIGINS", "https://app.example.com")
    get_settings.cache_clear()
    settings = get_settings()
    assert settings.docs_enabled is True


def test_production_rejects_wildcard_cors(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("CORS_ORIGINS", "*")
    monkeypatch.setenv("API_DOCS_ENABLED", "false")
    get_settings.cache_clear()
    with pytest.raises(ValueError, match="Wildcard CORS"):
        get_settings()


def test_production_rejects_empty_cors(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("CORS_ORIGINS", "")
    monkeypatch.setenv("API_DOCS_ENABLED", "false")
    get_settings.cache_clear()
    with pytest.raises(ValueError, match="CORS_ORIGINS must be set"):
        get_settings()


def test_local_docs_route_available() -> None:
    get_settings.cache_clear()
    settings = get_settings()
    if not settings.docs_enabled:
        pytest.skip("Docs disabled in current test environment")
    client = TestClient(app)
    response = client.get("/docs")
    assert response.status_code == 200


def test_strict_env_script_fails_wildcard_cors() -> None:
    module = _load_env_script()
    env = {
        "APP_ENV": "production",
        "POSTGRES_USER": "service_platform",
        "POSTGRES_PASSWORD": "example-postgres-password-for-unit-tests-only",
        "POSTGRES_DB": "service_platform",
        "DATABASE_URL": (
            "postgresql+asyncpg://service_platform:example-postgres-password-for-unit-tests-only"
            "@postgres:5432/service_platform"
        ),
        "JWT_SECRET_KEY": "test-jwt-placeholder-thirty-two-characters-min",
        "WEB_HTTP_PORT": "80",
        "CORS_ORIGINS": "*",
        "API_DOCS_ENABLED": "false",
    }
    result = module.validate_production_env(env, strict=True)
    assert not result.passed
    assert "cors_origins_wildcard_not_allowed" in result.failures


def test_strict_env_script_fails_api_docs_enabled() -> None:
    module = _load_env_script()
    env = {
        "APP_ENV": "production",
        "POSTGRES_USER": "service_platform",
        "POSTGRES_PASSWORD": "example-postgres-password-for-unit-tests-only",
        "POSTGRES_DB": "service_platform",
        "DATABASE_URL": (
            "postgresql+asyncpg://service_platform:example-postgres-password-for-unit-tests-only"
            "@postgres:5432/service_platform"
        ),
        "JWT_SECRET_KEY": "test-jwt-placeholder-thirty-two-characters-min",
        "WEB_HTTP_PORT": "80",
        "CORS_ORIGINS": "https://example.com",
        "API_DOCS_ENABLED": "true",
    }
    result = module.validate_production_env(env, strict=True)
    assert not result.passed
    assert "api_docs_enabled_in_production" in result.failures


def test_strict_env_script_fails_placeholder_jwt() -> None:
    module = _load_env_script()
    env = {
        "APP_ENV": "production",
        "POSTGRES_USER": "service_platform",
        "POSTGRES_PASSWORD": "example-postgres-password-for-unit-tests-only",
        "POSTGRES_DB": "service_platform",
        "DATABASE_URL": (
            "postgresql+asyncpg://service_platform:example-postgres-password-for-unit-tests-only"
            "@postgres:5432/service_platform"
        ),
        "JWT_SECRET_KEY": "CHANGE_ME_GENERATE_A_LONG_RANDOM_SECRET",
        "WEB_HTTP_PORT": "80",
        "CORS_ORIGINS": "https://example.com",
        "API_DOCS_ENABLED": "false",
    }
    result = module.validate_production_env(env, strict=True)
    assert not result.passed
    assert "jwt_secret_key_weak_or_placeholder" in result.failures


def test_strict_env_script_fails_email_enabled_without_smtp() -> None:
    module = _load_env_script()
    env = {
        "APP_ENV": "production",
        "POSTGRES_USER": "service_platform",
        "POSTGRES_PASSWORD": "example-postgres-password-for-unit-tests-only",
        "POSTGRES_DB": "service_platform",
        "DATABASE_URL": (
            "postgresql+asyncpg://service_platform:example-postgres-password-for-unit-tests-only"
            "@postgres:5432/service_platform"
        ),
        "JWT_SECRET_KEY": "test-jwt-placeholder-thirty-two-characters-min",
        "WEB_HTTP_PORT": "80",
        "CORS_ORIGINS": "https://example.com",
        "API_DOCS_ENABLED": "false",
        "EMAIL_ENABLED": "true",
        "EMAIL_DRY_RUN": "false",
        "SMTP_HOST": "",
        "SMTP_FROM_EMAIL": "",
    }
    result = module.validate_production_env(env, strict=True)
    assert not result.passed
    assert "smtp_host_required_live_email" in result.failures


def test_strict_env_script_fails_stripe_enabled_without_secrets() -> None:
    module = _load_env_script()
    env = {
        "APP_ENV": "production",
        "POSTGRES_USER": "service_platform",
        "POSTGRES_PASSWORD": "example-postgres-password-for-unit-tests-only",
        "POSTGRES_DB": "service_platform",
        "DATABASE_URL": (
            "postgresql+asyncpg://service_platform:example-postgres-password-for-unit-tests-only"
            "@postgres:5432/service_platform"
        ),
        "JWT_SECRET_KEY": "test-jwt-placeholder-thirty-two-characters-min",
        "WEB_HTTP_PORT": "80",
        "CORS_ORIGINS": "https://example.com",
        "API_DOCS_ENABLED": "false",
        "STRIPE_ENABLED": "true",
        "STRIPE_SECRET_KEY": "",
        "STRIPE_WEBHOOK_SECRET": "",
        "STRIPE_PRICE_STARTER": "",
        "STRIPE_PRICE_BUSINESS": "",
        "STRIPE_PRICE_PRO": "",
        "STRIPE_SUCCESS_URL": "",
        "STRIPE_CANCEL_URL": "",
    }
    result = module.validate_production_env(env, strict=True)
    assert not result.passed
    assert "stripe_secret_key_required" in result.failures


def test_env_script_output_never_contains_secret_values(capsys) -> None:
    module = _load_env_script()
    env = {
        "APP_ENV": "production",
        "POSTGRES_USER": "service_platform",
        "POSTGRES_PASSWORD": "example-postgres-password-for-unit-tests-only",
        "POSTGRES_DB": "service_platform",
        "DATABASE_URL": (
            "postgresql+asyncpg://service_platform:example-postgres-password-for-unit-tests-only"
            "@postgres:5432/service_platform"
        ),
        "JWT_SECRET_KEY": "test-jwt-placeholder-thirty-two-characters-min",
        "WEB_HTTP_PORT": "80",
        "CORS_ORIGINS": "https://example.com",
        "API_DOCS_ENABLED": "false",
        "STRIPE_ENABLED": "true",
        "STRIPE_SECRET_KEY": "sk_test_REDACTED",
        "STRIPE_WEBHOOK_SECRET": "whsec_REDACTED",
        "STRIPE_PRICE_STARTER": "price_starter_test_001",
        "STRIPE_PRICE_BUSINESS": "price_business_test_001",
        "STRIPE_PRICE_PRO": "price_pro_test_001",
        "STRIPE_SUCCESS_URL": "https://example.com/billing/success",
        "STRIPE_CANCEL_URL": "https://example.com/billing/cancel",
    }
    result = module.validate_production_env(env, strict=True)
    module.print_result(result)
    output = capsys.readouterr().out
    for forbidden in ("sk_test_REDACTED", "whsec_REDACTED", "example-postgres-password"):
        assert forbidden not in output


def test_non_strict_env_script_warns_optional_integrations() -> None:
    module = _load_env_script()
    env = {
        "APP_ENV": "production",
        "POSTGRES_USER": "service_platform",
        "POSTGRES_PASSWORD": "CHANGE_ME_STRONG_POSTGRES_PASSWORD",
        "POSTGRES_DB": "service_platform",
        "DATABASE_URL": (
            "postgresql+asyncpg://service_platform:CHANGE_ME_STRONG_POSTGRES_PASSWORD"
            "@postgres:5432/service_platform"
        ),
        "JWT_SECRET_KEY": "CHANGE_ME_GENERATE_A_LONG_RANDOM_SECRET",
        "WEB_HTTP_PORT": "80",
        "CORS_ORIGINS": "https://your-domain.example",
        "STRIPE_ENABLED": "false",
        "STRIPE_SECRET_KEY": "",
        "SMTP_HOST": "",
    }
    result = module.validate_production_env(env, strict=False)
    assert result.passed
    assert "stripe_disabled" in result.warnings
    assert "smtp_not_configured" in result.warnings


def test_settings_docs_enabled_property_direct() -> None:
    local = Settings(app_env="local", api_docs_enabled=None)
    assert local.docs_enabled is True

    production = Settings(
        app_env="production",
        api_docs_enabled=False,
        cors_origins="https://app.example.com",
    )
    assert production.docs_enabled is False
