import importlib.util
from pathlib import Path

import pytest

GOOD_ENV = """
APP_ENV=production
POSTGRES_USER=service_platform
POSTGRES_PASSWORD=super_secure_random_password_value_123
POSTGRES_DB=service_platform
DATABASE_URL=postgresql+asyncpg://service_platform:super_secure_random_password_value_123@postgres:5432/service_platform
JWT_SECRET_KEY=0123456789abcdef0123456789abcdef0123456789ab
WEB_HTTP_PORT=80
CORS_ORIGINS=https://example.com
API_DOCS_ENABLED=false
STRIPE_SECRET_KEY=
SMTP_HOST=
SMTP_USER=
SMTP_PASSWORD=
"""


def _load_module():
    import sys

    project_root = Path(__file__).resolve().parents[2]
    candidates = [
        project_root / "scripts" / "check_production_env.py",
        Path("/scripts/check_production_env.py"),
    ]
    script_path = next((path for path in candidates if path.is_file()), None)
    assert script_path is not None, "check_production_env.py not found"
    spec = importlib.util.spec_from_file_location("check_production_env", script_path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def test_script_has_main() -> None:
    module = _load_module()
    assert hasattr(module, "main")
    assert hasattr(module, "validate_production_env")


def test_validate_good_env_strict() -> None:
    module = _load_module()
    parsed = {}
    for raw_line in GOOD_ENV.strip().splitlines():
        key, _, value = raw_line.partition("=")
        parsed[key.strip()] = value.strip()

    result = module.validate_production_env(parsed, strict=True)
    assert result.passed, result.failures
    assert any("Stripe not configured" in warning for warning in result.warnings)
    assert any("SMTP not configured" in warning for warning in result.warnings)


def test_fail_short_jwt_secret() -> None:
    module = _load_module()
    parsed = {
        "APP_ENV": "production",
        "POSTGRES_USER": "service_platform",
        "POSTGRES_PASSWORD": "long_enough_prod_password_value",
        "POSTGRES_DB": "service_platform",
        "DATABASE_URL": (
            "postgresql+asyncpg://service_platform:long_enough_prod_password_value"
            "@postgres:5432/service_platform"
        ),
        "JWT_SECRET_KEY": "too_short",
        "WEB_HTTP_PORT": "80",
        "CORS_ORIGINS": "https://example.com",
        "API_DOCS_ENABLED": "false",
    }

    result = module.validate_production_env(parsed, strict=True)
    assert not result.passed
    assert any("JWT_SECRET_KEY" in failure for failure in result.failures)


def test_fail_missing_database_url() -> None:
    module = _load_module()
    parsed = {
        "APP_ENV": "production",
        "POSTGRES_USER": "service_platform",
        "POSTGRES_PASSWORD": "long_enough_prod_password_value",
        "POSTGRES_DB": "service_platform",
        "JWT_SECRET_KEY": "0123456789abcdef0123456789abcdef0123456789ab",
        "WEB_HTTP_PORT": "80",
        "CORS_ORIGINS": "https://example.com",
        "API_DOCS_ENABLED": "false",
    }

    result = module.validate_production_env(parsed, strict=True)
    assert not result.passed
    assert any("DATABASE_URL" in failure for failure in result.failures)


def test_strict_fails_placeholder_password() -> None:
    module = _load_module()
    parsed = {
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
        "CORS_ORIGINS": "https://example.com",
        "API_DOCS_ENABLED": "false",
    }

    result = module.validate_production_env(parsed, strict=True)
    assert not result.passed
    assert any("POSTGRES_PASSWORD" in failure for failure in result.failures)


def test_strict_fails_missing_cors_origins() -> None:
    module = _load_module()
    parsed = {
        "APP_ENV": "production",
        "POSTGRES_USER": "service_platform",
        "POSTGRES_PASSWORD": "super_secure_random_password_value_123",
        "POSTGRES_DB": "service_platform",
        "DATABASE_URL": (
            "postgresql+asyncpg://service_platform:super_secure_random_password_value_123"
            "@postgres:5432/service_platform"
        ),
        "JWT_SECRET_KEY": "0123456789abcdef0123456789abcdef0123456789ab",
        "WEB_HTTP_PORT": "80",
        "API_DOCS_ENABLED": "false",
    }

    result = module.validate_production_env(parsed, strict=True)
    assert not result.passed
    assert any("CORS_ORIGINS" in failure for failure in result.failures)


def test_parse_env_file_ignores_comments(tmp_path: Path) -> None:
    module = _load_module()
    env_file = tmp_path / ".env"
    env_file.write_text(
        "# comment\nAPP_ENV=production\n\nPOSTGRES_USER=service_platform\n",
        encoding="utf-8",
    )
    parsed = module.parse_env_file(env_file)
    assert parsed["APP_ENV"] == "production"
    assert parsed["POSTGRES_USER"] == "service_platform"


def test_main_returns_nonzero_on_failure(tmp_path: Path) -> None:
    module = _load_module()
    env_file = tmp_path / ".env"
    env_file.write_text("APP_ENV=production\n", encoding="utf-8")
    assert module.main(["--env-file", str(env_file), "--strict"]) == 1
