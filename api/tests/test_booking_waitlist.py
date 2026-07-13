from datetime import datetime
from unittest.mock import patch
from zoneinfo import ZoneInfo

import pytest
from httpx import AsyncClient

from app.utils.booking_rules import SLOT_TOO_SOON_MESSAGE
from tests.conftest import BOOKING_SERVICE_PAYLOAD, ORDER_SERVICE_PAYLOAD, register_and_get_context
from tests.test_booking_capacity import booking_payload
from tests.test_bookings_availability_blocking import (
    FIXED_NOW,
    SLOT_END,
    SLOT_START,
    TARGET_DATE,
    _insert_booking,
    _setup_booking_business,
)
from app.models.enums import BookingStatus

SLOT_11_START = datetime(2026, 6, 23, 11, 0, tzinfo=ZoneInfo("America/New_York"))
SLOT_12_START = datetime(2026, 6, 23, 12, 0, tzinfo=ZoneInfo("America/New_York"))


def waitlist_payload(service_id: str, starts_at: datetime | None = None, **customer) -> dict:
    return {
        "service_id": service_id,
        "starts_at": (starts_at or SLOT_START).isoformat(),
        "customer_name": "Waitlist Guest",
        "customer_email": "wait@example.com",
        "customer_phone": "+15550102",
        **customer,
    }


def _find_slot(slots: list[dict], target: datetime) -> dict | None:
    for slot in slots:
        if datetime.fromisoformat(slot["starts_at"]) == target:
            return slot
    return None


async def _enable_waitlist(
    async_client: AsyncClient,
    ctx: dict,
    *,
    enabled: bool = True,
) -> None:
    response = await async_client.patch(
        f"/api/v1/businesses/{ctx['business_id']}/services/{ctx['service_id']}",
        json={"waitlist_enabled": enabled},
        headers=ctx["headers"],
    )
    assert response.status_code == 200


async def _book_slot(
    async_client: AsyncClient,
    ctx: dict,
    *,
    starts_at: datetime = SLOT_START,
    email: str = "booked@example.com",
) -> None:
    response = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/bookings",
        json=booking_payload(ctx["service_id"], starts_at=starts_at, email=email),
    )
    assert response.status_code == 201, response.text


@pytest.mark.asyncio
async def test_existing_service_defaults_waitlist_disabled(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "waitlist-default")
    response = await async_client.get(
        f"/api/v1/businesses/{ctx['business_id']}/services/{ctx['service_id']}",
        headers=ctx["headers"],
    )
    assert response.status_code == 200
    assert response.json()["waitlist_enabled"] is False


