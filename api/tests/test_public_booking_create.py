import uuid
from datetime import datetime
from unittest.mock import patch
from zoneinfo import ZoneInfo

import pytest
from httpx import AsyncClient
from sqlalchemy import select, update

from app.main import app
from app.models.business import Business
from app.models.client import Client
from app.models.enums import BookingStatus, OperatingMode
from app.repositories.business_repository import DEFAULT_BUSINESS_SETTINGS
from tests.conftest import (
    BOOKING_SERVICE_PAYLOAD,
    ORDER_SERVICE_PAYLOAD,
    register_and_get_context,
    weekday_working_hours_payload,
)
from tests.test_bookings_availability_blocking import (
    FIXED_NOW,
    SLOT_END,
    SLOT_START,
    TARGET_DATE,
    _insert_booking,
    _setup_booking_business,
)


def booking_payload(service_id: str, starts_at: datetime | None = None, **client) -> dict:
    return {
        "service_id": service_id,
        "starts_at": (starts_at or SLOT_START).isoformat(),
        "legal_consent_accepted": True,
        "client": {
            "full_name": "Jane Doe",
            "email": "jane.doe@example.com",
            "phone": "+15550101",
            **client,
        },
    }


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_public_booking_can_be_created(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "pub-book-create")
    response = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/bookings",
        json=booking_payload(ctx["service_id"]),
    )
    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "pending"
    assert body["reference"].startswith("BKG-2026-")
    assert body["service"]["type"] == "booking"
    assert body["payment_required"] is False
    assert body["payment"] is None


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_booking_creates_client_when_not_exists(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "pub-book-new-client")
    await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/bookings",
        json=booking_payload(ctx["service_id"], email="newclient@example.com"),
    )
    client = (
        await db_session.execute(
            select(Client).where(
                Client.business_id == uuid.UUID(ctx["business_id"]),
                Client.email == "newclient@example.com",
            )
        )
    ).scalar_one()
    assert client.full_name == "Jane Doe"


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_booking_reuses_existing_client_by_email(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "pub-book-reuse-client")
    email = "reuse@example.com"
    first = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/bookings",
        json=booking_payload(
            ctx["service_id"],
            starts_at=datetime(2026, 6, 23, 11, 0, tzinfo=ZoneInfo("America/New_York")),
            email=email,
        ),
    )
    second = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/bookings",
        json=booking_payload(
            ctx["service_id"],
            starts_at=datetime(2026, 6, 23, 14, 0, tzinfo=ZoneInfo("America/New_York")),
            email=email,
        ),
    )
    assert first.status_code == 201
    assert second.status_code == 201
    assert first.json()["client"]["id"] == second.json()["client"]["id"]


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_booking_status_pending_by_default(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "pub-book-pending")
    response = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/bookings",
        json=booking_payload(ctx["service_id"]),
    )
    assert response.json()["status"] == "pending"


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_auto_confirm_creates_confirmed_booking(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "pub-book-auto")
    settings = dict(DEFAULT_BUSINESS_SETTINGS)
    settings["auto_confirm_bookings"] = True
    await db_session.execute(
        update(Business).where(Business.slug == ctx["slug"]).values(settings=settings)
    )
    await db_session.commit()
    response = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/bookings",
        json=booking_payload(ctx["service_id"]),
    )
    assert response.json()["status"] == "confirmed"


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_order_service_cannot_be_booked(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "pub-book-order")
    order_resp = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/services",
        json=ORDER_SERVICE_PAYLOAD,
        headers=ctx["headers"],
    )
    response = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/bookings",
        json=booking_payload(order_resp.json()["id"]),
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "SERVICE_NOT_BOOKABLE"


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_inactive_service_cannot_be_booked(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "pub-book-inactive")
    await async_client.patch(
        f"/api/v1/businesses/{ctx['business_id']}/services/{ctx['service_id']}",
        json={"is_active": False},
        headers=ctx["headers"],
    )
    response = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/bookings",
        json=booking_payload(ctx["service_id"]),
    )
    assert response.status_code == 404


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_orders_only_business_rejects_booking(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "pub-book-orders-only")
    await db_session.execute(
        update(Business)
        .where(Business.slug == ctx["slug"])
        .values(operating_mode=OperatingMode.orders_only)
    )
    await db_session.commit()
    response = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/bookings",
        json=booking_payload(ctx["service_id"]),
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "SERVICE_NOT_BOOKABLE"


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_pending_setup_business_rejects_public_booking(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await register_and_get_context(async_client, "pub-book-pending-biz")
    await async_client.put(
        f"/api/v1/businesses/{ctx['business_id']}/schedule/working-hours",
        json=weekday_working_hours_payload(),
        headers=ctx["headers"],
    )
    service_resp = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/services",
        json=BOOKING_SERVICE_PAYLOAD,
        headers=ctx["headers"],
    )
    response = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/bookings",
        json=booking_payload(service_resp.json()["id"]),
    )
    assert response.status_code == 404


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_slot_outside_working_hours_rejected(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "pub-book-off-hours")
    early = datetime(2026, 6, 23, 8, 0, tzinfo=ZoneInfo("America/New_York"))
    response = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/bookings",
        json=booking_payload(ctx["service_id"], starts_at=early),
    )
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "SLOT_UNAVAILABLE"


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_slot_during_break_rejected(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "pub-book-break")
    await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/schedule/breaks",
        json={"label": "Lunch", "day_of_week": 2, "starts_at": "12:00", "ends_at": "13:00"},
        headers=ctx["headers"],
    )
    lunch = datetime(2026, 6, 23, 12, 0, tzinfo=ZoneInfo("America/New_York"))
    response = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/bookings",
        json=booking_payload(ctx["service_id"], starts_at=lunch),
    )
    assert response.status_code == 409


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_slot_during_unavailable_time_rejected(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "pub-book-unavail")
    await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/schedule/unavailable-times",
        json={
            "starts_at": "2026-06-23T10:00:00-04:00",
            "ends_at": "2026-06-23T11:00:00-04:00",
        },
        headers=ctx["headers"],
    )
    response = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/bookings",
        json=booking_payload(ctx["service_id"]),
    )
    assert response.status_code == 409


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_double_booking_same_slot_rejected(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "pub-book-double")
    first = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/bookings",
        json=booking_payload(ctx["service_id"]),
    )
    second = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/bookings",
        json=booking_payload(
            ctx["service_id"],
            email="other@example.com",
        ),
    )
    assert first.status_code == 201
    assert second.status_code == 409


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_cancelled_booking_does_not_block_new_booking(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "pub-book-cancelled")
    await _insert_booking(
        db_session,
        ctx,
        starts_at=SLOT_START,
        ends_at=SLOT_END,
        status=BookingStatus.cancelled,
    )
    response = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/bookings",
        json=booking_payload(ctx["service_id"]),
    )
    assert response.status_code == 201


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
@pytest.mark.parametrize("status", [BookingStatus.completed, BookingStatus.no_show])
async def test_completed_and_no_show_do_not_block_new_booking(
    _mock_now,
    async_client: AsyncClient,
    db_session,
    status: BookingStatus,
) -> None:
    ctx = await _setup_booking_business(
        async_client,
        db_session,
        f"pub-book-noblock-{status.value.replace('_', '-')}",
    )
    await _insert_booking(
        db_session,
        ctx,
        starts_at=SLOT_START,
        ends_at=SLOT_END,
        status=status,
    )
    response = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/bookings",
        json=booking_payload(ctx["service_id"]),
    )
    assert response.status_code == 201


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_booking_reference_unique_per_business(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "pub-book-ref")
    first = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/bookings",
        json=booking_payload(ctx["service_id"]),
    )
    second = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/bookings",
        json=booking_payload(
            ctx["service_id"],
            starts_at=datetime(2026, 6, 23, 11, 0, tzinfo=ZoneInfo("America/New_York")),
            email="second@example.com",
        ),
    )
    assert first.json()["reference"] != second.json()["reference"]


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_client_input_requires_name_and_email_or_phone(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "pub-book-client-val")
    response = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/bookings",
        json={
            "service_id": ctx["service_id"],
            "starts_at": SLOT_START.isoformat(),
            "legal_consent_accepted": True,
            "client": {"full_name": "Jane Doe"},
        },
    )
    assert response.status_code == 422


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_booked_slot_disappears_from_availability(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "pub-book-avail")
    before = await async_client.get(
        f"/api/v1/public/b/{ctx['slug']}/availability",
        params={"service_id": ctx["service_id"], "date": TARGET_DATE.isoformat()},
    )
    assert any(
        datetime.fromisoformat(s["starts_at"]) == SLOT_START
        for s in before.json()["slots"]
    )
    await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/bookings",
        json=booking_payload(ctx["service_id"]),
    )
    after = await async_client.get(
        f"/api/v1/public/b/{ctx['slug']}/availability",
        params={"service_id": ctx["service_id"], "date": TARGET_DATE.isoformat()},
    )
    assert not any(
        datetime.fromisoformat(s["starts_at"]) == SLOT_START
        for s in after.json()["slots"]
    )


def test_openapi_includes_public_booking_create() -> None:
    paths = app.openapi()["paths"]
    assert "/api/v1/public/b/{slug}/bookings" in paths
    assert "post" in paths["/api/v1/public/b/{slug}/bookings"]
