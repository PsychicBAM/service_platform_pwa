#!/usr/bin/env python3
"""Dry-run audit for email notification configuration and event wiring.

Safe to run without SMTP credentials — no real emails are sent.
"""

from __future__ import annotations

import sys
import uuid
from datetime import UTC, datetime
from pathlib import Path
from unittest.mock import MagicMock

api_dir = Path(__file__).resolve().parents[1]
if str(api_dir) not in sys.path:
    sys.path.insert(0, str(api_dir))

NO_REAL_EMAILS = "No real emails are sent during this audit."


def _record(name: str, *, status: str, detail: str = "") -> dict[str, str]:
    return {"name": name, "status": status, "detail": detail}


def _build_fixtures():
    from app.models.booking import Booking
    from app.models.business import Business
    from app.models.client import Client
    from app.models.enums import (
        BookingStatus,
        BusinessStatus,
        ClientSource,
        OperatingMode,
        OrderMessageSenderType,
        OrderStatus,
        PriceType,
        ServiceType,
    )
    from app.models.order import Order
    from app.models.order_message import OrderMessage
    from app.models.service import Service

    business = Business(
        id=uuid.uuid4(),
        name="Audit Demo Business",
        slug="audit-demo",
        contact_email="owner@example.com",
        timezone="UTC",
        operating_mode=OperatingMode.both,
        status=BusinessStatus.active,
        settings={"notification_email_enabled": True},
    )
    client = Client(
        id=uuid.uuid4(),
        business_id=business.id,
        full_name="Jane Doe",
        email="client@example.com",
        source=ClientSource.guest,
    )
    booking_service = Service(
        id=uuid.uuid4(),
        business_id=business.id,
        name="Arabic Lesson",
        type=ServiceType.booking,
        duration_minutes=60,
        currency="USD",
        price_type=PriceType.fixed,
        is_active=True,
        sort_order=0,
    )
    order_service = Service(
        id=uuid.uuid4(),
        business_id=business.id,
        name="Build Bot",
        type=ServiceType.order,
        currency="USD",
        price_type=PriceType.quote,
        is_active=True,
        sort_order=0,
    )
    booking = Booking(
        id=uuid.uuid4(),
        business_id=business.id,
        service_id=booking_service.id,
        client_id=client.id,
        reference="BKG-AUDIT-0001",
        starts_at=datetime(2026, 7, 1, 10, 0, tzinfo=UTC),
        ends_at=datetime(2026, 7, 1, 11, 0, tzinfo=UTC),
        status=BookingStatus.pending,
    )
    booking.client = client
    booking.service = booking_service

    order = Order(
        id=uuid.uuid4(),
        business_id=business.id,
        service_id=order_service.id,
        client_id=client.id,
        reference="ORD-AUDIT-0001",
        status=OrderStatus.submitted,
        form_data={"brief": "Audit order"},
    )
    order.client = client
    order.service = order_service

    admin_message = OrderMessage(
        id=uuid.uuid4(),
        order_id=order.id,
        sender_type=OrderMessageSenderType.admin,
        body="Admin reply for audit.",
    )
    client_message = OrderMessage(
        id=uuid.uuid4(),
        order_id=order.id,
        sender_type=OrderMessageSenderType.client,
        body="Client question for audit.",
    )

    return {
        "business": business,
        "client": client,
        "booking": booking,
        "order": order,
        "admin_message": admin_message,
        "client_message": client_message,
    }


