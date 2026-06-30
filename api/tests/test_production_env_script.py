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
STRIPE_ENABLED=false
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_STARTER=
STRIPE_PRICE_BUSINESS=
STRIPE_PRICE_PRO=
STRIPE_SUCCESS_URL=https://example.com/billing/success
STRIPE_CANCEL_URL=https://example.com/billing/cancel
EMAIL_ENABLED=false
EMAIL_DRY_RUN=true
SMTP_HOST=
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM_EMAIL=
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
    assert any("Stripe disabled" in warning for warning in result.warnings)
    assert any(
        "Email notifications disabled" in warning or "SMTP not configured" in warning
        for warning in result.warnings
    )


def test_strict_fails_live_email_without_smtp_host() -> None:
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
        "CORS_ORIGINS": "https://example.com",
        "API_DOCS_ENABLED": "false",
        "EMAIL_ENABLED": "true",
        "EMAIL_DRY_RUN": "false",
        "SMTP_HOST": "",
        "SMTP_FROM_EMAIL": "",
    }

    result = module.validate_production_env(parsed, strict=True)
    assert not result.passed
    assert any("SMTP_HOST" in failure for failure in result.failures)
    assert any("SMTP_FROM_EMAIL" in failure for failure in result.failures)


def test_strict_warns_when_email_disabled() -> None:
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
        "CORS_ORIGINS": "https://example.com",
        "API_DOCS_ENABLED": "false",
        "EMAIL_ENABLED": "false",
    }

    result = module.validate_production_env(parsed, strict=True)
    assert result.passed, result.failures
    assert any("Email notifications disabled" in warning for warning in result.warnings)


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


def _strict_production_base() -> dict[str, str]:
    return {
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
        "CORS_ORIGINS": "https://example.com",
        "API_DOCS_ENABLED": "false",
        "EMAIL_ENABLED": "false",
        "EMAIL_DRY_RUN": "true",
    }


def test_stripe_disabled_passes_strict_with_warning() -> None:
    module = _load_module()
    parsed = _strict_production_base()
    parsed["STRIPE_ENABLED"] = "false"

    result = module.validate_production_env(parsed, strict=True)
    assert result.passed, result.failures
    assert any("Stripe disabled" in warning for warning in result.warnings)


def test_stripe_enabled_missing_secret_fails_strict() -> None:
    module = _load_module()
    parsed = _strict_production_base()
    parsed["STRIPE_ENABLED"] = "true"
    parsed["STRIPE_SECRET_KEY"] = ""
    parsed["STRIPE_WEBHOOK_SECRET"] = "whsec_test_webhook_secret_value_001"
    parsed["STRIPE_PRICE_STARTER"] = "price_starter_test_001"
    parsed["STRIPE_PRICE_BUSINESS"] = "price_business_test_001"
    parsed["STRIPE_PRICE_PRO"] = "price_pro_test_001"
    parsed["STRIPE_SUCCESS_URL"] = "https://example.com/billing/success"
    parsed["STRIPE_CANCEL_URL"] = "https://example.com/billing/cancel"

    result = module.validate_production_env(parsed, strict=True)
    assert not result.passed
    assert any("STRIPE_SECRET_KEY" in failure for failure in result.failures)


def test_stripe_enabled_missing_price_ids_fails_strict() -> None:
    module = _load_module()
    parsed = _strict_production_base()
    parsed["STRIPE_ENABLED"] = "true"
    parsed["STRIPE_SECRET_KEY"] = "sk_test_super_secret_key_value_001"
    parsed["STRIPE_WEBHOOK_SECRET"] = "whsec_test_webhook_secret_value_001"
    parsed["STRIPE_PRICE_STARTER"] = ""
    parsed["STRIPE_PRICE_BUSINESS"] = "price_business_test_001"
    parsed["STRIPE_PRICE_PRO"] = "price_pro_test_001"
    parsed["STRIPE_SUCCESS_URL"] = "https://example.com/billing/success"
    parsed["STRIPE_CANCEL_URL"] = "https://example.com/billing/cancel"

    result = module.validate_production_env(parsed, strict=True)
    assert not result.passed
    assert any("STRIPE_PRICE_STARTER" in failure for failure in result.failures)


