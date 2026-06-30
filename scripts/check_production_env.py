#!/usr/bin/env python3
"""Validate production `.env` before deploying with docker-compose.prod.yml."""

from __future__ import annotations

import argparse
import sys
from dataclasses import dataclass, field
from pathlib import Path
from urllib.parse import urlparse

REQUIRED_KEYS = (
    "APP_ENV",
    "POSTGRES_USER",
    "POSTGRES_PASSWORD",
    "POSTGRES_DB",
    "DATABASE_URL",
    "JWT_SECRET_KEY",
    "WEB_HTTP_PORT",
)

OPTIONAL_INTEGRATION_KEYS = (
    "STRIPE_ENABLED",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "STRIPE_PRICE_STARTER",
    "STRIPE_PRICE_BUSINESS",
    "STRIPE_PRICE_PRO",
    "STRIPE_SUCCESS_URL",
    "STRIPE_CANCEL_URL",
    "SMTP_HOST",
    "SMTP_USER",
    "SMTP_PASSWORD",
)

JWT_WEAK_EXACT = frozenset(
    {
        "change_me",
        "change_me_in_production",
        "your-secret-here",
    }
)

PLACEHOLDER_SUBSTRINGS = (
    "CHANGE_ME",
    "change_me",
    "your-secret-here",
    "your_domain",
    "your-domain",
)

DEV_DATABASE_MARKERS = (
    "service_platform:service_platform@",
    "@localhost:",
    "@127.0.0.1:",
)

_REQUIRED_KEY_CODES = {
    "APP_ENV": ("app_env_missing_or_empty", "app_env_set"),
    "POSTGRES_USER": ("postgres_user_missing_or_empty", "postgres_user_set"),
    "POSTGRES_PASSWORD": ("postgres_password_missing_or_empty", "postgres_password_set"),
    "POSTGRES_DB": ("postgres_db_missing_or_empty", "postgres_db_set"),
    "DATABASE_URL": ("database_url_missing_or_empty", "database_url_set"),
    "JWT_SECRET_KEY": ("jwt_secret_key_missing_or_empty", "jwt_secret_key_set"),
    "WEB_HTTP_PORT": ("web_http_port_missing_or_empty", "web_http_port_set"),
}

