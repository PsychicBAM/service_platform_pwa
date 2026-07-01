import uuid
from datetime import date, datetime
from unittest.mock import patch
from zoneinfo import ZoneInfo

import pytest
from httpx import AsyncClient

from app.models.booking import Booking
from app.models.client import Client
from app.models.enums import BookingStatus, ClientSource
from app.repositories.booking_repository import BookingRepository
from tests.conftest import (
    BOOKING_SERVICE_PAYLOAD,
    ORDER_SERVICE_PAYLOAD,
    activate_business,
    assert_has_bearer_auth,
    assert_response_status,
    register_and_get_context,
    refresh_owner_auth,
    weekday_working_hours_payload,
)

FIXED_NOW = datetime(2026, 6, 23, 8, 0, tzinfo=ZoneInfo("America/New_York"))
TARGET_DATE = date(2026, 6, 23)
SLOT_START = datetime(2026, 6, 23, 10, 0, tzinfo=ZoneInfo("America/New_York"))
SLOT_END = datetime(2026, 6, 23, 10, 30, tzinfo=ZoneInfo("America/New_York"))


async def _setup_booking_business(async_client: AsyncClient, db_session, suffix: str):
    safe_suffix = suffix.replace("_", "-")
    ctx = await register_and_get_context(async_client, safe_suffix)
    assert_has_bearer_auth(ctx["headers"])
    await activate_business(db_session, ctx["slug"])
    ctx = await refresh_owner_auth(async_client, ctx)
    schedule_resp = await async_client.put(
        f"/api/v1/businesses/{ctx['business_id']}/schedule/working-hours",
        json=weekday_working_hours_payload(),
        headers=ctx["headers"],
    )
    assert_response_status(
        schedule_resp,
        200,
        context="booking business working-hours setup",
    )
    service_resp = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/services",
        json=BOOKING_SERVICE_PAYLOAD,
        headers=ctx["headers"],
    )
    assert_response_status(service_resp, 201, context="booking service create")
    ctx["service_id"] = service_resp.json()["id"]
    return ctx


async def _insert_booking(
    db_session,
    ctx: dict,
    *,
    starts_at: datetime,
    ends_at: datetime,
    status: BookingStatus,
) -> Booking:
    client = Client(
        business_id=uuid.UUID(ctx["business_id"]),
        full_name="Jane Doe",
        email=f"jane-{uuid.uuid4().hex[:6]}@example.com",
        source=ClientSource.guest,
    )
    db_session.add(client)
    await db_session.flush()
    booking = Booking(
        business_id=uuid.UUID(ctx["business_id"]),
        service_id=uuid.UUID(ctx["service_id"]),
        client_id=client.id,
        reference=f"BK{uuid.uuid4().hex[:8]}".upper()[:20],
        starts_at=starts_at,
        ends_at=ends_at,
        status=status,
    )
    db_session.add(booking)
    await db_session.commit()
    return booking


def _slot_at_10am(slots: list[dict]) -> bool:
    for slot in slots:
        start = datetime.fromisoformat(slot["starts_at"])
        if start == SLOT_START:
            return True
    return False


@pytest.mark.asyncio
async def test_list_overlapping_bookings_returns_pending_bookings(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "repo-overlap")
    await _insert_booking(
        db_session,
        ctx,
        starts_at=SLOT_START,
        ends_at=SLOT_END,
        status=BookingStatus.pending,
    )
    repo = BookingRepository(db_session)
    day_start = datetime(2026, 6, 23, 0, 0, tzinfo=ZoneInfo("America/New_York"))
    day_end = datetime(2026, 6, 24, 0, 0, tzinfo=ZoneInfo("America/New_York"))
    overlapping = await repo.list_overlapping_bookings(
        uuid.UUID(ctx["business_id"]),
        day_start,
        day_end,
    )
    assert len(overlapping) == 1
    assert overlapping[0].status == BookingStatus.pending


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
@pytest.mark.parametrize(
    "status",
    [
        BookingStatus.pending,
        BookingStatus.pending_payment,
        BookingStatus.confirmed,
    ],
)
async def test_blocking_statuses_remove_overlapping_slot(
    _mock_now,
    async_client: AsyncClient,
    db_session,
    status: BookingStatus,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, f"block-{status.value}")
    await _insert_booking(
        db_session,
        ctx,
        starts_at=SLOT_START,
        ends_at=SLOT_END,
        status=status,
    )
    response = await async_client.get(
        f"/api/v1/public/b/{ctx['slug']}/availability",
        params={"service_id": ctx["service_id"], "date": TARGET_DATE.isoformat()},
    )
    assert response.status_code == 200
    assert not _slot_at_10am(response.json()["slots"])


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
@pytest.mark.parametrize(
    "status",
    [
        BookingStatus.cancelled,
        BookingStatus.completed,
        BookingStatus.no_show,
    ],
)
async def test_non_blocking_statuses_do_not_remove_slot(
    _mock_now,
    async_client: AsyncClient,
    db_session,
    status: BookingStatus,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, f"noblock-{status.value}")
    await _insert_booking(
        db_session,
        ctx,
        starts_at=SLOT_START,
        ends_at=SLOT_END,
        status=status,
    )
    response = await async_client.get(
        f"/api/v1/public/b/{ctx['slug']}/availability",
        params={"service_id": ctx["service_id"], "date": TARGET_DATE.isoformat()},
    )
    assert response.status_code == 200
    assert _slot_at_10am(response.json()["slots"])


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_availability_still_respects_breaks_with_booking_blocking(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "block-break")
    await _insert_booking(
        db_session,
        ctx,
        starts_at=SLOT_START,
        ends_at=SLOT_END,
        status=BookingStatus.confirmed,
    )
    await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/schedule/breaks",
        json={"label": "Lunch", "day_of_week": 2, "starts_at": "12:00", "ends_at": "13:00"},
        headers=ctx["headers"],
    )
    response = await async_client.get(
        f"/api/v1/public/b/{ctx['slug']}/availability",
        params={"service_id": ctx["service_id"], "date": TARGET_DATE.isoformat()},
    )
    slots = response.json()["slots"]
    assert not _slot_at_10am(slots)
    for slot in slots:
        start = datetime.fromisoformat(slot["starts_at"])
        end = datetime.fromisoformat(slot["ends_at"])
        lunch_start = datetime(2026, 6, 23, 12, 0, tzinfo=ZoneInfo("America/New_York"))
        lunch_end = datetime(2026, 6, 23, 13, 0, tzinfo=ZoneInfo("America/New_York"))
        assert not (start < lunch_end and end > lunch_start)


@pytest.mark.asyncio
async def test_order_service_still_returns_service_not_bookable(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await register_and_get_context(async_client, "block-order-svc")
    await activate_business(db_session, ctx["slug"])
    service_resp = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/services",
        json=ORDER_SERVICE_PAYLOAD,
        headers=ctx["headers"],
    )
    service_id = service_resp.json()["id"]
    response = await async_client.get(
        f"/api/v1/public/b/{ctx['slug']}/availability",
        params={"service_id": service_id, "date": TARGET_DATE.isoformat()},
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "SERVICE_NOT_BOOKABLE"
