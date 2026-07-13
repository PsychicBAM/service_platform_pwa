from datetime import datetime, timedelta
from unittest.mock import patch
from zoneinfo import ZoneInfo

import pytest
from httpx import AsyncClient

from app.services.booking_capacity import SLOT_FULLY_BOOKED_MESSAGE
from app.utils.booking_rules import (
    SLOT_OUTSIDE_WINDOW_MESSAGE,
    SLOT_TOO_SOON_MESSAGE,
)
from tests.conftest import BOOKING_SERVICE_PAYLOAD, ORDER_SERVICE_PAYLOAD, register_and_get_context
from tests.test_booking_capacity import booking_payload
from tests.test_bookings_availability_blocking import (
    FIXED_NOW,
    SLOT_END,
    SLOT_START,
    TARGET_DATE,
    _setup_booking_business,
)

SLOT_11_START = datetime(2026, 6, 23, 11, 0, tzinfo=ZoneInfo("America/New_York"))


def _slot_at_time(slots: list[dict], target: datetime) -> bool:
    for slot in slots:
        if datetime.fromisoformat(slot["starts_at"]) == target:
            return True
    return False


@pytest.mark.asyncio
async def test_existing_service_defaults_booking_rules(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "cutoff-defaults")
    response = await async_client.get(
        f"/api/v1/businesses/{ctx['business_id']}/services/{ctx['service_id']}",
        headers=ctx["headers"],
    )
    assert response.status_code == 200
    body = response.json()
    assert body["booking_min_notice_minutes"] == 0
    assert body["booking_window_days"] is None


@pytest.mark.asyncio
async def test_admin_can_set_booking_rules_on_create_and_update(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await register_and_get_context(async_client, "cutoff-admin")
    create_resp = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/services",
        json={
            **BOOKING_SERVICE_PAYLOAD,
            "name": "Rules service",
            "booking_min_notice_minutes": 120,
            "booking_window_days": 30,
        },
        headers=ctx["headers"],
    )
    assert create_resp.status_code == 201
    service_id = create_resp.json()["id"]
    assert create_resp.json()["booking_min_notice_minutes"] == 120
    assert create_resp.json()["booking_window_days"] == 30

    update_resp = await async_client.patch(
        f"/api/v1/businesses/{ctx['business_id']}/services/{service_id}",
        json={"booking_min_notice_minutes": 60, "booking_window_days": 14},
        headers=ctx["headers"],
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["booking_min_notice_minutes"] == 60
    assert update_resp.json()["booking_window_days"] == 14


@pytest.mark.asyncio
async def test_order_service_create_unchanged_without_booking_rules(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await register_and_get_context(async_client, "cutoff-order")
    response = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/services",
        json=ORDER_SERVICE_PAYLOAD,
        headers=ctx["headers"],
    )
    assert response.status_code == 201
    assert response.json()["type"] == "order"
    assert response.json()["booking_min_notice_minutes"] == 0
    assert response.json()["booking_window_days"] is None


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_service_min_notice_hides_too_soon_slots(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "cutoff-notice-hide")
    await async_client.patch(
        f"/api/v1/businesses/{ctx['business_id']}/services/{ctx['service_id']}",
        json={"booking_min_notice_minutes": 150},
        headers=ctx["headers"],
    )

    response = await async_client.get(
        f"/api/v1/public/b/{ctx['slug']}/availability",
        params={"service_id": ctx["service_id"], "date": TARGET_DATE.isoformat()},
    )
    assert response.status_code == 200
    slots = response.json()["slots"]
    assert not _slot_at_time(slots, SLOT_START)
    assert _slot_at_time(slots, SLOT_11_START)


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_service_min_notice_allows_slots_after_notice(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "cutoff-notice-allow")
    await async_client.patch(
        f"/api/v1/businesses/{ctx['business_id']}/services/{ctx['service_id']}",
        json={"booking_min_notice_minutes": 60},
        headers=ctx["headers"],
    )

    response = await async_client.get(
        f"/api/v1/public/b/{ctx['slug']}/availability",
        params={"service_id": ctx["service_id"], "date": TARGET_DATE.isoformat()},
    )
    assert response.status_code == 200
    assert _slot_at_time(response.json()["slots"], SLOT_11_START)


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_service_booking_window_hides_dates_beyond_limit(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "cutoff-window")
    await async_client.patch(
        f"/api/v1/businesses/{ctx['business_id']}/services/{ctx['service_id']}",
        json={"booking_window_days": 5},
        headers=ctx["headers"],
    )
    beyond = TARGET_DATE + timedelta(days=6)
    response = await async_client.get(
        f"/api/v1/public/b/{ctx['slug']}/availability",
        params={"service_id": ctx["service_id"], "date": beyond.isoformat()},
    )
    assert response.status_code == 200
    assert response.json()["slots"] == []


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_public_booking_rejects_too_soon_slot(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "cutoff-book-soon")
    await async_client.patch(
        f"/api/v1/businesses/{ctx['business_id']}/services/{ctx['service_id']}",
        json={"booking_min_notice_minutes": 240},
        headers=ctx["headers"],
    )

    response = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/bookings",
        json=booking_payload(ctx["service_id"], starts_at=SLOT_START),
    )
    assert response.status_code == 409
    assert response.json()["error"]["message"] == SLOT_TOO_SOON_MESSAGE


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_public_booking_rejects_slot_beyond_window(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "cutoff-book-window")
    await async_client.patch(
        f"/api/v1/businesses/{ctx['business_id']}/services/{ctx['service_id']}",
        json={"booking_min_notice_minutes": 0, "booking_window_days": 1},
        headers=ctx["headers"],
    )
    far_slot = datetime(2026, 6, 25, 10, 0, tzinfo=ZoneInfo("America/New_York"))

    response = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/bookings",
        json=booking_payload(ctx["service_id"], starts_at=far_slot),
    )
    assert response.status_code == 409
    assert response.json()["error"]["message"] == SLOT_OUTSIDE_WINDOW_MESSAGE


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_capacity_and_overrides_still_work_within_allowed_window(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "cutoff-cap-override")
    await async_client.patch(
        f"/api/v1/businesses/{ctx['business_id']}/services/{ctx['service_id']}",
        json={"booking_min_notice_minutes": 0, "booking_window_days": 30},
        headers=ctx["headers"],
    )
    await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/services/{ctx['service_id']}/slot-capacity-overrides",
        json={
            "starts_at": SLOT_START.isoformat(),
            "capacity": 2,
            "note": "Group",
        },
        headers=ctx["headers"],
    )

    first = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/bookings",
        json=booking_payload(ctx["service_id"], email="a@example.com"),
    )
    assert first.status_code == 201

    second = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/bookings",
        json=booking_payload(ctx["service_id"], email="b@example.com"),
    )
    assert second.status_code == 201

    third = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/bookings",
        json=booking_payload(ctx["service_id"], email="c@example.com"),
    )
    assert third.status_code == 409
    assert third.json()["error"]["message"] == SLOT_FULLY_BOOKED_MESSAGE

    availability = await async_client.get(
        f"/api/v1/public/b/{ctx['slug']}/availability",
        params={"service_id": ctx["service_id"], "date": TARGET_DATE.isoformat()},
    )
    assert availability.status_code == 200
    assert not _slot_at_time(availability.json()["slots"], SLOT_START)
    assert _slot_at_time(availability.json()["slots"], SLOT_11_START)