@pytest.mark.asyncio
async def test_admin_can_enable_waitlist_on_create_and_update(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await register_and_get_context(async_client, "waitlist-admin")
    create_resp = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/services",
        json={**BOOKING_SERVICE_PAYLOAD, "name": "Waitlist svc", "waitlist_enabled": True},
        headers=ctx["headers"],
    )
    assert create_resp.status_code == 201
    service_id = create_resp.json()["id"]
    assert create_resp.json()["waitlist_enabled"] is True

    update_resp = await async_client.patch(
        f"/api/v1/businesses/{ctx['business_id']}/services/{service_id}",
        json={"waitlist_enabled": False},
        headers=ctx["headers"],
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["waitlist_enabled"] is False


@pytest.mark.asyncio
async def test_order_service_resets_waitlist_enabled(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await register_and_get_context(async_client, "waitlist-order")
    response = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/services",
        json=ORDER_SERVICE_PAYLOAD,
        headers=ctx["headers"],
    )
    assert response.status_code == 201
    assert response.json()["waitlist_enabled"] is False


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_availability_hides_full_slot_when_waitlist_disabled(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "waitlist-hide")
    await _book_slot(async_client, ctx)

    response = await async_client.get(
        f"/api/v1/public/b/{ctx['slug']}/availability",
        params={"service_id": ctx["service_id"], "date": TARGET_DATE.isoformat()},
    )
    assert response.status_code == 200
    assert _find_slot(response.json()["slots"], SLOT_START) is None


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_availability_includes_full_slot_with_waitlist_when_enabled(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "waitlist-show")
    await _enable_waitlist(async_client, ctx)
    await _book_slot(async_client, ctx)

    response = await async_client.get(
        f"/api/v1/public/b/{ctx['slug']}/availability",
        params={"service_id": ctx["service_id"], "date": TARGET_DATE.isoformat()},
    )
    assert response.status_code == 200
    slot = _find_slot(response.json()["slots"], SLOT_START)
    assert slot is not None
    assert slot["is_fully_booked"] is True
    assert slot["waitlist_available"] is True
    assert slot.get("spots_remaining") is None


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_public_join_waitlist_succeeds_when_slot_is_full(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "waitlist-join")
    await _enable_waitlist(async_client, ctx)
    await _book_slot(async_client, ctx)

    response = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/waitlist",
        json=waitlist_payload(ctx["service_id"]),
    )
    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "waiting"
    assert "waitlist" in body["message"].lower()


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_public_join_waitlist_fails_when_slot_still_available(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "waitlist-still-open")
    await _enable_waitlist(async_client, ctx)

    response = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/waitlist",
        json=waitlist_payload(ctx["service_id"]),
    )
    assert response.status_code == 409
    assert response.json()["error"]["message"] == "This time slot is still available to book."


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_public_join_waitlist_fails_when_waitlist_disabled(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "waitlist-disabled")
    await _book_slot(async_client, ctx)

    response = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/waitlist",
        json=waitlist_payload(ctx["service_id"]),
    )
    assert response.status_code == 400
    assert response.json()["error"]["message"] == "Waitlist is not enabled for this service."


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_public_join_waitlist_respects_cutoff_rules(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "waitlist-cutoff")
    await _enable_waitlist(async_client, ctx)
    await async_client.patch(
        f"/api/v1/businesses/{ctx['business_id']}/services/{ctx['service_id']}",
        json={"booking_min_notice_minutes": 240},
        headers=ctx["headers"],
    )
    await _insert_booking(
        db_session,
        ctx,
        starts_at=SLOT_START,
        ends_at=SLOT_END,
        status=BookingStatus.confirmed,
    )

    response = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/waitlist",
        json=waitlist_payload(ctx["service_id"], starts_at=SLOT_START),
    )
    assert response.status_code == 409
    assert response.json()["error"]["message"] == SLOT_TOO_SOON_MESSAGE


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_public_join_waitlist_respects_group_slot_capacity(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "waitlist-group")
    await _enable_waitlist(async_client, ctx)
    await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/services/{ctx['service_id']}/slot-capacity-overrides",
        json={
            "starts_at": SLOT_START.isoformat(),
            "capacity": 2,
            "note": "Group",
        },
        headers=ctx["headers"],
    )
    await _book_slot(async_client, ctx, email="a@example.com")
    still_open = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/waitlist",
        json=waitlist_payload(ctx["service_id"], email="wait1@example.com"),
    )
    assert still_open.status_code == 409
    assert still_open.json()["error"]["message"] == "This time slot is still available to book."

    await _book_slot(async_client, ctx, email="b@example.com")
    join = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/waitlist",
        json=waitlist_payload(ctx["service_id"], email="wait2@example.com"),
    )
    assert join.status_code == 201


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_admin_can_list_and_update_waitlist_entries(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "waitlist-admin-list")
    await _enable_waitlist(async_client, ctx)
    await _book_slot(async_client, ctx)
    join = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/waitlist",
        json=waitlist_payload(ctx["service_id"]),
    )
    assert join.status_code == 201
    entry_id = join.json()["id"]

    list_resp = await async_client.get(
        f"/api/v1/businesses/{ctx['business_id']}/waitlist",
        params={"service_id": ctx["service_id"]},
        headers=ctx["headers"],
    )
    assert list_resp.status_code == 200
    entries = list_resp.json()["data"]
    assert len(entries) == 1
    assert entries[0]["customer_name"] == "Waitlist Guest"
    assert entries[0]["service_name"] == "Haircut"

    update_resp = await async_client.patch(
        f"/api/v1/businesses/{ctx['business_id']}/waitlist/{entry_id}",
        json={"status": "contacted"},
        headers=ctx["headers"],
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["status"] == "contacted"


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_duplicate_active_waitlist_entry_is_prevented(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "waitlist-dup")
    await _enable_waitlist(async_client, ctx)
    await _book_slot(async_client, ctx)

    first = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/waitlist",
        json=waitlist_payload(ctx["service_id"]),
    )
    assert first.status_code == 201

    second = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/waitlist",
        json=waitlist_payload(ctx["service_id"]),
    )
    assert second.status_code == 409
    assert second.json()["error"]["code"] == "WAITLIST_DUPLICATE"
