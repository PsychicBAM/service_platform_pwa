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
    "STRIPE_SECRET_KEY",
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
            result.failures.append(message)
        else:
            result.warnings.append(message)
        return

    result.ok.append("CORS_ORIGINS is set")

    if any(origin == "*" for origin in origins):
        message = "CORS_ORIGINS must not use wildcard '*'"
        if strict:
            result.failures.append(message)
        else:
            result.warnings.append(message)
        return

    if strict:
        result.ok.append("CORS_ORIGINS has no wildcard")
        localhost_origins = [origin for origin in origins if _is_localhost_origin(origin)]
        if localhost_origins:
            result.warnings.append(
                "CORS_ORIGINS includes localhost — use real domain in production "
                "(localhost is OK for local prod smoke with WEB_HTTP_PORT=8080)"
            )
        else:
            result.ok.append("CORS_ORIGINS has no localhost entries")
    elif any(_is_localhost_origin(origin) for origin in origins):
        result.warnings.append("CORS_ORIGINS includes localhost (expected for local dev)")


def _validate_api_docs(env: dict[str, str], *, strict: bool, result: ValidationResult) -> None:
    raw = env.get("API_DOCS_ENABLED", "").strip().lower()
    app_env = env.get("APP_ENV", "").strip().lower()

    if raw in {"true", "1", "yes"} and app_env == "production":
        message = "API_DOCS_ENABLED=true in production — OpenAPI UI will be public"
        if strict:
            result.warnings.append(message)
        else:
            result.warnings.append(message)
    elif strict and app_env == "production" and raw in {"", "false", "0", "no"}:
        result.ok.append("API docs disabled for production")


def validate_production_env(env: dict[str, str], *, strict: bool = False) -> ValidationResult:
    result = ValidationResult()

    for key in REQUIRED_KEYS:
        value = env.get(key, "").strip()
        if not value:
            result.failures.append(f"{key} is missing or empty")
            continue
        result.ok.append(f"{key} is set")

    app_env = env.get("APP_ENV", "").strip().lower()
    if app_env:
        if strict and app_env != "production":
            result.failures.append(
                f"APP_ENV must be 'production' in strict mode (got {env.get('APP_ENV')!r})"
            )
        elif strict:
            result.ok.append("APP_ENV is production")

    postgres_password = env.get("POSTGRES_PASSWORD", "").strip()
    if postgres_password:
        if strict and _contains_placeholder(postgres_password):
            result.failures.append("POSTGRES_PASSWORD looks like a placeholder")
        elif strict:
            result.ok.append("POSTGRES_PASSWORD is not a placeholder")
        if postgres_password == "service_platform":
            msg = "POSTGRES_PASSWORD is the default dev password"
            if strict:
                result.failures.append(msg)
            else:
                result.warnings.append(msg)

    jwt_secret = env.get("JWT_SECRET_KEY", "").strip()
    if jwt_secret:
        if len(jwt_secret) < 32:
            result.failures.append(
                f"JWT_SECRET_KEY must be at least 32 characters (got {len(jwt_secret)})"
            )
        else:
            result.ok.append("JWT_SECRET_KEY length")

        jwt_lower = jwt_secret.lower()
        if jwt_lower in JWT_WEAK_EXACT or (strict and _contains_placeholder(jwt_secret)):
            result.failures.append("JWT_SECRET_KEY is a weak or placeholder value")
        elif strict:
            result.ok.append("JWT_SECRET_KEY is not a default placeholder")

    database_url = env.get("DATABASE_URL", "").strip()
    if database_url:
        if strict:
            if _contains_placeholder(database_url):
                result.failures.append("DATABASE_URL contains placeholder values")
            elif postgres_password and postgres_password in database_url:
                if _contains_placeholder(postgres_password):
                    result.failures.append("DATABASE_URL uses placeholder POSTGRES_PASSWORD")
                else:
                    result.ok.append("DATABASE_URL password is not a placeholder")
            else:
                result.ok.append("DATABASE_URL is set")

            host = _database_host(database_url)
            if host in {None, "localhost", "127.0.0.1"}:
                result.failures.append(
                    "DATABASE_URL should use host 'postgres' for Docker Compose production"
                )
            elif host == "postgres":
                result.ok.append("DATABASE_URL host is postgres")
        else:
            for marker in DEV_DATABASE_MARKERS:
                if marker in database_url:
                    result.warnings.append(
                        f"DATABASE_URL looks dev-oriented ({marker.strip('@:')})"
                    )
                    break

    web_port = env.get("WEB_HTTP_PORT", "").strip()
    if web_port:
        if not web_port.isdigit():
            result.failures.append(f"WEB_HTTP_PORT must be numeric (got {web_port!r})")
        else:
            port_num = int(web_port)
            if not 1 <= port_num <= 65535:
                result.failures.append(f"WEB_HTTP_PORT out of range: {port_num}")
            else:
                result.ok.append(f"WEB_HTTP_PORT is valid ({port_num})")

    _validate_cors(env, strict=strict, result=result)
    _validate_api_docs(env, strict=strict, result=result)

    if not env.get("STRIPE_SECRET_KEY", "").strip():
        result.warnings.append("Stripe not configured")
    if not any(env.get(key, "").strip() for key in ("SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD")):
        result.warnings.append("SMTP not configured")

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


def print_result(result: ValidationResult) -> None:
    seen_ok = set()
    for message in result.ok:
        if message in seen_ok:
            continue
        seen_ok.add(message)
        print(format_line("ok", message))
    for message in result.warnings:
        print(format_line("warn", message))
    for message in result.failures:
        print(format_line("fail", message))


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
