#!/usr/bin/env python3
"""Validate production `.env` before deploying with docker-compose.prod.yml."""

from __future__ import annotations

import argparse
import re
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

_SENSITIVE_VALUE_PATTERNS = (
    re.compile(r"sk_test_[A-Za-z0-9]+"),
    re.compile(r"sk_live_[A-Za-z0-9]+"),
    re.compile(r"whsec_[A-Za-z0-9]+"),
    re.compile(r"password=[^@\s]+", re.IGNORECASE),
)


def sanitize_message(message: str) -> str:
    """Redact secret-like substrings from validation output messages."""
    redacted = message
    for pattern in _SENSITIVE_VALUE_PATTERNS:
        redacted = pattern.sub("[redacted]", redacted)
    return redacted


def _safe_message(message: str) -> str:
    """Return a message safe to store in validation results and print."""
    return sanitize_message(message)


def _append_ok(result: ValidationResult, message: str) -> None:
    result.ok.append(_safe_message(message))


def _append_warn(result: ValidationResult, message: str) -> None:
    result.warnings.append(_safe_message(message))


def _append_fail(result: ValidationResult, message: str) -> None:
    result.failures.append(_safe_message(message))


@dataclass
class ValidationResult:
    ok: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    failures: list[str] = field(default_factory=list)

    @property
    def passed(self) -> bool:
        return not self.failures


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
        message = "CORS_ORIGINS is missing or empty"
        if strict:
            _append_fail(result, message)
        else:
            _append_warn(result, message)
        return

    _append_ok(result, "CORS_ORIGINS is set")

    if any(origin == "*" for origin in origins):
        message = "CORS_ORIGINS must not use wildcard '*'"
        if strict:
            _append_fail(result, message)
        else:
            _append_warn(result, message)
        return

    if strict:
        _append_ok(result, "CORS_ORIGINS has no wildcard")
        localhost_origins = [origin for origin in origins if _is_localhost_origin(origin)]
        if localhost_origins:
            _append_warn(
                result,
                "CORS_ORIGINS includes localhost — use real domain in production "
                "(localhost is OK for local prod smoke with WEB_HTTP_PORT=8080)",
            )
        else:
            _append_ok(result, "CORS_ORIGINS has no localhost entries")
    elif any(_is_localhost_origin(origin) for origin in origins):
        _append_warn(result, "CORS_ORIGINS includes localhost (expected for local dev)")


def _validate_api_docs(env: dict[str, str], *, strict: bool, result: ValidationResult) -> None:
    raw = env.get("API_DOCS_ENABLED", "").strip().lower()
    app_env = env.get("APP_ENV", "").strip().lower()

    if raw in {"true", "1", "yes"} and app_env == "production":
        message = "API_DOCS_ENABLED=true in production — OpenAPI UI will be public"
        _append_warn(result, message)
    elif strict and app_env == "production" and raw in {"", "false", "0", "no"}:
        _append_ok(result, "API docs disabled for production")


def _is_truthy(value: str) -> bool:
    return value.strip().lower() in {"true", "1", "yes"}


