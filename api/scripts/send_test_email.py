#!/usr/bin/env python3
"""Send exactly one manual SMTP test email to an explicit recipient.

For VPS/operator verification only — never use for bulk or customer email.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

api_dir = Path(__file__).resolve().parents[1]
if str(api_dir) not in sys.path:
    sys.path.insert(0, str(api_dir))

DEFAULT_SUBJECT = "Service Platform test"
DEFAULT_BODY = "This is a test email."

_EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def is_valid_email(value: str) -> bool:
    return bool(_EMAIL_PATTERN.match(value.strip()))


def format_email_mode(settings) -> str:
    smtp_host = "set" if (settings.smtp_host or "").strip() else "not_set"
    smtp_from = "set" if (settings.smtp_from_email or "").strip() else "not_set"
    return (
        f"EMAIL_ENABLED={settings.email_enabled}\n"
        f"EMAIL_DRY_RUN={settings.email_dry_run}\n"
        f"SMTP_HOST={smtp_host}\n"
        f"SMTP_FROM_EMAIL={smtp_from}"
    )


def send_test_email(
    to_email: str,
    *,
    subject: str = DEFAULT_SUBJECT,
    body: str = DEFAULT_BODY,
    settings=None,
    email_service=None,
) -> int:
    from app.config import Settings, get_settings
    from app.services.email_service import EmailMessage, EmailService

    resolved_settings = settings or get_settings()
    service = email_service or EmailService(settings=resolved_settings)

    print("SMTP test email — operator verification only")
    print(format_email_mode(resolved_settings))
    print()

    if not is_valid_email(to_email):
        print(f"Invalid recipient email: {to_email!r}")
        return 1

    if not resolved_settings.email_enabled:
        print("Email is disabled. Set EMAIL_ENABLED=true.")
        return 1

    message = EmailMessage(to_email=to_email.strip(), subject=subject, text_body=body)

    if resolved_settings.email_dry_run:
        result = service.send_email(message)
        print(f"Recipient: {to_email}")
        print(f"Subject: {subject}")
        print("Dry-run mode: no real email was sent.")
        print(f"Result code: {result.message_code}")
        return 0

    print(f"Sending one live test email to: {to_email}")
    result = service.send_email(message)
    if result.sent and not result.dry_run:
        print("Test email sent successfully.")
        return 0

    print(f"Failed to send test email: {result.message_code}")
    return 1


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Send exactly one manual SMTP test email to an explicit recipient. "
            "For VPS/operator verification only."
        ),
    )
    parser.add_argument(
        "--to",
        required=True,
        metavar="EMAIL",
        help="Single recipient email address (required)",
    )
    parser.add_argument(
        "--subject",
        default=DEFAULT_SUBJECT,
        help=f"Email subject (default: {DEFAULT_SUBJECT!r})",
    )
    parser.add_argument(
        "--body",
        default=DEFAULT_BODY,
        help=f"Plain-text body (default: {DEFAULT_BODY!r})",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    recipient = args.to.strip()
    if "," in recipient or ";" in recipient:
        print("Only one recipient is allowed. Do not pass multiple addresses.")
        return 1

    return send_test_email(
        recipient,
        subject=args.subject,
        body=args.body,
    )


if __name__ == "__main__":
    raise SystemExit(main())
