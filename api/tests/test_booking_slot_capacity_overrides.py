from datetime import UTC, date, datetime, timedelta
from unittest.mock import patch
from zoneinfo import ZoneInfo

import pytest
import uuid
from httpx import AsyncClient

from app.models.booking import Booking
from app.models.client import Client
from app.models.enums import BookingStatus, ClientSource, UserRole
from app.models.user import User
from app.services.booking_capacity import SLOT_FULLY_BOOKED_MESSAGE
from app.services.password_service import hash_password
from tests.conftest import ORDER_SERVICE_PAYLOAD, register_and_get_context
from tests.test_booking_capacity import booking_payload
from tests.test_bookings_availability_blocking import (
    FIXED_NOW,
    SLOT_END,
    SLOT_START,
    TARGET_DATE,
    _insert_booking,
    _setup_booking_business,
    _slot_at_10am,
)

SLOT_11_START = datetime(2026, 6, 23, 11, 0, tzinfo=ZoneInfo("America/New_York"))
SLOT_11_END = datetime(2026, 6, 23, 11, 30, tzinfo=ZoneInfo("America/New_York"))
FUTURE_SLOT_START = datetime(2026, 6, 25, 10, 0, tzinfo=ZoneInfo("America/New_York"))
FUTURE_SLOT_11_START = datetime(2026, 6, 25, 11, 0, tzinfo=ZoneInfo("America/New_York"))
FUTURE_TARGET_DATE = date(2026, 6, 25)


def override_payload(starts_at: datetime, capacity: int = 10, note: str | None = "Group session") -> dict:
    return {
        "starts_at": starts_at.isoformat(),
        "capacity": capacity,
        "note": note,
    }


async def _create_override(
    async_client: AsyncClient,
    ctx: dict,
    *,
    starts_at: datetime = SLOT_START,
    capacity: int = 10,
) -> dict:
    response = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/services/{ctx['service_id']}/slot-capacity-overrides",
        json=override_payload(starts_at, capacity=capacity),
        headers=ctx["headers"],
    )
    assert response.status_code == 201, response.text
    return response.json()


