#!/usr/bin/env python3
"""Security readiness audit — config checks only, no scanners or network calls."""

from __future__ import annotations

import os
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


def _record(name: str, *, status: str, detail: str = "") -> dict[str, str]:
    return {"name": name, "status": status, "detail": detail}


def _secret_status(label: str, value: str | None) -> str:
    if value and value.strip():
        return f"{label}: configured"
    return f"{label}: not set"


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
    except ValidationError as exc:
        messages = [str(err.get("msg", "")) for err in exc.errors()]
        detail = "; ".join(m for m in messages if m) or str(exc).split("\n")[0][:200]
        print(f"FAIL: settings validation failed: {detail}")
        results.append(_record("Settings validation", status="FAIL", detail=detail))
        critical_failures.append(f"Settings validation: {detail}")
        return _print_summary(results, critical_failures)
    except Exception as exc:
        print(f"FAIL: could not load Settings: {exc}")
        return 1

    app_env = settings.app_env
    print(f"    APP_ENV={app_env}")
    print(f"    API_DOCS_ENABLED={settings.api_docs_enabled}")
    print(f"    docs_enabled (effective)={settings.docs_enabled}")
    print(f"    CORS_ORIGINS={settings.cors_origins}")
    print(f"    JWT_SECRET_KEY length={len(settings.jwt_secret_key)} (value not printed)")
    print(_secret_status("JWT_SECRET_KEY", settings.jwt_secret_key))
    print(f"    EMAIL_ENABLED={settings.email_enabled}")
    print(f"    EMAIL_DRY_RUN={settings.email_dry_run}")
    print(f"    STRIPE_ENABLED={settings.stripe_enabled}")
    print(_secret_status("STRIPE_SECRET_KEY", settings.stripe_secret_key))
    print(_secret_status("STRIPE_WEBHOOK_SECRET", settings.stripe_webhook_secret))

    origins = settings.cors_origins_list
    has_wildcard = any(origin == "*" for origin in origins)
    cors_empty = not origins

    if app_env == "production":
        print("==> Production security checks ...")
        if cors_empty:
            results.append(
                _record("CORS_ORIGINS", status="FAIL", detail="empty in production")
            )
            critical_failures.append("CORS_ORIGINS empty when APP_ENV=production")
        elif has_wildcard:
            results.append(
                _record("CORS_ORIGINS", status="FAIL", detail="wildcard not allowed")
            )
            critical_failures.append("CORS_ORIGINS contains * in production")
        else:
            results.append(
                _record(
                    "CORS_ORIGINS",
                    status="PASS",
                    detail=f"{len(origins)} origin(s), no wildcard",
                )
            )

        if settings.docs_enabled:
            results.append(
                _record(
                    "API docs",
                    status="FAIL",
                    detail="OpenAPI UI enabled in production",
                )
            )
            critical_failures.append("API docs enabled when APP_ENV=production")
        else:
            results.append(
                _record("API docs", status="PASS", detail="disabled in production")
            )

        if not _jwt_length_ok(settings.jwt_secret_key):
            results.append(
                _record(
                    "JWT_SECRET_KEY length",
                    status="FAIL",
                    detail=f"must be >= {JWT_MIN_LENGTH} characters",
                )
            )
            critical_failures.append("JWT_SECRET_KEY too short for production")
        elif _jwt_weak(settings.jwt_secret_key):
            results.append(
                _record(
                    "JWT_SECRET_KEY strength",
                    status="FAIL",
                    detail="placeholder or weak value",
                )
            )
            critical_failures.append("JWT_SECRET_KEY is weak placeholder in production")
        else:
            results.append(
                _record(
                    "JWT_SECRET_KEY",
                    status="PASS",
                    detail=f"length >= {JWT_MIN_LENGTH}, not a known placeholder",
                )
            )

        if settings.stripe_enabled:
            results.append(
                _record(
                    "STRIPE_ENABLED",
                    status="WARN",
                    detail="enabled — confirm test mode passed before live keys",
                )
            )
        else:
            results.append(
                _record("STRIPE_ENABLED", status="PASS", detail="disabled")
            )

        if settings.email_enabled and not settings.email_dry_run:
            results.append(
                _record(
                    "EMAIL_ENABLED",
                    status="WARN",
                    detail="live sending enabled — confirm SMTP tested",
                )
            )
        else:
            results.append(
                _record(
                    "EMAIL_ENABLED",
                    status="PASS",
                    detail="disabled or dry-run",
                )
            )
    else:
        print("==> Non-production environment (warnings only) ...")
        results.append(
            _record(
                "APP_ENV",
                status="WARN",
                detail=f"{app_env} — production hardening checks skipped",
            )
        )
        if has_wildcard:
            results.append(
                _record("CORS_ORIGINS", status="WARN", detail="contains wildcard *")
            )
        elif cors_empty:
            results.append(_record("CORS_ORIGINS", status="WARN", detail="empty"))
        else:
            results.append(
                _record("CORS_ORIGINS", status="PASS", detail=f"{len(origins)} origin(s)")
            )

        if settings.docs_enabled:
            results.append(
                _record("API docs", status="WARN", detail="enabled (expected in local/dev)")
            )
        else:
            results.append(_record("API docs", status="PASS", detail="disabled"))

        if not _jwt_length_ok(settings.jwt_secret_key) or _jwt_weak(settings.jwt_secret_key):
            results.append(
                _record(
                    "JWT_SECRET_KEY",
                    status="WARN",
                    detail="short or placeholder — change before production",
                )
            )
        else:
            results.append(_record("JWT_SECRET_KEY", status="PASS", detail="length OK"))

        results.append(
            _record("STRIPE_ENABLED", status="PASS", detail=str(settings.stripe_enabled))
        )
        results.append(
            _record(
                "EMAIL_ENABLED",
                status="PASS",
                detail=f"enabled={settings.email_enabled}, dry_run={settings.email_dry_run}",
            )
        )

    return _print_summary(results, critical_failures)


def _print_summary(results: list[dict[str, str]], critical_failures: list[str]) -> int:
    print()
    print("==> Summary")
    for item in results:
        line = f"  [{item['status']}] {item['name']}"
        if item.get("detail"):
            line += f" — {item['detail']}"
        print(line)

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