SAFE_VALIDATION_MESSAGES: dict[str, str] = {
    "env_file_not_found": "Env file not found",
    "app_env_missing_or_empty": "APP_ENV is missing or empty",
    "app_env_set": "APP_ENV is set",
    "app_env_production_required": (
        "APP_ENV must be production in strict mode (current value is not production)"
    ),
    "app_env_is_production": "APP_ENV is production",
    "postgres_user_missing_or_empty": "POSTGRES_USER is missing or empty",
    "postgres_user_set": "POSTGRES_USER is set",
    "postgres_password_missing_or_empty": "POSTGRES_PASSWORD is missing or empty",
    "postgres_password_set": "POSTGRES_PASSWORD is set",
    "postgres_password_placeholder": "POSTGRES_PASSWORD looks like a placeholder",
    "postgres_password_not_placeholder": "POSTGRES_PASSWORD is not a placeholder",
    "postgres_password_default_dev": "POSTGRES_PASSWORD is the default dev password",
    "postgres_db_missing_or_empty": "POSTGRES_DB is missing or empty",
    "postgres_db_set": "POSTGRES_DB is set",
    "database_url_missing_or_empty": "DATABASE_URL is missing or empty",
    "database_url_set": "DATABASE_URL is set",
    "database_url_placeholder_values": "DATABASE_URL contains placeholder values",
    "database_url_placeholder_postgres_password": (
        "DATABASE_URL uses placeholder POSTGRES_PASSWORD"
    ),
    "database_url_password_not_placeholder": "DATABASE_URL password is not a placeholder",
    "database_url_host_postgres_required": (
        "DATABASE_URL should use host 'postgres' for Docker Compose production"
    ),
    "database_url_host_is_postgres": "DATABASE_URL host is postgres",
    "database_url_dev_oriented": "DATABASE_URL looks dev-oriented",
    "jwt_secret_key_missing_or_empty": "JWT_SECRET_KEY is missing or empty",
    "jwt_secret_key_set": "JWT_SECRET_KEY is set",
    "jwt_secret_key_too_short": "JWT_SECRET_KEY must be at least 32 characters",
    "jwt_secret_key_meets_minimum_length": "JWT_SECRET_KEY meets minimum length",
    "jwt_secret_key_weak_or_placeholder": "JWT_SECRET_KEY is a weak or placeholder value",
    "jwt_secret_key_not_default_placeholder": "JWT_SECRET_KEY is not a default placeholder",
    "web_http_port_missing_or_empty": "WEB_HTTP_PORT is missing or empty",
    "web_http_port_set": "WEB_HTTP_PORT is set",
    "web_http_port_not_numeric": "WEB_HTTP_PORT must be numeric",
    "web_http_port_out_of_range": "WEB_HTTP_PORT out of range",
    "web_http_port_valid": "WEB_HTTP_PORT is valid",
    "cors_origins_missing_or_empty": "CORS_ORIGINS is missing or empty",
    "cors_origins_set": "CORS_ORIGINS is set",
    "cors_origins_wildcard_not_allowed": "CORS_ORIGINS must not use wildcard '*'",
    "cors_origins_no_wildcard": "CORS_ORIGINS has no wildcard",
    "cors_origins_localhost_production_warning": (
        "CORS_ORIGINS includes localhost — use real domain in production "
        "(localhost is OK for local prod smoke with WEB_HTTP_PORT=8080)"
    ),
    "cors_origins_no_localhost_entries": "CORS_ORIGINS has no localhost entries",
    "cors_origins_localhost_dev_expected": (
        "CORS_ORIGINS includes localhost (expected for local dev)"
    ),
    "api_docs_enabled_in_production": (
        "API_DOCS_ENABLED=true in production — OpenAPI UI will be public"
    ),
    "api_docs_disabled_for_production": "API docs disabled for production",
    "email_notifications_disabled": "Email notifications disabled (EMAIL_ENABLED=false)",
    "email_enabled_true": "EMAIL_ENABLED is true",
    "email_dry_run_enabled": "EMAIL_DRY_RUN is enabled — emails will not be sent over SMTP",
    "email_dry_run_false_live_smtp": "EMAIL_DRY_RUN is false (live SMTP expected)",
    "smtp_host_required_live_email": (
        "SMTP_HOST is required when EMAIL_ENABLED=true and EMAIL_DRY_RUN=false"
    ),
    "smtp_host_set": "SMTP_HOST is set",
    "smtp_from_email_required_live_email": (
        "SMTP_FROM_EMAIL is required when EMAIL_ENABLED=true and EMAIL_DRY_RUN=false"
    ),
    "smtp_from_email_set": "SMTP_FROM_EMAIL is set",
    "smtp_password_required_when_user_set": "SMTP_PASSWORD is required when SMTP_USER is set",
    "smtp_user_and_password_set": "SMTP_USER and SMTP_PASSWORD are set",
    "smtp_not_configured": "SMTP not configured",
    "stripe_disabled": (
        "Stripe disabled — payments unavailable; billing remains manual/demo"
    ),
    "stripe_enabled_true": "STRIPE_ENABLED is true",
    "stripe_secret_key_required": "STRIPE_SECRET_KEY is required when STRIPE_ENABLED=true",
    "stripe_secret_key_set": "STRIPE_SECRET_KEY is set",
    "stripe_webhook_secret_required": (
        "STRIPE_WEBHOOK_SECRET is required when STRIPE_ENABLED=true"
    ),
    "stripe_webhook_secret_set": "STRIPE_WEBHOOK_SECRET is set",
    "stripe_price_starter_required": (
        "STRIPE_PRICE_STARTER is required when STRIPE_ENABLED=true"
    ),
    "stripe_price_starter_set": "STRIPE_PRICE_STARTER is set",
    "stripe_price_business_required": (
        "STRIPE_PRICE_BUSINESS is required when STRIPE_ENABLED=true"
    ),
    "stripe_price_business_set": "STRIPE_PRICE_BUSINESS is set",
    "stripe_price_pro_required": "STRIPE_PRICE_PRO is required when STRIPE_ENABLED=true",
    "stripe_price_pro_set": "STRIPE_PRICE_PRO is set",
    "stripe_success_url_required": "STRIPE_SUCCESS_URL is required when STRIPE_ENABLED=true",
    "stripe_success_url_set": "STRIPE_SUCCESS_URL is set",
    "stripe_success_url_localhost_forbidden": (
        "Stripe success URL should not use localhost in production"
    ),
    "stripe_success_url_localhost_dev": "STRIPE_SUCCESS_URL points to localhost",
    "stripe_cancel_url_required": "STRIPE_CANCEL_URL is required when STRIPE_ENABLED=true",
    "stripe_cancel_url_set": "STRIPE_CANCEL_URL is set",
    "stripe_cancel_url_localhost_forbidden": (
        "Stripe cancel URL should not use localhost in production"
    ),
    "stripe_cancel_url_localhost_dev": "STRIPE_CANCEL_URL points to localhost",
}


