#!/usr/bin/env python3
"""Email/SMTP readiness audit — config and dry-run checks only; no real email by default."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

api_dir = Path(__file__).resolve().parents[1]
if str(api_dir) not in sys.path:
    sys.path.insert(0, str(api_dir))

NO_REAL_EMAILS = "No real emails are sent unless --send-test with live SMTP enabled."

_EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _record(name: str, *, status: str, detail: str = "") -> dict[str, str]:
    return {"name": name, "status": status, "detail": detail}


def _configured(value: str | None) -> str:
    return "set" if (value or "").strip() else "not_set"


def _validate_recipient(value: str) -> bool:
    return bool(_EMAIL_PATTERN.match(value.strip()))


def run_audit(*, strict: bool = False, send_test_to: str | None = None) -> int:
    results: list[dict[str, str]] = []
    critical_failures: list[str] = []

    print("Email readiness audit")
    print(NO_REAL_EMAILS)
    print()

    print("==> Loading settings ...")
    try:
        from pydantic import ValidationError
        from app.config import Settings

        settings = Settings()
    except ValidationError as exc:
        print("FAIL: settings validation failed")
        for error in exc.errors():
            print(f"    {error.get('msg', 'validation error')}")
        return 1
    except Exception:
        print("FAIL: could not load Settings")
        return 1

    print(f"    APP_ENV={settings.app_env}")
    print(f"    EMAIL_ENABLED={settings.email_enabled}")
    print(f"    EMAIL_DRY_RUN={settings.email_dry_run}")
    print(f"    SMTP_HOST={_configured(settings.smtp_host)}")
    print(f"    SMTP_PORT={settings.smtp_port}")
    print(f"    SMTP_USER={_configured(settings.smtp_user)}")
    print(f"    SMTP_PASSWORD={_configured(settings.smtp_password)}")
    print(f"    SMTP_FROM_EMAIL={_configured(settings.smtp_from_email)}")
    print(f"    SMTP_FROM_NAME={settings.smtp_from_name!r}")
    print(f"    SMTP_USE_TLS={settings.smtp_use_tls}")

    if not settings.email_enabled:
        results.append(
            _record(
                "Email mode",
                status="PASS",
                detail="EMAIL_ENABLED=false — SMTP secrets not required",
            )
        )
    elif settings.email_dry_run:
        results.append(
            _record(
                "Email mode",
                status="PASS",
                detail="EMAIL_DRY_RUN=true — outbound SMTP disabled",
            )
        )
    else:
        results.append(
            _record(
                "Email mode",
                status="WARN",
                detail="Live SMTP send enabled — verify provider credentials on VPS",
            )
        )

    issue_codes = settings.email_config_issue_codes()
    if issue_codes:
        results.append(
            _record(
                "SMTP config",
                status="FAIL" if strict or settings.app_env == "production" else "WARN",
                detail=", ".join(issue_codes),
            )
        )
        if strict or settings.app_env == "production":
            critical_failures.extend(issue_codes)
    elif settings.live_smtp_send_enabled:
        results.append(_record("SMTP config", status="PASS", detail="required fields present"))
    else:
        results.append(
            _record("SMTP config", status="PASS", detail="not required while email disabled/dry-run")
        )

    print("==> Dry-run send probe (no SMTP) ...")
    try:
        from app.services.email_service import (
            EMAIL_DRY_RUN,
            EMAIL_DISABLED,
            EmailMessage,
            EmailService,
        )

        probe = EmailService(settings=settings)
        probe_message = EmailMessage(
            to_email="readiness-probe@example.invalid",
            subject="Readiness probe",
            text_body="This body is not logged or printed.",
        )
        probe_result = probe.send_email(probe_message)
        print(f"    probe_message_code={probe_result.message_code}")

        if not settings.email_enabled:
            if probe_result.message_code != EMAIL_DISABLED:
                critical_failures.append("Dry-run probe expected EMAIL_DISABLED")
                results.append(_record("Dry-run probe", status="FAIL"))
            else:
                results.append(_record("Dry-run probe", status="PASS", detail=EMAIL_DISABLED))
        elif settings.email_dry_run:
            if probe_result.message_code != EMAIL_DRY_RUN:
                critical_failures.append("Dry-run probe expected EMAIL_DRY_RUN")
                results.append(_record("Dry-run probe", status="FAIL"))
            else:
                results.append(_record("Dry-run probe", status="PASS", detail=EMAIL_DRY_RUN))
        else:
            results.append(
                _record(
                    "Dry-run probe",
                    status="PASS",
                    detail="live mode — probe skipped real SMTP in audit",
                )
            )
    except Exception as exc:
        print(f"    FAIL: dry-run probe error: {exc.__class__.__name__}")
        critical_failures.append("Dry-run probe failed")
        results.append(_record("Dry-run probe", status="FAIL"))

    if send_test_to is not None:
        print("==> Send-test requested ...")
        if not settings.email_enabled:
            print("FAIL: --send-test refused — EMAIL_ENABLED=false")
            return 1
        if settings.email_dry_run:
            print("FAIL: --send-test refused — EMAIL_DRY_RUN=true")
            return 1
        if issue_codes:
            print("FAIL: --send-test refused — SMTP config incomplete")
            for code in issue_codes:
                print(f"    {code}")
            return 1
        if not _validate_recipient(send_test_to):
            print("FAIL: --send-test recipient is not a valid email address")
            return 1

        import importlib.util

        send_path = api_dir / "scripts" / "send_test_email.py"
        spec = importlib.util.spec_from_file_location("send_test_email", send_path)
        if spec is None or spec.loader is None:
            print("FAIL: could not load send_test_email.py")
            return 1
        send_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(send_module)

        print("Live send-test — one explicit recipient only.")
        return send_module.send_test_email(send_test_to, settings=settings)

    return _print_summary(results, critical_failures, strict=strict)


def _print_summary(
    results: list[dict[str, str]],
    critical_failures: list[str],
    *,
    strict: bool,
) -> int:
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

    if strict and warn_count:
        print("\nStrict mode: warnings treated as acceptable for non-live email configs.")

    print("\nEmail readiness audit passed.")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Email/SMTP readiness audit — safe config summary; no real email by default.",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Fail when live SMTP is enabled but configuration is incomplete",
    )
    parser.add_argument(
        "--send-test",
        metavar="EMAIL",
        help=(
            "Send one live test email to an explicit recipient. "
            "Refused unless EMAIL_ENABLED=true and EMAIL_DRY_RUN=false."
        ),
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    recipient = args.send_test.strip() if args.send_test else None
    if recipient and ("," in recipient or ";" in recipient):
        print("Only one recipient is allowed for --send-test.")
        return 1
    return run_audit(strict=args.strict, send_test_to=recipient)


if __name__ == "__main__":
    raise SystemExit(main())
