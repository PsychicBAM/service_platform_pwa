from datetime import datetime
from unittest.mock import patch
from zoneinfo import ZoneInfo

import pytest
from httpx import AsyncClient

from app.models.enums import BookingStatus
from app.services.booking_capacity import SLOT_FULLY_BOOKED_MESSAGE
from tests.conftest import BOOKING_SERVICE_PAYLOAD, ORDER_SERVICE_PAYLOAD, register_and_get_context
from tests.test_bookings_availability_blocking import (
    FIXED_NOW,
    SLOT_END,
    SLOT_START,
    TARGET_DATE,
    _insert_booking,
    _setup_booking_business,
    _slot_at_10am,
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
async def test_booking_service_defaults_capacity_to_one(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await register_and_get_context(async_client, "cap-default")
    response = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/services",
        json=BOOKING_SERVICE_PAYLOAD,
        headers=ctx["headers"],
    )
    assert response.status_code == 201
    assert response.json()["capacity"] == 1


@pytest.mark.asyncio
async def test_booking_service_accepts_capacity_on_create_and_update(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await register_and_get_context(async_client, "cap-create-update")
    create_resp = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/services",
        json={**BOOKING_SERVICE_PAYLOAD, "name": "Group class", "capacity": 5},
        headers=ctx["headers"],
    )
    assert create_resp.status_code == 201
    service_id = create_resp.json()["id"]
    assert create_resp.json()["capacity"] == 5

    update_resp = await async_client.patch(
        f"/api/v1/businesses/{ctx['business_id']}/services/{service_id}",
        json={"capacity": 8},
        headers=ctx["headers"],
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["capacity"] == 8


@pytest.mark.asyncio
async def test_capacity_cannot_be_less_than_one(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await register_and_get_context(async_client, "cap-min")
    response = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/services",
        json={**BOOKING_SERVICE_PAYLOAD, "capacity": 0},
        headers=ctx["headers"],
    )
    assert response.status_code == 422


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_capacity_one_blocks_second_booking_same_slot(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "cap-one-block")
    first = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/bookings",
        json=booking_payload(ctx["service_id"]),
    )
    second = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/bookings",
        json=booking_payload(ctx["service_id"], email="other@example.com"),
    )
    assert first.status_code == 201
    assert second.status_code == 409
    assert second.json()["error"]["message"] == SLOT_FULLY_BOOKED_MESSAGE


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_capacity_allows_multiple_bookings_until_full(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "cap-multi")
    service_resp = await async_client.patch(
        f"/api/v1/businesses/{ctx['business_id']}/services/{ctx['service_id']}",
        json={"capacity": 3},
        headers=ctx["headers"],
    )
    assert service_resp.status_code == 200

    for index in range(3):
        response = await async_client.post(
            f"/api/v1/public/b/{ctx['slug']}/bookings",
            json=booking_payload(ctx["service_id"], email=f"guest{index}@example.com"),
        )
        assert response.status_code == 201, response.text

    fourth = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/bookings",
        json=booking_payload(ctx["service_id"], email="full@example.com"),
    )
    assert fourth.status_code == 409
    assert fourth.json()["error"]["message"] == SLOT_FULLY_BOOKED_MESSAGE


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_availability_shows_spots_remaining_when_capacity_gt_one(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "cap-spots")
    await async_client.patch(
        f"/api/v1/businesses/{ctx['business_id']}/services/{ctx['service_id']}",
        json={"capacity": 3},
        headers=ctx["headers"],
    )
    await _insert_booking(
        db_session,
        ctx,
        starts_at=SLOT_START,
        ends_at=SLOT_END,
        status=BookingStatus.confirmed,
    )

    response = await async_client.get(
        f"/api/v1/public/b/{ctx['slug']}/availability",
        params={"service_id": ctx["service_id"], "date": TARGET_DATE.isoformat()},
    )
    assert response.status_code == 200
    slots = response.json()["slots"]
    assert _slot_at_10am(slots)
    slot = next(
        slot
        for slot in slots
        if datetime.fromisoformat(slot["starts_at"]) == SLOT_START
    )
    assert slot["spots_remaining"] == 2


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_availability_hides_slot_when_capacity_reached(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "cap-hide")
    await async_client.patch(
        f"/api/v1/businesses/{ctx['business_id']}/services/{ctx['service_id']}",
        json={"capacity": 2},
        headers=ctx["headers"],
    )
    for index in range(2):
        await _insert_booking(
            db_session,
            ctx,
            starts_at=SLOT_START,
            ends_at=SLOT_END,
            status=BookingStatus.pending if index == 0 else BookingStatus.confirmed,
        )

    response = await async_client.get(
        f"/api/v1/public/b/{ctx['slug']}/availability",
        params={"service_id": ctx["service_id"], "date": TARGET_DATE.isoformat()},
    )
    assert response.status_code == 200
    assert not _slot_at_10am(response.json()["slots"])


@pytest.mark.asyncio
async def test_order_service_create_unchanged_without_capacity_ui_field(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await register_and_get_context(async_client, "cap-order")
    response = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/services",
        json=ORDER_SERVICE_PAYLOAD,
        headers=ctx["headers"],
    )
    assert response.status_code == 201
    assert response.json()["type"] == "order"
    assert response.json()["capacity"] == 1
