from datetime import date, datetime
from unittest.mock import patch
from zoneinfo import ZoneInfo

import pytest
from httpx import AsyncClient
from sqlalchemy import update

from app.models.business import Business
from app.models.enums import OperatingMode
from tests.conftest import (
    BOOKING_SERVICE_PAYLOAD,
    ORDER_SERVICE_PAYLOAD,
    activate_business,
    register_and_get_context,
    weekday_working_hours_payload,
)

FIXED_NOW = datetime(2026, 6, 23, 8, 0, tzinfo=ZoneInfo("America/New_York"))
TARGET_DATE = date(2026, 6, 23)


async def _setup_booking_business(async_client: AsyncClient, db_session, suffix: str):
    ctx = await register_and_get_context(async_client, suffix)
    await activate_business(db_session, ctx["slug"])
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
    assert service_resp.status_code == 201
    ctx["service_id"] = service_resp.json()["id"]
    return ctx


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_availability_for_closed_day_returns_empty_slots(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "avail-closed")
    closed_sunday = date(2026, 6, 28)
    response = await async_client.get(
        f"/api/v1/public/b/{ctx['slug']}/availability",
        params={"service_id": ctx["service_id"], "date": closed_sunday.isoformat()},
    )
    assert response.status_code == 200
    assert response.json()["slots"] == []


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_availability_for_open_day_returns_slots(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "avail-open")
    response = await async_client.get(
        f"/api/v1/public/b/{ctx['slug']}/availability",
        params={"service_id": ctx["service_id"], "date": TARGET_DATE.isoformat()},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["timezone"] == "America/New_York"
    assert len(body["slots"]) > 0


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_break_removes_overlapping_slots(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "avail-break")
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
    for slot in slots:
        start = datetime.fromisoformat(slot["starts_at"])
        end = datetime.fromisoformat(slot["ends_at"])
        lunch_start = datetime(2026, 6, 23, 12, 0, tzinfo=ZoneInfo("America/New_York"))
        lunch_end = datetime(2026, 6, 23, 13, 0, tzinfo=ZoneInfo("America/New_York"))
        assert not (start < lunch_end and end > lunch_start)


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_unavailable_time_removes_overlapping_slots(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "avail-block")
    await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/schedule/unavailable-times",
        json={
            "starts_at": "2026-06-23T10:00:00-04:00",
            "ends_at": "2026-06-23T11:00:00-04:00",
        },
        headers=ctx["headers"],
    )
    response = await async_client.get(
        f"/api/v1/public/b/{ctx['slug']}/availability",
        params={"service_id": ctx["service_id"], "date": TARGET_DATE.isoformat()},
    )
    slots = response.json()["slots"]
    for slot in slots:
        start = datetime.fromisoformat(slot["starts_at"])
        end = datetime.fromisoformat(slot["ends_at"])
        block_start = datetime(2026, 6, 23, 10, 0, tzinfo=ZoneInfo("America/New_York"))
        block_end = datetime(2026, 6, 23, 11, 0, tzinfo=ZoneInfo("America/New_York"))
        assert not (start < block_end and end > block_start)


@pytest.mark.asyncio
async def test_order_service_availability_returns_safe_error(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await register_and_get_context(async_client, "avail-order-svc")
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


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_orders_only_business_hides_booking_availability(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "avail-orders-only")
    await db_session.execute(
        update(Business)
        .where(Business.slug == ctx["slug"])
        .values(operating_mode=OperatingMode.orders_only)
    )
    await db_session.commit()
    response = await async_client.get(
        f"/api/v1/public/b/{ctx['slug']}/availability",
        params={"service_id": ctx["service_id"], "date": TARGET_DATE.isoformat()},
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "SERVICE_NOT_BOOKABLE"


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_booking_only_business_allows_booking_availability(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "avail-booking-only")
    await db_session.execute(
        update(Business)
        .where(Business.slug == ctx["slug"])
        .values(operating_mode=OperatingMode.booking_only)
    )
    await db_session.commit()
    response = await async_client.get(
        f"/api/v1/public/b/{ctx['slug']}/availability",
        params={"service_id": ctx["service_id"], "date": TARGET_DATE.isoformat()},
    )
    assert response.status_code == 200
    assert len(response.json()["slots"]) > 0


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_min_advance_booking_hours_excludes_too_soon_slots(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    from app.repositories.business_repository import DEFAULT_BUSINESS_SETTINGS

    ctx = await _setup_booking_business(async_client, db_session, "avail-min-adv")
    settings = dict(DEFAULT_BUSINESS_SETTINGS)
    settings["min_advance_booking_hours"] = 4
    await db_session.execute(
        update(Business)
        .where(Business.slug == ctx["slug"])
        .values(settings=settings)
    )
    await db_session.commit()

    response = await async_client.get(
        f"/api/v1/public/b/{ctx['slug']}/availability",
        params={"service_id": ctx["service_id"], "date": TARGET_DATE.isoformat()},
    )
    slots = response.json()["slots"]
    earliest_allowed = datetime(2026, 6, 23, 12, 0, tzinfo=ZoneInfo("America/New_York"))
    for slot in slots:
        start = datetime.fromisoformat(slot["starts_at"])
        assert start >= earliest_allowed


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_max_advance_booking_days_excludes_dates_too_far(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "avail-max-adv")
    far_date = date(2026, 9, 1)
    response = await async_client.get(
        f"/api/v1/public/b/{ctx['slug']}/availability",
        params={"service_id": ctx["service_id"], "date": far_date.isoformat()},
    )
    assert response.status_code == 200
    assert response.json()["slots"] == []