def _validate_email(env: dict[str, str], *, strict: bool, result: ValidationResult) -> None:
    email_enabled = _is_truthy(env.get("EMAIL_ENABLED", ""))
    email_dry_run_raw = env.get("EMAIL_DRY_RUN", "true").strip().lower()
    email_dry_run = email_dry_run_raw in {"", "true", "1", "yes"}

    if not email_enabled:
        _append_warn(result, "Email notifications disabled (EMAIL_ENABLED=false)")
        return

    _append_ok(result, "EMAIL_ENABLED is true")

    if email_dry_run:
        _append_warn(
            result,
            "EMAIL_DRY_RUN is enabled — emails will not be sent over SMTP",
        )
        return

    _append_ok(result, "EMAIL_DRY_RUN is false (live SMTP expected)")

    smtp_host = env.get("SMTP_HOST", "").strip()
    smtp_from = env.get("SMTP_FROM_EMAIL", "").strip()
    smtp_user = env.get("SMTP_USER", "").strip()
    smtp_password = env.get("SMTP_PASSWORD", "").strip()

    if not smtp_host:
        message = "SMTP_HOST is required when EMAIL_ENABLED=true and EMAIL_DRY_RUN=false"
        if strict:
            _append_fail(result, message)
        else:
            _append_warn(result, message)
    else:
        _append_ok(result, "SMTP_HOST is set")

    if not smtp_from:
        message = "SMTP_FROM_EMAIL is required when EMAIL_ENABLED=true and EMAIL_DRY_RUN=false"
        if strict:
            _append_fail(result, message)
        else:
            _append_warn(result, message)
    else:
        _append_ok(result, "SMTP_FROM_EMAIL is set")

    if smtp_user and not smtp_password:
        message = "SMTP_PASSWORD is required when SMTP_USER is set"
        if strict:
            _append_fail(result, message)
        else:
            _append_warn(result, message)
    elif smtp_user:
        _append_ok(result, "SMTP_USER and SMTP_PASSWORD are set")


def _validate_stripe(env: dict[str, str], *, strict: bool, result: ValidationResult) -> None:
    stripe_enabled = _is_truthy(env.get("STRIPE_ENABLED", ""))

    if not stripe_enabled:
        _append_warn(
            result,
            "Stripe disabled — payments unavailable; billing remains manual/demo",
        )
        return

    _append_ok(result, "STRIPE_ENABLED is true")

    secret = env.get("STRIPE_SECRET_KEY", "").strip()
    webhook = env.get("STRIPE_WEBHOOK_SECRET", "").strip()

    for key, value in (
        ("STRIPE_SECRET_KEY", secret),
        ("STRIPE_WEBHOOK_SECRET", webhook),
    ):
        if not value or (strict and _contains_placeholder(value)):
            message = f"{key} is required when STRIPE_ENABLED=true"
            if strict:
                _append_fail(result, message)
            else:
                _append_warn(result, message)
        elif strict:
            _append_ok(result, f"{key} is set")

    for key in ("STRIPE_PRICE_STARTER", "STRIPE_PRICE_BUSINESS", "STRIPE_PRICE_PRO"):
        value = env.get(key, "").strip()
        if not value or (strict and _contains_placeholder(value)):
            message = f"{key} is required when STRIPE_ENABLED=true"
            if strict:
                _append_fail(result, message)
            else:
                _append_warn(result, message)
        elif strict:
            _append_ok(result, f"{key} is set")

    for key in ("STRIPE_SUCCESS_URL", "STRIPE_CANCEL_URL"):
        value = env.get(key, "").strip()
        if not value or (strict and _contains_placeholder(value)):
            message = f"{key} is required when STRIPE_ENABLED=true"
            if strict:
                _append_fail(result, message)
            else:
                _append_warn(result, message)
        elif strict:
            if _is_localhost_origin(value):
                _append_fail(
                    result,
                    f"{key} must not use localhost when STRIPE_ENABLED=true in production",
                )
            else:
                _append_ok(result, f"{key} is set")
        elif _is_localhost_origin(value):
            _append_warn(result, f"{key} points to localhost")


