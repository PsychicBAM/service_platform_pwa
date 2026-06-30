#!/usr/bin/env python3
"""Security readiness audit — config checks only, no scanners or network calls."""

from __future__ import annotations

import sys
from pathlib import Path

api_dir = Path(__file__).resolve().parents[1]
if str(api_dir) not in sys.path:
    sys.path.insert(0, str(api_dir))

NO_SCANNERS = "No security scanners or network calls are made during this audit."

JWT_MIN_LENGTH = 32
JWT_WEAK_VALUES = frozenset(
    {
        "change_me",
        "change_me_in_production",
        "your-secret-here",
    }
)


def _record(name: str, *, status: str) -> dict[str, str]:
    return {"name": name, "status": status}


def _jwt_length_ok(secret: str) -> bool:
    return len(secret.strip()) >= JWT_MIN_LENGTH


def _jwt_weak(secret: str) -> bool:
    lowered = secret.strip().lower()
    return lowered in JWT_WEAK_VALUES or lowered == ""


def run_audit() -> int:
    results: list[dict[str, str]] = []
    critical_failures: list[str] = []

    print("Security readiness audit")
    print(NO_SCANNERS)
    print()

    print("==> Loading settings ...")
    try:
        from pydantic import ValidationError
        from app.config import Settings

        settings = Settings()
    except ValidationError:
        print("FAIL: settings validation failed")
        results.append(_record("Settings validation", status="FAIL"))
        critical_failures.append("Settings validation failed")
        return _print_summary(results, critical_failures)
    except Exception:
        print("FAIL: could not load Settings")
        return 1

    app_env = settings.app_env
    print(f"    APP_ENV={app_env}")
    print(f"    API_DOCS_ENABLED={settings.api_docs_enabled}")
    print(f"    docs_enabled (effective)={settings.docs_enabled}")
    print(f"    CORS_ORIGINS={settings.cors_origins}")
    print(f"    EMAIL_ENABLED={settings.email_enabled}")
    print(f"    EMAIL_DRY_RUN={settings.email_dry_run}")
    print(f"    STRIPE_ENABLED={settings.stripe_enabled}")

    origins = settings.cors_origins_list
    has_wildcard = any(origin == "*" for origin in origins)
    cors_empty = not origins

    if app_env == "production":
        print("==> Production security checks ...")
        if cors_empty:
            results.append(_record("CORS_ORIGINS", status="FAIL"))
            critical_failures.append("CORS_ORIGINS empty when APP_ENV=production")
        elif has_wildcard:
            results.append(_record("CORS_ORIGINS", status="FAIL"))
            critical_failures.append("CORS_ORIGINS contains wildcard in production")
        else:
            results.append(_record("CORS_ORIGINS", status="PASS"))

        if settings.docs_enabled:
            results.append(_record("API docs", status="FAIL"))
            critical_failures.append("API docs enabled when APP_ENV=production")
        else:
            results.append(_record("API docs", status="PASS"))

        if not _jwt_length_ok(settings.jwt_secret_key):
            results.append(_record("JWT_SECRET_KEY", status="FAIL"))
            critical_failures.append("JWT_SECRET_KEY is too short for production.")
        elif _jwt_weak(settings.jwt_secret_key):
            results.append(_record("JWT_SECRET_KEY", status="FAIL"))
            critical_failures.append("JWT_SECRET_KEY is a weak placeholder in production.")
        else:
            results.append(_record("JWT_SECRET_KEY", status="PASS"))

        if settings.stripe_enabled:
            results.append(_record("STRIPE_ENABLED", status="WARN"))
        else:
            results.append(_record("STRIPE_ENABLED", status="PASS"))

        if settings.email_enabled and not settings.email_dry_run:
            results.append(_record("EMAIL_ENABLED", status="WARN"))
        else:
            results.append(_record("EMAIL_ENABLED", status="PASS"))
    else:
        print("==> Non-production environment (warnings only) ...")
        results.append(_record("APP_ENV", status="WARN"))

        if has_wildcard:
            results.append(_record("CORS_ORIGINS", status="WARN"))
        elif cors_empty:
            results.append(_record("CORS_ORIGINS", status="WARN"))
        else:
            results.append(_record("CORS_ORIGINS", status="PASS"))

        if settings.docs_enabled:
            results.append(_record("API docs", status="WARN"))
        else:
            results.append(_record("API docs", status="PASS"))

        if not _jwt_length_ok(settings.jwt_secret_key) or _jwt_weak(settings.jwt_secret_key):
            results.append(_record("JWT_SECRET_KEY", status="WARN"))
        else:
            results.append(_record("JWT_SECRET_KEY", status="PASS"))

        results.append(_record("STRIPE_ENABLED", status="PASS"))
        results.append(_record("EMAIL_ENABLED", status="PASS"))

    return _print_summary(results, critical_failures)


def _print_summary(results: list[dict[str, str]], critical_failures: list[str]) -> int:
    print()
    print("==> Summary")
    for item in results:
        print(f"  [{item['status']}] {item['name']}")

    pass_count = sum(1 for r in results if r["status"] == "PASS")
    warn_count = sum(1 for r in results if r["status"] == "WARN")
    fail_count = sum(1 for r in results if r["status"] == "FAIL")

    print()
    print(f"PASS: {pass_count}  WARN: {warn_count}  FAIL: {fail_count}")
    print(NO_SCANNERS)

    if critical_failures:
        print("\nCritical failures:")
        for failure in critical_failures:
            print(f"  - {failure}")
        return 1

    print("\nSecurity readiness audit passed.")
    return 0


def main() -> int:
    return run_audit()


if __name__ == "__main__":
    raise SystemExit(main())
