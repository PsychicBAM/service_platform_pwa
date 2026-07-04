#!/usr/bin/env python3
"""Dry-run audit for email verification configuration and wiring.

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


def _record(name: str, *, status: str, detail: str = "") -> dict[str, str]:
    return {"name": name, "status": status, "detail": detail}


def run_audit() -> int:
    results: list[dict[str, str]] = []
    critical_failures: list[str] = []

    print("Email verification dry-run audit")
    print(NO_REAL_EMAILS)
    print()

    print("==> Importing app.main ...")
    try:
        import app.main  # noqa: F401

        results.append(_record("import app.main", status="PASS"))
    except Exception as exc:
        results.append(_record("import app.main", status="FAIL", detail=str(exc)))
        critical_failures.append(f"import app.main: {exc}")

    print("==> Importing email verification modules ...")
    try:
        from app.models.email_verification_token import EmailVerificationToken
        from app.services.email_verification_service import (
            EmailVerificationService,
            build_verification_url,
            hash_verification_token,
        )

        results.append(_record("import email verification modules", status="PASS"))
    except Exception as exc:
        results.append(
            _record("import email verification modules", status="FAIL", detail=str(exc))
        )
        critical_failures.append(f"import email verification modules: {exc}")
        return _print_summary(results, critical_failures)

    print("==> Checking verification config ...")
    try:
        from app.config import get_settings

        settings = get_settings()
        expire_hours = settings.email_verification_token_expire_hours
        base_url = settings.email_verification_base_url
        require_login = settings.require_email_verification_for_login

        print(f"    EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS={expire_hours}")
        print(f"    EMAIL_VERIFICATION_BASE_URL={base_url}")
        print(f"    REQUIRE_EMAIL_VERIFICATION_FOR_LOGIN={require_login}")

        if expire_hours <= 0:
            raise ValueError("EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS must be positive")
        if not base_url.strip():
            raise ValueError("EMAIL_VERIFICATION_BASE_URL must not be empty")
        if "verify-email" not in base_url:
            results.append(
                _record(
                    "verification config",
                    status="WARN",
                    detail=f"base URL may not target verify-email route: {base_url}",
                )
            )
        else:
            results.append(
                _record(
                    "verification config",
                    status="PASS",
                    detail=(
                        f"expire_hours={expire_hours}, "
                        f"require_login={require_login}, base_url={base_url}"
                    ),
                )
            )
        if require_login:
            results.append(
                _record(
                    "login enforcement default",
                    status="WARN",
                    detail="REQUIRE_EMAIL_VERIFICATION_FOR_LOGIN=true — login blocked until verified",
                )
            )
        else:
            results.append(
                _record(
                    "login enforcement default",
                    status="PASS",
                    detail="REQUIRE_EMAIL_VERIFICATION_FOR_LOGIN=false",
                )
            )
    except Exception as exc:
        results.append(_record("verification config", status="FAIL", detail=str(exc)))
        critical_failures.append(f"verification config: {exc}")

    print("==> Building verification URL and template ...")
    try:
        from app.config import get_settings
        from app.services.email_templates import build_email_verification_email

        settings = get_settings()
        sample_token = "audit-sample-token-not-stored"
        verification_url = build_verification_url(sample_token, settings)
        if sample_token not in verification_url:
            raise ValueError("verification URL must include sample token query param")
        if not verification_url.startswith(settings.email_verification_base_url.rstrip("/")):
            raise ValueError("verification URL must use configured base URL")

        message = build_email_verification_email(
            user_email="owner@example.com",
            verification_url=verification_url,
            expire_hours=settings.email_verification_token_expire_hours,
        )
        if not message.to_email or not message.subject or not message.text_body:
            raise ValueError("verification email template missing required fields")
        if verification_url not in message.text_body:
            raise ValueError("verification URL must appear in email body")

        results.append(
            _record(
                "verification URL and template",
                status="PASS",
                detail=f"url={verification_url}",
            )
        )
    except Exception as exc:
        results.append(
            _record("verification URL and template", status="FAIL", detail=str(exc))
        )
        critical_failures.append(f"verification template: {exc}")

    print("==> Checking token hashing (no raw token storage) ...")
    try:
        from app.models.email_verification_token import EmailVerificationToken

        raw_token = "audit-raw-token-example"
        token_hash = hash_verification_token(raw_token)
        if raw_token == token_hash:
            raise ValueError("hash must differ from raw token")
        if len(token_hash) != 64:
            raise ValueError(f"expected sha256 hex length 64, got {len(token_hash)}")
        if not all(c in "0123456789abcdef" for c in token_hash):
            raise ValueError("token hash must be lowercase hex")

        columns = {column.name for column in EmailVerificationToken.__table__.columns}
        if "token_hash" not in columns:
            raise ValueError("EmailVerificationToken must have token_hash column")
        if "token" in columns or "raw_token" in columns:
            raise ValueError("EmailVerificationToken must not store raw token column")

        results.append(
            _record(
                "token hashing",
                status="PASS",
                detail="only token_hash stored; hash_verification_token uses sha256",
            )
        )
    except Exception as exc:
        results.append(_record("token hashing", status="FAIL", detail=str(exc)))
        critical_failures.append(f"token hashing: {exc}")

    print("==> Verifying send path uses dry-run/mock (no real SMTP) ...")
    try:
        import asyncio
        import uuid

        from app.services.email_service import EmailSendResult
        from app.services.email_verification_service import EmailVerificationService

        mock_email = MagicMock()
        mock_email.send_email.return_value = EmailSendResult(
            sent=True,
            dry_run=True,
            message="EMAIL_DRY_RUN",
            message_code="EMAIL_DRY_RUN",
        )
        service = EmailVerificationService(
            session=MagicMock(),
            email_service=mock_email,
        )
        user = MagicMock()
        user.id = uuid.uuid4()
        user.email = "owner@example.com"

        ok = asyncio.run(
            service.send_verification_email_best_effort(user, "audit-mock-token")
        )
        if not ok:
            raise ValueError("dry-run send should report success")
        if mock_email.send_email.call_count != 1:
            raise ValueError("expected exactly one mocked send_email call")
        sent_message = mock_email.send_email.call_args[0][0]
        if "audit-mock-token" not in sent_message.text_body:
            raise ValueError("verification email body must include token in URL")

        results.append(
            _record(
                "verification send path",
                status="PASS",
                detail="mocked EmailService dry-run; no real SMTP",
            )
        )
    except Exception as exc:
        results.append(
            _record("verification send path", status="FAIL", detail=str(exc))
        )
        critical_failures.append(f"verification send path: {exc}")

    print("==> Checking auth API routes ...")
    try:
        from app.main import app

        paths = app.openapi()["paths"]
        for path, method in (
            ("/api/v1/auth/verify-email", "post"),
            ("/api/v1/auth/resend-verification", "post"),
        ):
            if path not in paths or method not in paths[path]:
                raise ValueError(f"{method.upper()} {path} missing from OpenAPI")
        results.append(_record("auth verification routes", status="PASS"))
    except Exception as exc:
        results.append(_record("auth verification routes", status="FAIL", detail=str(exc)))
        critical_failures.append(f"auth routes: {exc}")

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
    print(NO_REAL_EMAILS)

    if critical_failures:
        print("\nCritical failures:")
        for failure in critical_failures:
            print(f"  - {failure}")
        return 1

    print("\nEmail verification dry-run audit passed.")
    return 0


def main() -> int:
    return run_audit()


if __name__ == "__main__":
    raise SystemExit(main())