async def _client_headers_for_booking(
    async_client: AsyncClient,
    db_session,
    ctx: dict,
    *,
    starts_at: datetime,
    suffix: str,
) -> tuple[str, dict]:
    user = User(
        email=f"client-{suffix}@example.com",
        password_hash=hash_password("securePass123"),
        full_name="Client User",
        role=UserRole.client,
    )
    db_session.add(user)
    await db_session.flush()
    client = Client(
        business_id=uuid.UUID(ctx["business_id"]),
        user_id=user.id,
        full_name="Client User",
        email=user.email,
        source=ClientSource.registered,
    )
    db_session.add(client)
    await db_session.flush()
    booking = Booking(
        business_id=uuid.UUID(ctx["business_id"]),
        service_id=uuid.UUID(ctx["service_id"]),
        client_id=client.id,
        reference=f"BK{uuid.uuid4().hex[:8]}".upper()[:20],
        starts_at=starts_at,
        ends_at=starts_at + timedelta(minutes=30),
        status=BookingStatus.pending,
    )
    db_session.add(booking)
    await db_session.commit()
    login = await async_client.post(
        "/api/v1/auth/login",
        json={"email": user.email, "password": "securePass123"},
    )
    assert login.status_code == 200
    token = login.json()["tokens"]["access_token"]
    return str(booking.id), {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_admin_can_create_override_for_booking_service(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "override-create")
    created = await _create_override(async_client, ctx)

    assert created["capacity"] == 10
    assert created["note"] == "Group session"
    assert datetime.fromisoformat(created["starts_at"]) == SLOT_START

    list_resp = await async_client.get(
        f"/api/v1/businesses/{ctx['business_id']}/services/{ctx['service_id']}/slot-capacity-overrides",
        headers=ctx["headers"],
    )
    assert list_resp.status_code == 200
    assert len(list_resp.json()["data"]) == 1


@pytest.mark.asyncio
async def test_cannot_create_override_for_request_service(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await register_and_get_context(async_client, "override-order")
    order_resp = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/services",
        json=ORDER_SERVICE_PAYLOAD,
        headers=ctx["headers"],
    )
    assert order_resp.status_code == 201
    service_id = order_resp.json()["id"]

    response = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/services/{service_id}/slot-capacity-overrides",
        json=override_payload(SLOT_START),
        headers=ctx["headers"],
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "SERVICE_NOT_BOOKABLE"


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_duplicate_override_same_starts_at_rejected(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "override-dup")
    await _create_override(async_client, ctx)

    duplicate = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/services/{ctx['service_id']}/slot-capacity-overrides",
        json=override_payload(SLOT_START, capacity=12),
        headers=ctx["headers"],
    )
    assert duplicate.status_code == 409
    assert duplicate.json()["error"]["code"] == "SLOT_CAPACITY_OVERRIDE_EXISTS"


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_availability_uses_override_capacity_for_exact_slot(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "override-avail")
    await _create_override(async_client, ctx, capacity=10)

    response = await async_client.get(
        f"/api/v1/public/b/{ctx['slug']}/availability",
        params={"service_id": ctx["service_id"], "date": TARGET_DATE.isoformat()},
    )
    assert response.status_code == 200
    slot = next(
        item
        for item in response.json()["slots"]
        if datetime.fromisoformat(item["starts_at"]) == SLOT_START
    )
    assert slot["spots_remaining"] == 10


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_adjacent_slot_still_uses_default_service_capacity(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "override-adjacent")
    await _create_override(async_client, ctx, capacity=10)

    response = await async_client.get(
        f"/api/v1/public/b/{ctx['slug']}/availability",
        params={"service_id": ctx["service_id"], "date": TARGET_DATE.isoformat()},
    )
    assert response.status_code == 200
    slot_11 = next(
        (
            item
            for item in response.json()["slots"]
            if datetime.fromisoformat(item["starts_at"]) == SLOT_11_START
        ),
        None,
    )
    assert slot_11 is not None
    assert slot_11.get("spots_remaining") is None


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_booking_succeeds_until_override_capacity_reached(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "override-book")
    await _create_override(async_client, ctx, capacity=3)

    for index in range(3):
        response = await async_client.post(
            f"/api/v1/public/b/{ctx['slug']}/bookings",
            json=booking_payload(ctx["service_id"], email=f"guest{index}@example.com"),
        )
        assert response.status_code == 201, response.text


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_booking_beyond_override_capacity_fails(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "override-full")
    await _create_override(async_client, ctx, capacity=2)

    for index in range(2):
        response = await async_client.post(
            f"/api/v1/public/b/{ctx['slug']}/bookings",
            json=booking_payload(ctx["service_id"], email=f"guest{index}@example.com"),
        )
        assert response.status_code == 201

    fourth = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/bookings",
        json=booking_payload(ctx["service_id"], email="full@example.com"),
    )
    assert fourth.status_code == 409
    assert fourth.json()["error"]["message"] == SLOT_FULLY_BOOKED_MESSAGE


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_deleting_override_returns_slot_to_default_capacity(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "override-delete")
    created = await _create_override(async_client, ctx, capacity=10)
    override_id = created["id"]

    delete_resp = await async_client.delete(
        f"/api/v1/businesses/{ctx['business_id']}/services/{ctx['service_id']}/slot-capacity-overrides/{override_id}",
        headers=ctx["headers"],
    )
    assert delete_resp.status_code == 204

    await _insert_booking(
        db_session,
        ctx,
        starts_at=SLOT_START,
        ends_at=SLOT_END,
        status=BookingStatus.confirmed,
    )

    availability = await async_client.get(
        f"/api/v1/public/b/{ctx['slug']}/availability",
        params={"service_id": ctx["service_id"], "date": TARGET_DATE.isoformat()},
    )
    assert availability.status_code == 200
    assert not _slot_at_10am(availability.json()["slots"])

    second = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/bookings",
        json=booking_payload(ctx["service_id"], email="after-delete@example.com"),
    )
    assert second.status_code == 409
    assert second.json()["error"]["message"] == SLOT_FULLY_BOOKED_MESSAGE


@pytest.mark.asyncio
@patch("app.services.client_booking_service._now_utc", return_value=FIXED_NOW.astimezone(UTC))
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_reschedule_uses_override_capacity(
    _mock_now,
    _mock_now_utc,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "override-reschedule")
    await _create_override(async_client, ctx, starts_at=FUTURE_SLOT_START, capacity=2)

    for index in range(2):
        response = await async_client.post(
            f"/api/v1/public/b/{ctx['slug']}/bookings",
            json=booking_payload(
                ctx["service_id"],
                starts_at=FUTURE_SLOT_START,
                email=f"guest{index}@example.com",
            ),
        )
        assert response.status_code == 201

    booking_id, client_headers = await _client_headers_for_booking(
        async_client,
        db_session,
        ctx,
        starts_at=FUTURE_SLOT_11_START,
        suffix="override-reschedule-user",
    )

    reschedule_full = await async_client.post(
        f"/api/v1/me/bookings/{booking_id}/reschedule",
        json={"starts_at": FUTURE_SLOT_START.isoformat()},
        headers=client_headers,
    )
    assert reschedule_full.status_code == 409
    assert reschedule_full.json()["error"]["message"] == SLOT_FULLY_BOOKED_MESSAGE