def validate_production_env(env: dict[str, str], *, strict: bool = False) -> ValidationResult:
    result = ValidationResult()

    for key in REQUIRED_KEYS:
        value = env.get(key, "").strip()
        if not value:
            _append_fail(result, f"{key} is missing or empty")
            continue
        _append_ok(result, f"{key} is set")

    app_env = env.get("APP_ENV", "").strip().lower()
    if app_env:
        if strict and app_env != "production":
            _append_fail(
                result,
                "APP_ENV must be 'production' in strict mode (current value is not production)",
            )
        elif strict:
            _append_ok(result, "APP_ENV is production")

    postgres_password = env.get("POSTGRES_PASSWORD", "").strip()
    if postgres_password:
        if strict and _contains_placeholder(postgres_password):
            _append_fail(result, "POSTGRES_PASSWORD looks like a placeholder")
        elif strict:
            _append_ok(result, "POSTGRES_PASSWORD is not a placeholder")
        if postgres_password == "service_platform":
            msg = "POSTGRES_PASSWORD is the default dev password"
            if strict:
                _append_fail(result, msg)
            else:
                _append_warn(result, msg)

    jwt_secret = env.get("JWT_SECRET_KEY", "").strip()
    if jwt_secret:
        if len(jwt_secret) < 32:
            _append_fail(result, "JWT_SECRET_KEY must be at least 32 characters")
        else:
            _append_ok(result, "JWT_SECRET_KEY meets minimum length")

        jwt_lower = jwt_secret.lower()
        if jwt_lower in JWT_WEAK_EXACT or (strict and _contains_placeholder(jwt_secret)):
            _append_fail(result, "JWT_SECRET_KEY is a weak or placeholder value")
        elif strict:
            _append_ok(result, "JWT_SECRET_KEY is not a default placeholder")

    database_url = env.get("DATABASE_URL", "").strip()
    if database_url:
        if strict:
            if _contains_placeholder(database_url):
                _append_fail(result, "DATABASE_URL contains placeholder values")
            elif postgres_password and postgres_password in database_url:
                if _contains_placeholder(postgres_password):
                    _append_fail(result, "DATABASE_URL uses placeholder POSTGRES_PASSWORD")
                else:
                    _append_ok(result, "DATABASE_URL password is not a placeholder")
            else:
                _append_ok(result, "DATABASE_URL is set")

            host = _database_host(database_url)
            if host in {None, "localhost", "127.0.0.1"}:
                _append_fail(
                    result,
                    "DATABASE_URL should use host 'postgres' for Docker Compose production",
                )
            elif host == "postgres":
                _append_ok(result, "DATABASE_URL host is postgres")
        else:
            for marker in DEV_DATABASE_MARKERS:
                if marker in database_url:
                    _append_warn(
                        result,
                        f"DATABASE_URL looks dev-oriented ({marker.strip('@:')})",
                    )
                    break

    web_port = env.get("WEB_HTTP_PORT", "").strip()
    if web_port:
        if not web_port.isdigit():
            _append_fail(result, "WEB_HTTP_PORT must be numeric")
        else:
            port_num = int(web_port)
            if not 1 <= port_num <= 65535:
                _append_fail(result, "WEB_HTTP_PORT out of range")
            else:
                _append_ok(result, f"WEB_HTTP_PORT is valid ({port_num})")

    _validate_cors(env, strict=strict, result=result)
    _validate_api_docs(env, strict=strict, result=result)
    _validate_email(env, strict=strict, result=result)
    _validate_stripe(env, strict=strict, result=result)

    if not _is_truthy(env.get("EMAIL_ENABLED", "")) and not any(
        env.get(key, "").strip() for key in ("SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD")
    ):
        _append_warn(result, "SMTP not configured")

    return result


def format_line(kind: str, message: str) -> str:
    icons_utf8 = {"ok": "✅ OK", "warn": "⚠️ WARN", "fail": "❌ FAIL"}
    icons_ascii = {"ok": "OK", "warn": "WARN", "fail": "FAIL"}
    icons = icons_utf8
    try:
        icons_utf8["ok"].encode(sys.stdout.encoding or "utf-8")
    except (UnicodeEncodeError, AttributeError, TypeError):
        icons = icons_ascii
    return f"{icons[kind]}: {message}"


def safe_print_validation_message(kind: str, message: str) -> None:
    """Print a validation line; message is sanitized and never contains secret values."""
    print(format_line(kind, _safe_message(message)))  # lgtm[py/clear-text-logging-sensitive-data]


def print_result(result: ValidationResult) -> None:
    seen_ok = set()
    for message in result.ok:
        if message in seen_ok:
            continue
        seen_ok.add(message)
        safe_print_validation_message("ok", message)
    for message in result.warnings:
        safe_print_validation_message("warn", message)
    for message in result.failures:
        safe_print_validation_message("fail", message)


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
    except FileNotFoundError as exc:
        print(format_line("fail", str(exc)))
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
