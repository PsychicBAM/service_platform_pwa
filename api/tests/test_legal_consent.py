from unittest.mock import patch

import pytest
from httpx import AsyncClient
from sqlalchemy import func, select

from app.models.booking import Booking
from app.models.business import Business
from app.models.order import Order
from app.models.user import User
from app.schemas.legal_consent import LEGAL_CONSENT_REQUIRED, LEGAL_CONSENT_VERSION
from tests.conftest import register_payload
from tests.test_bookings_availability_blocking import (
    FIXED_NOW,
    SLOT_START,
    _setup_booking_business,
)
from tests.test_public_booking_create import booking_payload
from tests.test_public_order_create import _setup_order_business, order_payload


def _validation_contains(detail: list, *, field: str, text: str) -> bool:
    return any(
        item.get("loc") == ["body", field] and text in str(item.get("msg", ""))
        for item in detail
    )


@pytest.mark.asyncio
async def test_register_missing_legal_consent_fails(async_client: AsyncClient) -> None:
    payload = register_payload("consent-missing")
    del payload["legal_consent_accepted"]

    response = await async_client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 422
    assert _validation_contains(
        response.json()["detail"],
        field="legal_consent_accepted",
        text="Field required",
    )


@pytest.mark.asyncio
async def test_register_false_legal_consent_fails(
    async_client: AsyncClient,
    db_session,
) -> None:
    payload = register_payload("consent-false")
    payload["legal_consent_accepted"] = False

    users_before = (await db_session.execute(select(func.count()).select_from(User))).scalar_one()

    response = await async_client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 422
    assert _validation_contains(
        response.json()["detail"],
        field="legal_consent_accepted",
        text=LEGAL_CONSENT_REQUIRED,
    )

    users_after = (await db_session.execute(select(func.count()).select_from(User))).scalar_one()
    assert users_after == users_before


@pytest.mark.asyncio
async def test_register_true_legal_consent_succeeds_and_stores_settings(
    async_client: AsyncClient,
    db_session,
) -> None:
    payload = register_payload("consent-ok")
    payload["legal_consent_accepted"] = True

    response = await async_client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201

    business = (
        await db_session.execute(
            select(Business).where(Business.slug == payload["business"]["slug"])
        )
    ).scalar_one()
    assert business.settings["legal_consent_accepted"] is True
    assert business.settings["legal_consent_version"] == LEGAL_CONSENT_VERSION
    assert business.settings["legal_consent_source"] == "registration"
    assert business.settings.get("legal_consent_recorded_at")


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_public_booking_missing_legal_consent_fails(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "book-consent-missing")
    payload = booking_payload(ctx["service_id"])
    del payload["legal_consent_accepted"]

    bookings_before = (await db_session.execute(select(func.count()).select_from(Booking))).scalar_one()

    response = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/bookings",
        json=payload,
    )
    assert response.status_code == 422
    assert _validation_contains(
        response.json()["detail"],
        field="legal_consent_accepted",
        text="Field required",
    )

    bookings_after = (await db_session.execute(select(func.count()).select_from(Booking))).scalar_one()
    assert bookings_after == bookings_before


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_public_booking_false_legal_consent_fails(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "book-consent-false")
    payload = booking_payload(ctx["service_id"])
    payload["legal_consent_accepted"] = False

    bookings_before = (await db_session.execute(select(func.count()).select_from(Booking))).scalar_one()

    response = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/bookings",
        json=payload,
    )
    assert response.status_code == 422
    assert _validation_contains(
        response.json()["detail"],
        field="legal_consent_accepted",
        text=LEGAL_CONSENT_REQUIRED,
    )

    bookings_after = (await db_session.execute(select(func.count()).select_from(Booking))).scalar_one()
    assert bookings_after == bookings_before


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_public_booking_true_legal_consent_succeeds(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "book-consent-ok")
    response = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/bookings",
        json=booking_payload(ctx["service_id"], starts_at=SLOT_START),
    )
    assert response.status_code == 201
    assert response.json()["status"] == "pending"


@pytest.mark.asyncio
async def test_public_order_missing_legal_consent_fails(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_order_business(async_client, db_session, "order-consent-missing")
    payload = order_payload(ctx["service_id"])
    del payload["legal_consent_accepted"]

    orders_before = (await db_session.execute(select(func.count()).select_from(Order))).scalar_one()

    response = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/orders",
        json=payload,
    )
    assert response.status_code == 422
    assert _validation_contains(
        response.json()["detail"],
        field="legal_consent_accepted",
        text="Field required",
    )

    orders_after = (await db_session.execute(select(func.count()).select_from(Order))).scalar_one()
    assert orders_after == orders_before


@pytest.mark.asyncio
async def test_public_order_false_legal_consent_fails(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_order_business(async_client, db_session, "order-consent-false")
    payload = order_payload(ctx["service_id"])
    payload["legal_consent_accepted"] = False

    orders_before = (await db_session.execute(select(func.count()).select_from(Order))).scalar_one()

    response = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/orders",
        json=payload,
    )
    assert response.status_code == 422
    assert _validation_contains(
        response.json()["detail"],
        field="legal_consent_accepted",
        text=LEGAL_CONSENT_REQUIRED,
    )

    orders_after = (await db_session.execute(select(func.count()).select_from(Order))).scalar_one()
    assert orders_after == orders_before


@pytest.mark.asyncio
async def test_public_order_true_legal_consent_succeeds(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_order_business(async_client, db_session, "order-consent-ok")
    response = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/orders",
        json=order_payload(ctx["service_id"]),
    )
    assert response.status_code == 201
    assert response.json()["status"] == "submitted"
