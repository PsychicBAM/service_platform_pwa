import importlib.util
from pathlib import Path
from unittest.mock import patch

import pytest
from httpx import AsyncClient
from sqlalchemy import func, select

from app.database import Base
from app.models.booking import Booking
from app.models.business import Business
from app.models.enums import ConsentEntityType, ConsentSource
from app.models.legal_consent_record import LegalConsentRecord
from app.models.order import Order
from app.models.user import User
from app.schemas.legal_consent import LEGAL_CONSENT_VERSION
from tests.conftest import register_payload
from tests.test_bookings_availability_blocking import (
    FIXED_NOW,
    SLOT_START,
    _setup_booking_business,
)
from tests.test_public_booking_create import booking_payload
from tests.test_public_order_create import _setup_order_business, order_payload

REGISTER_RESPONSE_KEYS = {"user", "business", "tokens"}
BOOKING_RESPONSE_KEYS = {
    "id",
    "reference",
    "status",
    "service",
    "client",
    "starts_at",
    "ends_at",
    "payment_required",
    "payment",
}
ORDER_RESPONSE_KEYS = {
    "id",
    "reference",
    "status",
    "service",
    "client",
    "form_data",
    "created_at",
    "payment_required",
    "payment",
}


async def _consent_count(db_session) -> int:
    return (await db_session.execute(select(func.count()).select_from(LegalConsentRecord))).scalar_one()


@pytest.mark.asyncio
async def test_registration_creates_consent_record(
    async_client: AsyncClient,
    db_session,
) -> None:
    payload = register_payload("consent-record-reg")
    response = await async_client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201

    business = (
        await db_session.execute(
            select(Business).where(Business.slug == payload["business"]["slug"])
        )
    ).scalar_one()
    user = (
        await db_session.execute(select(User).where(User.email == payload["email"]))
    ).scalar_one()

    record = (
        await db_session.execute(
            select(LegalConsentRecord).where(
                LegalConsentRecord.entity_id == business.id,
                LegalConsentRecord.source == ConsentSource.registration.value,
            )
        )
    ).scalar_one()

    assert record.entity_type == ConsentEntityType.business.value
    assert record.business_id == business.id
    assert record.user_id == user.id
    assert record.client_id is None
    assert record.legal_consent_version == LEGAL_CONSENT_VERSION
    assert record.accepted_at is not None
    assert record.created_at is not None


@pytest.mark.asyncio
async def test_registration_missing_consent_creates_no_record(
    async_client: AsyncClient,
    db_session,
) -> None:
    payload = register_payload("consent-record-reg-missing")
    del payload["legal_consent_accepted"]
    before = await _consent_count(db_session)

    response = await async_client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 422
    assert await _consent_count(db_session) == before


@pytest.mark.asyncio
async def test_registration_false_consent_creates_no_record(
    async_client: AsyncClient,
    db_session,
) -> None:
    payload = register_payload("consent-record-reg-false")
    payload["legal_consent_accepted"] = False
    before = await _consent_count(db_session)

    response = await async_client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 422
    assert await _consent_count(db_session) == before


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_public_booking_creates_consent_record(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "consent-record-book")
    response = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/bookings",
        json=booking_payload(ctx["service_id"], starts_at=SLOT_START),
    )
    assert response.status_code == 201
    booking_id = response.json()["id"]

    record = (
        await db_session.execute(
            select(LegalConsentRecord).where(
                LegalConsentRecord.entity_id == booking_id,
                LegalConsentRecord.source == ConsentSource.public_booking.value,
            )
        )
    ).scalar_one()

    assert record.entity_type == ConsentEntityType.booking.value
    assert str(record.business_id) == ctx["business_id"]
    assert record.client_id is not None
    assert record.user_id is None
    assert record.legal_consent_version == LEGAL_CONSENT_VERSION


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_public_booking_missing_consent_creates_no_record(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "consent-record-book-miss")
    payload = booking_payload(ctx["service_id"])
    del payload["legal_consent_accepted"]
    before_bookings = (
        await db_session.execute(select(func.count()).select_from(Booking))
    ).scalar_one()
    before_consent = await _consent_count(db_session)

    response = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/bookings",
        json=payload,
    )
    assert response.status_code == 422
    after_bookings = (
        await db_session.execute(select(func.count()).select_from(Booking))
    ).scalar_one()
    assert after_bookings == before_bookings
    assert await _consent_count(db_session) == before_consent


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_public_booking_false_consent_creates_no_record(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "consent-record-book-false")
    payload = booking_payload(ctx["service_id"])
    payload["legal_consent_accepted"] = False
    before = await _consent_count(db_session)

    response = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/bookings",
        json=payload,
    )
    assert response.status_code == 422
    assert await _consent_count(db_session) == before