def validation_message(code: str) -> str:
    """Resolve a validation code to its predefined safe output text."""
    return SAFE_VALIDATION_MESSAGES.get(code, "Unknown validation check")


@dataclass
class ValidationResult:
    ok: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    failures: list[str] = field(default_factory=list)

    @property
    def passed(self) -> bool:
        return not self.failures


def _append_ok(result: ValidationResult, code: str) -> None:
    result.ok.append(code)


def _append_warn(result: ValidationResult, code: str) -> None:
    result.warnings.append(code)


def _append_fail(result: ValidationResult, code: str) -> None:
    result.failures.append(code)


def parse_env_file(path: Path) -> dict[str, str]:
    if not path.is_file():
        raise FileNotFoundError(f"Env file not found: {path}")

    env: dict[str, str] = {}
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[len("export ") :].strip()
        if "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
            value = value[1:-1]
        env[key] = value
    return env


def _contains_placeholder(value: str) -> bool:
    lowered = value.lower()
    return any(marker.lower() in lowered for marker in PLACEHOLDER_SUBSTRINGS)


def _database_host(value: str) -> str | None:
    try:
        parsed = urlparse(value.replace("+asyncpg", "", 1))
    except ValueError:
        return None
    return parsed.hostname


def _parse_cors_origins(value: str) -> list[str]:
    return [origin.strip() for origin in value.split(",") if origin.strip()]


def _is_localhost_origin(origin: str) -> bool:
    lowered = origin.lower()
    return "localhost" in lowered or "127.0.0.1" in lowered


def _validate_cors(env: dict[str, str], *, strict: bool, result: ValidationResult) -> None:
    raw = env.get("CORS_ORIGINS", "").strip()
    origins = _parse_cors_origins(raw)

    if not origins:
        if strict:
            _append_fail(result, "cors_origins_missing_or_empty")
        else:
            _append_warn(result, "cors_origins_missing_or_empty")
        return

    _append_ok(result, "cors_origins_set")

    if any(origin == "*" for origin in origins):
        if strict:
            _append_fail(result, "cors_origins_wildcard_not_allowed")
        else:
            _append_warn(result, "cors_origins_wildcard_not_allowed")
        return

    if strict:
        _append_ok(result, "cors_origins_no_wildcard")
        if any(_is_localhost_origin(origin) for origin in origins):
            _append_warn(result, "cors_origins_localhost_production_warning")
        else:
            _append_ok(result, "cors_origins_no_localhost_entries")
    elif any(_is_localhost_origin(origin) for origin in origins):
        _append_warn(result, "cors_origins_localhost_dev_expected")


def _validate_api_docs(env: dict[str, str], *, strict: bool, result: ValidationResult) -> None:
    raw = env.get("API_DOCS_ENABLED", "").strip().lower()
    app_env = env.get("APP_ENV", "").strip().lower()

    if raw in {"true", "1", "yes"} and app_env == "production":
        _append_warn(result, "api_docs_enabled_in_production")
    elif strict and app_env == "production" and raw in {"", "false", "0", "no"}:
        _append_ok(result, "api_docs_disabled_for_production")


def _is_truthy(value: str) -> bool:
    return value.strip().lower() in {"true", "1", "yes"}


