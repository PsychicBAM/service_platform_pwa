"""Service currency settings drive public/admin service price currency."""

from __future__ import annotations

from types import SimpleNamespace

from app.schemas.service import PublicServiceRead, ServiceRead
from app.utils.service_currency import resolve_service_currency


def test_resolve_service_currency_defaults_and_normalizes() -> None:
    assert resolve_service_currency(None) == "USD"
    assert resolve_service_currency({"service_currency": "rub"}) == "RUB"


def test_public_service_read_uses_display_currency_override() -> None:
    service = SimpleNamespace(
        id="00000000-0000-0000-0000-000000000001",
        name="Lesson",
        description=None,
        category=None,
        type=SimpleNamespace(value="booking"),
        duration_minutes=60,
        price_cents=5000,
        currency="USD",
        price_type=SimpleNamespace(value="fixed"),
        require_payment=False,
        sort_order=0,
        capacity=1,
        image_=None,
    )
    # Enums are used in real models; patch with real enums for from_service.
    from app.models.enums import PriceType, ServiceType

    service.type = ServiceType.booking
    service.price_type = PriceType.fixed
    service.id = __import__("uuid").UUID("00000000-0000-0000-0000-000000000001")

    read = PublicServiceRead.from_service(service, display_currency="RUB")
    assert read.currency == "RUB"
    assert read.price_cents == 5000


def test_admin_service_read_uses_display_currency_override() -> None:
    from datetime import datetime, timezone
    from uuid import UUID

    from app.models.enums import PriceType, ServiceType

    now = datetime.now(timezone.utc)
    service = SimpleNamespace(
        id=UUID("00000000-0000-0000-0000-000000000002"),
        business_id=UUID("00000000-0000-0000-0000-000000000099"),
        name="Lesson",
        description=None,
        category=None,
        type=ServiceType.booking,
        duration_minutes=60,
        price_cents=5000,
        currency="USD",
        price_type=PriceType.fixed,
        require_payment=False,
        is_active=True,
        sort_order=0,
        capacity=1,
        booking_min_notice_minutes=0,
        booking_window_days=None,
        waitlist_enabled=False,
        metadata_={},
        image_=None,
        created_at=now,
        updated_at=now,
    )
    read = ServiceRead.from_service(service, display_currency="RUB")
    assert read.currency == "RUB"
