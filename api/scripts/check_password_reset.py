#!/usr/bin/env python3
"""Dry-run audit for password reset configuration and wiring.

Safe to run without SMTP credentials — no real emails are sent.
"""

from __future__ import annotations

import sys
from pathlib import Path
from unittest.mock import MagicMock

api_dir = Path(__file__).resolve().parents[1]
if str(api_dir) not in sys.path:
    sys.path.insert(0, str(api_dir))

NO_REAL_EMAILS = "No real emails are sent during this audit."
SAMPLE_RESET_TOKEN = "example-token-redacted"


def _record(name: str, *, status: str) -> dict[str, str]:
    return {"name": name, "status": status}


def run_audit() -> int:
    results: list[dict[str, str]] = []
    critical_failures: list[str] = []

    print("Password reset dry-run audit")
    print(NO_REAL_EMAILS)
    print()

    print("==> Importing app.main ...")
    try:
        import app.main  # noqa: F401

        results.append(_record("import app.main", status="PASS"))
    except Exception:
        results.append(_record("import app.main", status="FAIL"))
        critical_failures.append("import app.main failed")

    print("==> Importing password reset modules ...")
    try:
        import app.models.password_reset_token  # noqa: F401
        from app.services.password_reset_service import (
            PasswordResetService,
            build_reset_url,
            hash_reset_token,
        )

        results.append(_record("import password reset modules", status="PASS"))
    except Exception:
        results.append(_record("import password reset modules", status="FAIL"))
        critical_failures.append("import password reset modules failed")
        return _print_summary(results, critical_failures)

    print("==> Checking password reset config ...")
    try:
        from app.config import get_settings

        settings = get_settings()
        expire_hours = settings.password_reset_token_expire_hours
        base_url = settings.password_reset_base_url

        print("Reset token expiration setting is present.")
        print("Reset page base URL setting is present.")

        if expire_hours <= 0:
            raise ValueError("PASSWORD_RESET_TOKEN_EXPIRE_HOURS must be positive")
        if not base_url.strip():
            raise ValueError("PASSWORD_RESET_BASE_URL must not be empty")
        if "reset-password" not in base_url:
            results.append(_record("password reset config", status="WARN"))
        else:
            results.append(_record("password reset config", status="PASS"))
    except Exception:
        results.append(_record("password reset config", status="FAIL"))
        critical_failures.append("password reset config check failed")

    print("==> Building reset URL and template ...")
    try:
        from app.config import get_settings
        from app.services.email_templates import build_password_reset_email

        settings = get_settings()
        reset_url = build_reset_url(SAMPLE_RESET_TOKEN, settings)
        if SAMPLE_RESET_TOKEN not in reset_url:
            raise ValueError("reset URL must include sample token query param")
        if not reset_url.startswith(settings.password_reset_base_url.rstrip("/")):
            raise ValueError("reset URL must use configured base URL")

        message = build_password_reset_email(
            user_email="owner@example.com",
            reset_url=reset_url,
            expire_hours=settings.password_reset_token_expire_hours,
        )
        if not message.to_email or not message.subject or not message.text_body:
            raise ValueError("password reset email template missing required fields")
        if SAMPLE_RESET_TOKEN not in message.text_body:
            raise ValueError("reset URL must appear in email body")

        print("Password reset email template builds with redacted sample token.")
        results.append(_record("reset URL and template", status="PASS"))
    except Exception:
        results.append(_record("reset URL and template", status="FAIL"))
        critical_failures.append("reset URL and template check failed")

    print("==> Checking token hashing (no raw token storage) ...")
    try:
        from app.models.password_reset_token import PasswordResetToken

        raw_token = "audit-raw-reset-token-example"
        token_hash = hash_reset_token(raw_token)
        if raw_token == token_hash:
            raise ValueError("hash must differ from raw token")
        if len(token_hash) != 64:
            raise ValueError("token hash length invalid")
        if not all(c in "0123456789abcdef" for c in token_hash):
            raise ValueError("token hash must be lowercase hex")

        columns = {column.name for column in PasswordResetToken.__table__.columns}
        if "token_hash" not in columns:
            raise ValueError("PasswordResetToken must have token_hash column")
        if "token" in columns or "raw_token" in columns:
            raise ValueError("PasswordResetToken must not store raw token column")

        results.append(_record("token hashing", status="PASS"))
    except Exception:
        results.append(_record("token hashing", status="FAIL"))
        critical_failures.append("token hashing check failed")

    print("==> Verifying send path uses dry-run/mock (no real SMTP) ...")
    try:
        import asyncio

        from app.services.email_service import EmailSendResult
        from app.services.password_reset_service import PasswordResetService

        mock_email = MagicMock()
        mock_email.send_email.return_value = EmailSendResult(
            sent=True,
            dry_run=True,
            message="Email dry-run (not sent)",
        )
        service = PasswordResetService(
            session=MagicMock(),
            email_service=mock_email,
        )

        ok = asyncio.run(
            service.send_reset_email_best_effort(
                "owner@example.com",
                SAMPLE_RESET_TOKEN,
            )
        )
        if not ok:
            raise ValueError("dry-run send should report success")
        if mock_email.send_email.call_count != 1:
            raise ValueError("expected exactly one mocked send_email call")
        sent_message = mock_email.send_email.call_args[0][0]
        if SAMPLE_RESET_TOKEN not in sent_message.text_body:
            raise ValueError("reset email body must include token in URL")

        results.append(_record("reset send path", status="PASS"))
    except Exception:
        results.append(_record("reset send path", status="FAIL"))
        critical_failures.append("reset send path check failed")

    print("==> Checking auth API routes ...")
    try:
        from app.main import app

        paths = app.openapi()["paths"]
        for path, method in (
            ("/api/v1/auth/request-password-reset", "post"),
            ("/api/v1/auth/reset-password", "post"),
        ):
            if path not in paths or method not in paths[path]:
                raise ValueError("password reset route missing from OpenAPI")
        print("Password reset routes are registered.")
        results.append(_record("auth password reset routes", status="PASS"))
    except Exception:
        results.append(_record("auth password reset routes", status="FAIL"))
        critical_failures.append("auth password reset routes check failed")

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
    print(NO_REAL_EMAILS)

    if critical_failures:
        print("\nCritical failures:")
        for failure in critical_failures:
            print(f"  - {failure}")
        return 1

    print("\nPassword reset dry-run audit passed.")
    return 0


def main() -> int:
    return run_audit()


if __name__ == "__main__":
    raise SystemExit(main())