def _validate_email(env: dict[str, str], *, strict: bool, result: ValidationResult) -> None:
    email_enabled = _is_truthy(env.get("EMAIL_ENABLED", ""))
    email_dry_run_raw = env.get("EMAIL_DRY_RUN", "true").strip().lower()
    email_dry_run = email_dry_run_raw in {"", "true", "1", "yes"}

    if not email_enabled:
        _append_warn(result, "email_notifications_disabled")
        return

    _append_ok(result, "email_enabled_true")

    if email_dry_run:
        _append_warn(result, "email_dry_run_enabled")
        return

    _append_ok(result, "email_dry_run_false_live_smtp")

    smtp_host = env.get("SMTP_HOST", "").strip()
    smtp_from = env.get("SMTP_FROM_EMAIL", "").strip()
    smtp_user = env.get("SMTP_USER", "").strip()
    smtp_password = env.get("SMTP_PASSWORD", "").strip()

    if not smtp_host:
        if strict:
            _append_fail(result, "smtp_host_required_live_email")
        else:
            _append_warn(result, "smtp_host_required_live_email")
    else:
        _append_ok(result, "smtp_host_set")

    if not smtp_from:
        if strict:
            _append_fail(result, "smtp_from_email_required_live_email")
        else:
            _append_warn(result, "smtp_from_email_required_live_email")
    else:
        _append_ok(result, "smtp_from_email_set")

    if smtp_user and not smtp_password:
        if strict:
            _append_fail(result, "smtp_password_required_when_user_set")
        else:
            _append_warn(result, "smtp_password_required_when_user_set")
    elif smtp_user:
        _append_ok(result, "smtp_user_and_password_set")


_STRIPE_SECRET_CODES = {
    "STRIPE_SECRET_KEY": ("stripe_secret_key_required", "stripe_secret_key_set"),
    "STRIPE_WEBHOOK_SECRET": ("stripe_webhook_secret_required", "stripe_webhook_secret_set"),
}

_STRIPE_PRICE_CODES = {
    "STRIPE_PRICE_STARTER": ("stripe_price_starter_required", "stripe_price_starter_set"),
    "STRIPE_PRICE_BUSINESS": ("stripe_price_business_required", "stripe_price_business_set"),
    "STRIPE_PRICE_PRO": ("stripe_price_pro_required", "stripe_price_pro_set"),
}

_STRIPE_URL_CODES = {
    "STRIPE_SUCCESS_URL": (
        "stripe_success_url_required",
        "stripe_success_url_set",
        "stripe_success_url_localhost_forbidden",
        "stripe_success_url_localhost_dev",
    ),
    "STRIPE_CANCEL_URL": (
        "stripe_cancel_url_required",
        "stripe_cancel_url_set",
        "stripe_cancel_url_localhost_forbidden",
        "stripe_cancel_url_localhost_dev",
    ),
}


def _validate_stripe(env: dict[str, str], *, strict: bool, result: ValidationResult) -> None:
    stripe_enabled = _is_truthy(env.get("STRIPE_ENABLED", ""))

    if not stripe_enabled:
        _append_warn(result, "stripe_disabled")
        return

    _append_ok(result, "stripe_enabled_true")

    for key, (missing_code, set_code) in _STRIPE_SECRET_CODES.items():
        value = env.get(key, "").strip()
        if not value or (strict and _contains_placeholder(value)):
            if strict:
                _append_fail(result, missing_code)
            else:
                _append_warn(result, missing_code)
        elif strict:
            _append_ok(result, set_code)

    for key, (missing_code, set_code) in _STRIPE_PRICE_CODES.items():
        value = env.get(key, "").strip()
        if not value or (strict and _contains_placeholder(value)):
            if strict:
                _append_fail(result, missing_code)
            else:
                _append_warn(result, missing_code)
        elif strict:
            _append_ok(result, set_code)

    for key, (
        missing_code,
        set_code,
        localhost_fail_code,
        localhost_warn_code,
    ) in _STRIPE_URL_CODES.items():
        value = env.get(key, "").strip()
        if not value or (strict and _contains_placeholder(value)):
            if strict:
                _append_fail(result, missing_code)
            else:
                _append_warn(result, missing_code)
        elif strict:
            if _is_localhost_origin(value):
                _append_fail(result, localhost_fail_code)
            else:
                _append_ok(result, set_code)
        elif _is_localhost_origin(value):
            _append_warn(result, localhost_warn_code)