def run_audit() -> int:
    results: list[dict[str, str]] = []
    critical_failures: list[str] = []

    print("Email notification dry-run audit")
    print(NO_REAL_EMAILS)
    print()

    print("==> Importing app.main ...")
    try:
        import app.main  # noqa: F401
        results.append(_record("import app.main", status="PASS"))
    except Exception as exc:
        results.append(_record("import app.main", status="FAIL", detail=str(exc)))
        critical_failures.append(f"import app.main: {exc}")

    print("==> Importing email modules ...")
    try:
        from app.services.email_service import EmailSendResult, EmailService
        from app.services.email_notification_service import EmailNotificationService
        import app.services.email_templates as email_templates  # noqa: F401

        results.append(_record("import email modules", status="PASS"))
    except Exception as exc:
        results.append(_record("import email modules", status="FAIL", detail=str(exc)))
        critical_failures.append(f"import email modules: {exc}")
        _print_summary(results, critical_failures)
        return 1

    print("==> Checking email settings ...")
    try:
        from app.config import get_settings

        settings = get_settings()
        enabled = settings.email_enabled
        dry_run = settings.email_dry_run
        print(f"    EMAIL_ENABLED={enabled}")
        print(f"    EMAIL_DRY_RUN={dry_run}")
        if not enabled or dry_run:
            results.append(
                _record(
                    "email settings",
                    status="PASS",
                    detail=f"EMAIL_ENABLED={enabled}, EMAIL_DRY_RUN={dry_run}",
                )
            )
        else:
            results.append(
                _record(
                    "email settings",
                    status="WARN",
                    detail="EMAIL_ENABLED=true and EMAIL_DRY_RUN=false — audit uses mocked sender",
                )
            )
    except Exception as exc:
        results.append(_record("email settings", status="FAIL", detail=str(exc)))
        critical_failures.append(f"email settings: {exc}")

    print("==> Building sample templates ...")
    try:
        from app.services.email_templates import (
            build_admin_booking_created_email,
            build_admin_order_message_email,
            build_admin_order_submitted_email,
            build_client_booking_cancelled_email,
            build_client_booking_confirmed_email,
            build_client_order_message_email,
            build_client_order_status_changed_email,
        )

        template_checks = [
            (
                "booking admin created template",
                build_admin_booking_created_email(
                    to_email="owner@example.com",
                    business_name="Demo",
                    service_name="Lesson",
                    reference="BKG-1",
                    client_name="Jane",
                    starts_at_label="2026-07-01 10:00 UTC",
                    status_label="Pending",
                ),
            ),
            (
                "booking client confirmed template",
                build_client_booking_confirmed_email(
                    to_email="client@example.com",
                    recipient_name="Jane",
                    business_name="Demo",
                    service_name="Lesson",
                    reference="BKG-1",
                    starts_at_label="2026-07-01 10:00 UTC",
                ),
            ),
            (
                "booking client cancelled template",
                build_client_booking_cancelled_email(
                    to_email="client@example.com",
                    recipient_name="Jane",
                    business_name="Demo",
                    service_name="Lesson",
                    reference="BKG-1",
                    starts_at_label="2026-07-01 10:00 UTC",
                ),
            ),
            (
                "order admin submitted template",
                build_admin_order_submitted_email(
                    to_email="owner@example.com",
                    business_name="Demo",
                    service_name="Build Bot",
                    reference="ORD-1",
                    client_name="Jane",
                ),
            ),
            (
                "order client status changed template",
                build_client_order_status_changed_email(
                    to_email="client@example.com",
                    recipient_name="Jane",
                    business_name="Demo",
                    service_name="Build Bot",
                    reference="ORD-1",
                    status_label="Accepted",
                ),
            ),
            (
                "order client message template",
                build_client_order_message_email(
                    to_email="client@example.com",
                    recipient_name="Jane",
                    business_name="Demo",
                    reference="ORD-1",
                    message_preview="Hello",
                ),
            ),
            (
                "order admin message template",
                build_admin_order_message_email(
                    to_email="owner@example.com",
                    business_name="Demo",
                    reference="ORD-1",
                    client_name="Jane",
                    message_preview="Hello",
                ),
            ),
        ]
        for label, message in template_checks:
            if not message.to_email or not message.subject or not message.text_body:
                raise ValueError(f"{label} missing required fields")
            results.append(_record(label, status="PASS"))
    except Exception as exc:
        results.append(_record("template creation", status="FAIL", detail=str(exc)))
        critical_failures.append(f"template creation: {exc}")

    print("==> Verifying notification service wiring (mocked sender) ...")
    try:
        from app.models.enums import OrderStatus
        from app.services.email_notification_service import EmailNotificationService
        from app.services.email_service import EmailSendResult

        mock_email = MagicMock()
        mock_email.send_email.return_value = EmailSendResult(
            sent=True,
            dry_run=True,
            message="Email dry-run (not sent)",
        )
        notifier = EmailNotificationService(email_service=mock_email)
        fixtures = _build_fixtures()
        business = fixtures["business"]
        booking = fixtures["booking"]
        order = fixtures["order"]

        notifier.notify_admin_booking_created(booking, business=business)
        notifier.notify_client_booking_confirmed(booking, business=business)
        notifier.notify_client_booking_cancelled(booking, business=business)
        notifier.notify_admin_order_submitted(order, business=business)
        notifier.notify_client_order_status_changed(
            order, OrderStatus.accepted, business=business
        )
        notifier.notify_order_message_received(
            order, fixtures["admin_message"], business=business
        )
        notifier.notify_order_message_received(
            order, fixtures["client_message"], business=business
        )

        call_count = mock_email.send_email.call_count
        if call_count < 7:
            raise ValueError(f"expected at least 7 notification calls, got {call_count}")
        results.append(
            _record(
                "notification service wiring",
                status="PASS",
                detail=f"{call_count} dry-run notification calls",
            )
        )
    except Exception as exc:
        results.append(
            _record("notification service wiring", status="FAIL", detail=str(exc))
        )
        critical_failures.append(f"notification wiring: {exc}")

    print("==> Checking skip behaviors ...")
    try:
        from app.services.email_notification_service import EmailNotificationService
        from app.services.email_service import EmailSendResult

        fixtures = _build_fixtures()
        skip_mock = MagicMock()
        skip_mock.send_email.return_value = EmailSendResult(
            sent=True, dry_run=True, message="dry-run"
        )
        skip_notifier = EmailNotificationService(email_service=skip_mock)

        disabled_business = fixtures["business"]
        disabled_business.settings = {"notification_email_enabled": False}
        skip_notifier.notify_admin_booking_created(
            fixtures["booking"], business=disabled_business
        )
        if skip_mock.send_email.called:
            raise ValueError("notification_email_enabled=false should skip sending")

        no_recipient_business = fixtures["business"]
        no_recipient_business.settings = {"notification_email_enabled": True}
        no_recipient_business.contact_email = None
        skip_mock.send_email.reset_mock()
        skip_notifier.notify_admin_booking_created(
            fixtures["booking"], business=no_recipient_business
        )
        if skip_mock.send_email.called:
            raise ValueError("missing recipient should skip sending")

        results.append(_record("skip behaviors", status="PASS"))
    except Exception as exc:
        results.append(_record("skip behaviors", status="WARN", detail=str(exc)))

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

    print("\nEmail notification dry-run audit passed.")
    return 0


def main() -> int:
    return run_audit()


if __name__ == "__main__":
    raise SystemExit(main())