def test_stripe_enabled_complete_config_passes_strict() -> None:
    module = _load_module()
    parsed = _strict_production_base()
    parsed["STRIPE_ENABLED"] = "true"
    parsed["STRIPE_SECRET_KEY"] = "sk_test_super_secret_key_value_001"
    parsed["STRIPE_WEBHOOK_SECRET"] = "whsec_test_webhook_secret_value_001"
    parsed["STRIPE_PRICE_STARTER"] = "price_starter_test_001"
    parsed["STRIPE_PRICE_BUSINESS"] = "price_business_test_001"
    parsed["STRIPE_PRICE_PRO"] = "price_pro_test_001"
    parsed["STRIPE_SUCCESS_URL"] = "https://example.com/billing/success"
    parsed["STRIPE_CANCEL_URL"] = "https://example.com/billing/cancel"

    result = module.validate_production_env(parsed, strict=True)
    assert result.passed, result.failures


def test_stripe_secrets_are_not_printed_in_validation_messages() -> None:
    module = _load_module()
    secret = "sk_test_super_secret_key_value_001"
    webhook = "whsec_test_webhook_secret_value_001"
    parsed = _strict_production_base()
    parsed["STRIPE_ENABLED"] = "true"
    parsed["STRIPE_SECRET_KEY"] = secret
    parsed["STRIPE_WEBHOOK_SECRET"] = webhook
    parsed["STRIPE_PRICE_STARTER"] = "price_starter_test_001"
    parsed["STRIPE_PRICE_BUSINESS"] = "price_business_test_001"
    parsed["STRIPE_PRICE_PRO"] = "price_pro_test_001"
    parsed["STRIPE_SUCCESS_URL"] = "https://example.com/billing/success"
    parsed["STRIPE_CANCEL_URL"] = "https://example.com/billing/cancel"

    result = module.validate_production_env(parsed, strict=True)
    messages = " ".join(result.ok + result.warnings + result.failures)
    assert secret not in messages
    assert webhook not in messages
    assert "STRIPE_SECRET_KEY is set" in messages


def test_production_env_script_output_does_not_print_fake_secrets(tmp_path: Path) -> None:
    import io
    import sys

    module = _load_module()
    secret = "sk_test_super_secret_key_value_001"
    webhook = "whsec_test_webhook_secret_value_001"
    jwt = "0123456789abcdef0123456789abcdef0123456789ab"
    smtp_password = "smtp_password_never_print_001"
    env_file = tmp_path / ".env"
    env_file.write_text(
        "\n".join(
            [
                "APP_ENV=production",
                "POSTGRES_USER=service_platform",
                "POSTGRES_PASSWORD=super_secure_random_password_value_123",
                "POSTGRES_DB=service_platform",
                (
                    "DATABASE_URL=postgresql+asyncpg://service_platform:"
                    "super_secure_random_password_value_123@postgres:5432/service_platform"
                ),
                f"JWT_SECRET_KEY={jwt}",
                "WEB_HTTP_PORT=80",
                "CORS_ORIGINS=https://example.com",
                "API_DOCS_ENABLED=false",
                "STRIPE_ENABLED=true",
                f"STRIPE_SECRET_KEY={secret}",
                f"STRIPE_WEBHOOK_SECRET={webhook}",
                "STRIPE_PRICE_STARTER=price_starter_test_001",
                "STRIPE_PRICE_BUSINESS=price_business_test_001",
                "STRIPE_PRICE_PRO=price_pro_test_001",
                "STRIPE_SUCCESS_URL=https://example.com/billing/success",
                "STRIPE_CANCEL_URL=https://example.com/billing/cancel",
                "EMAIL_ENABLED=true",
                "EMAIL_DRY_RUN=false",
                "SMTP_HOST=smtp.example.com",
                "SMTP_USER=mailer@example.com",
                f"SMTP_PASSWORD={smtp_password}",
                "SMTP_FROM_EMAIL=mailer@example.com",
            ]
        ),
        encoding="utf-8",
    )

    buffer = io.StringIO()
    stdout = sys.stdout
    sys.stdout = buffer
    try:
        exit_code = module.main(["--env-file", str(env_file), "--strict"])
    finally:
        sys.stdout = stdout

    output = buffer.getvalue()
    assert exit_code == 0
    assert secret not in output
    assert webhook not in output
    assert smtp_password not in output
    assert "STRIPE_SECRET_KEY is set" in output