def validate_production_env(env: dict[str, str], *, strict: bool = False) -> ValidationResult:
    result = ValidationResult()

    for key in REQUIRED_KEYS:
        value = env.get(key, "").strip()
        missing_code, set_code = _REQUIRED_KEY_CODES[key]
        if not value:
            _append_fail(result, missing_code)
            continue
        _append_ok(result, set_code)

    app_env = env.get("APP_ENV", "").strip().lower()
    if app_env:
        if strict and app_env != "production":
            _append_fail(result, "app_env_production_required")
        elif strict:
            _append_ok(result, "app_env_is_production")

    postgres_password = env.get("POSTGRES_PASSWORD", "").strip()
    if postgres_password:
        if strict and _contains_placeholder(postgres_password):
            _append_fail(result, "postgres_password_placeholder")
        elif strict:
            _append_ok(result, "postgres_password_not_placeholder")
        if postgres_password == "service_platform":
            if strict:
                _append_fail(result, "postgres_password_default_dev")
            else:
                _append_warn(result, "postgres_password_default_dev")

    jwt_secret = env.get("JWT_SECRET_KEY", "").strip()
    if jwt_secret:
        if len(jwt_secret) < 32:
            _append_fail(result, "jwt_secret_key_too_short")
        else:
            _append_ok(result, "jwt_secret_key_meets_minimum_length")

        jwt_lower = jwt_secret.lower()
        if jwt_lower in JWT_WEAK_EXACT or (strict and _contains_placeholder(jwt_secret)):
            _append_fail(result, "jwt_secret_key_weak_or_placeholder")
        elif strict:
            _append_ok(result, "jwt_secret_key_not_default_placeholder")

    database_url = env.get("DATABASE_URL", "").strip()
    if database_url:
        if strict:
            if _contains_placeholder(database_url):
                _append_fail(result, "database_url_placeholder_values")
            elif postgres_password and postgres_password in database_url:
                if _contains_placeholder(postgres_password):
                    _append_fail(result, "database_url_placeholder_postgres_password")
                else:
                    _append_ok(result, "database_url_password_not_placeholder")
            else:
                _append_ok(result, "database_url_set")

            host = _database_host(database_url)
            if host in {None, "localhost", "127.0.0.1"}:
                _append_fail(result, "database_url_host_postgres_required")
            elif host == "postgres":
                _append_ok(result, "database_url_host_is_postgres")
        else:
            for marker in DEV_DATABASE_MARKERS:
                if marker in database_url:
                    _append_warn(result, "database_url_dev_oriented")
                    break

    web_port = env.get("WEB_HTTP_PORT", "").strip()
    if web_port:
        if not web_port.isdigit():
            _append_fail(result, "web_http_port_not_numeric")
        else:
            port_num = int(web_port)
            if not 1 <= port_num <= 65535:
                _append_fail(result, "web_http_port_out_of_range")
            else:
                _append_ok(result, "web_http_port_valid")

    _validate_cors(env, strict=strict, result=result)
    _validate_api_docs(env, strict=strict, result=result)
    _validate_email(env, strict=strict, result=result)
    _validate_stripe(env, strict=strict, result=result)

    if not _is_truthy(env.get("EMAIL_ENABLED", "")) and not any(
        env.get(key, "").strip() for key in ("SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD")
    ):
        _append_warn(result, "smtp_not_configured")

    return result


def format_line(kind: str, code: str) -> str:
    icons_utf8 = {"ok": "✅ OK", "warn": "⚠️ WARN", "fail": "❌ FAIL"}
    icons_ascii = {"ok": "OK", "warn": "WARN", "fail": "FAIL"}
    icons = icons_utf8
    try:
        icons_utf8["ok"].encode(sys.stdout.encoding or "utf-8")
    except (UnicodeEncodeError, AttributeError, TypeError):
        icons = icons_ascii
    safe_text = SAFE_VALIDATION_MESSAGES.get(code, "Unknown validation check")
    return f"{icons[kind]}: {safe_text}"


def print_result(result: ValidationResult) -> None:
    seen_ok: set[str] = set()
    for code in result.ok:
        if code in seen_ok:
            continue
        seen_ok.add(code)
        print(format_line("ok", code))
    for code in result.warnings:
        print(format_line("warn", code))
    for code in result.failures:
        print(format_line("fail", code))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Validate production environment variables before VPS deploy.",
    )
    parser.add_argument(
        "--env-file",
        type=Path,
        default=Path(".env"),
        help="Path to env file (default: .env)",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Fail on placeholders, weak secrets, and non-production APP_ENV",
    )
    args = parser.parse_args(argv)

    env_path = args.env_file.resolve()
    print(f"Checking {env_path} (strict={args.strict})")

    try:
        env = parse_env_file(env_path)
    except FileNotFoundError:
        print(format_line("fail", "env_file_not_found"))
        return 1

    result = validate_production_env(env, strict=args.strict)
    print_result(result)

    if result.passed:
        print("\nProduction env validation passed.")
        return 0

    print(f"\nProduction env validation failed ({len(result.failures)} issue(s)).")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