@pytest.mark.asyncio
async def test_public_order_creates_consent_record(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_order_business(async_client, db_session, "consent-record-order")
    response = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/orders",
        json=order_payload(ctx["service_id"]),
    )
    assert response.status_code == 201
    order_id = response.json()["id"]

    record = (
        await db_session.execute(
            select(LegalConsentRecord).where(
                LegalConsentRecord.entity_id == order_id,
                LegalConsentRecord.source == ConsentSource.public_order.value,
            )
        )
    ).scalar_one()

    assert record.entity_type == ConsentEntityType.order.value
    assert str(record.business_id) == ctx["business_id"]
    assert record.client_id is not None
    assert record.user_id is None
    assert record.legal_consent_version == LEGAL_CONSENT_VERSION


@pytest.mark.asyncio
async def test_public_order_missing_consent_creates_no_record(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_order_business(async_client, db_session, "consent-record-order-miss")
    payload = order_payload(ctx["service_id"])
    del payload["legal_consent_accepted"]
    before_orders = (await db_session.execute(select(func.count()).select_from(Order))).scalar_one()
    before_consent = await _consent_count(db_session)

    response = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/orders",
        json=payload,
    )
    assert response.status_code == 422
    after_orders = (await db_session.execute(select(func.count()).select_from(Order))).scalar_one()
    assert after_orders == before_orders
    assert await _consent_count(db_session) == before_consent


@pytest.mark.asyncio
async def test_public_order_false_consent_creates_no_record(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_order_business(async_client, db_session, "consent-record-order-false")
    payload = order_payload(ctx["service_id"])
    payload["legal_consent_accepted"] = False
    before = await _consent_count(db_session)

    response = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/orders",
        json=payload,
    )
    assert response.status_code == 422
    assert await _consent_count(db_session) == before


@pytest.mark.asyncio
async def test_api_response_shapes_unchanged(
    async_client: AsyncClient,
    db_session,
) -> None:
    reg_payload = register_payload("consent-record-shape-reg")
    reg_response = await async_client.post("/api/v1/auth/register", json=reg_payload)
    assert reg_response.status_code == 201
    assert set(reg_response.json().keys()) == REGISTER_RESPONSE_KEYS

    book_ctx = await _setup_booking_business(async_client, db_session, "consent-record-shape-book")
    with patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW):
        book_response = await async_client.post(
            f"/api/v1/public/b/{book_ctx['slug']}/bookings",
            json=booking_payload(book_ctx["service_id"], starts_at=SLOT_START),
        )
    assert book_response.status_code == 201
    assert set(book_response.json().keys()) == BOOKING_RESPONSE_KEYS

    order_ctx = await _setup_order_business(async_client, db_session, "consent-record-shape-order")
    order_response = await async_client.post(
        f"/api/v1/public/b/{order_ctx['slug']}/orders",
        json=order_payload(order_ctx["service_id"]),
    )
    assert order_response.status_code == 201
    assert set(order_response.json().keys()) == ORDER_RESPONSE_KEYS


def test_legal_consent_record_model_in_metadata() -> None:
    assert LegalConsentRecord.__tablename__ == "legal_consent_records"
    assert "legal_consent_records" in Base.metadata.tables


def test_migration_0010_exists_and_imports() -> None:
    migration_path = (
        Path(__file__).resolve().parents[1]
        / "alembic"
        / "versions"
        / "0010_legal_consent_records.py"
    )
    assert migration_path.is_file()

    spec = importlib.util.spec_from_file_location("migration_0010", migration_path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    assert module.revision == "0010"
    assert module.down_revision == "0009"
    assert callable(module.upgrade)
    assert callable(module.downgrade)
