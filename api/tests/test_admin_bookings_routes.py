from datetime import datetime
from unittest.mock import patch
from zoneinfo import ZoneInfo

import pytest
from httpx import AsyncClient

from app.main import app
from tests.conftest import assert_response_status
from tests.test_bookings_availability_blocking import (
    FIXED_NOW,
    SLOT_START,
    TARGET_DATE,
    _setup_booking_business,
)
from tests.test_public_booking_create import booking_payload


async def _create_booking(async_client: AsyncClient, ctx: dict) -> dict:
    response = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/bookings",
        json=booking_payload(ctx["service_id"]),
    )
    assert_response_status(response, 201, context="public booking create")
    return response.json()


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_admin_can_list_bookings_for_own_business(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "admin-list")
    booking = await _create_booking(async_client, ctx)
    response = await async_client.get(
        f"/api/v1/businesses/{ctx['business_id']}/bookings",
        headers=ctx["headers"],
    )
    assert response.status_code == 200
    body = response.json()
    assert body["meta"]["total"] >= 1
    assert any(item["id"] == booking["id"] for item in body["data"])


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_admin_list_excludes_other_business_bookings(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx_a = await _setup_booking_business(async_client, db_session, "admin-list-a")
    ctx_b = await _setup_booking_business(async_client, db_session, "admin-list-b")
    booking_b = await _create_booking(async_client, ctx_b)
    response = await async_client.get(
        f"/api/v1/businesses/{ctx_a['business_id']}/bookings",
        headers=ctx_a["headers"],
    )
    ids = {item["id"] for item in response.json()["data"]}
    assert booking_b["id"] not in ids


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_admin_can_get_booking_detail(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "admin-detail")
    booking = await _create_booking(async_client, ctx)
    response = await async_client.get(
        f"/api/v1/businesses/{ctx['business_id']}/bookings/{booking['id']}",
        headers=ctx["headers"],
    )
    assert response.status_code == 200
    body = response.json()
    assert body["reference"] == booking["reference"]
    assert body["service"]["name"] == "Haircut"
    assert body["client"]["full_name"] == "Jane Doe"


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_non_member_cannot_list_bookings(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    owner = await _setup_booking_business(async_client, db_session, "admin-nonmember")
    outsider = await _setup_booking_business(async_client, db_session, "admin-outsider")
    response = await async_client.get(
        f"/api/v1/businesses/{owner['business_id']}/bookings",
        headers=outsider["headers"],
    )
    assert response.status_code == 403


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_admin_from_business_a_cannot_get_business_b_booking(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx_a = await _setup_booking_business(async_client, db_session, "admin-iso-a")
    ctx_b = await _setup_booking_business(async_client, db_session, "admin-iso-b")
    booking_b = await _create_booking(async_client, ctx_b)
    response = await async_client.get(
        f"/api/v1/businesses/{ctx_b['business_id']}/bookings/{booking_b['id']}",
        headers=ctx_a["headers"],
    )
    assert response.status_code == 403


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_admin_can_confirm_pending_booking(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "admin-confirm")
    booking = await _create_booking(async_client, ctx)
    response = await async_client.patch(
        f"/api/v1/businesses/{ctx['business_id']}/bookings/{booking['id']}",
        json={"status": "confirmed"},
        headers=ctx["headers"],
    )
    assert response.status_code == 200
    assert response.json()["status"] == "confirmed"


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_confirming_cancelled_booking_rejected(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "admin-bad-confirm")
    booking = await _create_booking(async_client, ctx)
    await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/bookings/{booking['id']}/cancel",
        json={"reason": "Cancelled first"},
        headers=ctx["headers"],
    )
    response = await async_client.patch(
        f"/api/v1/businesses/{ctx['business_id']}/bookings/{booking['id']}",
        json={"status": "confirmed"},
        headers=ctx["headers"],
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INVALID_BOOKING_STATUS_TRANSITION"


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_admin_can_cancel_pending_booking(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "admin-cancel-pending")
    booking = await _create_booking(async_client, ctx)
    response = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/bookings/{booking['id']}/cancel",
        json={"reason": "Client requested"},
        headers=ctx["headers"],
    )
    assert_response_status(response, 200, context="admin cancel pending booking")
    assert response.json()["status"] == "cancelled"


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_admin_can_cancel_confirmed_booking(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "admin-cancel-confirmed")
    booking = await _create_booking(async_client, ctx)
    await async_client.patch(
        f"/api/v1/businesses/{ctx['business_id']}/bookings/{booking['id']}",
        json={"status": "confirmed"},
        headers=ctx["headers"],
    )
    response = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/bookings/{booking['id']}/cancel",
        json={"reason": "Schedule change"},
        headers=ctx["headers"],
    )
    assert response.status_code == 200
    assert response.json()["status"] == "cancelled"


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_cancel_sets_cancelled_fields(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "admin-cancel-fields")
    booking = await _create_booking(async_client, ctx)
    response = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/bookings/{booking['id']}/cancel",
        json={"reason": "No show risk"},
        headers=ctx["headers"],
    )
    body = response.json()
    assert body["cancelled_at"] is not None
    assert body["cancelled_by"] == "admin"
    assert body["cancellation_reason"] == "No show risk"


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_cancelled_booking_no_longer_blocks_availability(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "admin-avail-cancel")
    booking = await _create_booking(async_client, ctx)
    await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/bookings/{booking['id']}/cancel",
        json={},
        headers=ctx["headers"],
    )
    avail = await async_client.get(
        f"/api/v1/public/b/{ctx['slug']}/availability",
        params={"service_id": ctx["service_id"], "date": TARGET_DATE.isoformat()},
    )
    assert any(
        datetime.fromisoformat(s["starts_at"]) == SLOT_START
        for s in avail.json()["slots"]
    )


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_completed_booking_no_longer_blocks_availability(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "admin-avail-complete")
    booking = await _create_booking(async_client, ctx)
    await async_client.patch(
        f"/api/v1/businesses/{ctx['business_id']}/bookings/{booking['id']}",
        json={"status": "confirmed"},
        headers=ctx["headers"],
    )
    await async_client.patch(
        f"/api/v1/businesses/{ctx['business_id']}/bookings/{booking['id']}",
        json={"status": "completed"},
        headers=ctx["headers"],
    )
    avail = await async_client.get(
        f"/api/v1/public/b/{ctx['slug']}/availability",
        params={"service_id": ctx["service_id"], "date": TARGET_DATE.isoformat()},
    )
    assert any(
        datetime.fromisoformat(s["starts_at"]) == SLOT_START
        for s in avail.json()["slots"]
    )


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_no_show_booking_no_longer_blocks_availability(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "admin-avail-noshow")
    booking = await _create_booking(async_client, ctx)
    await async_client.patch(
        f"/api/v1/businesses/{ctx['business_id']}/bookings/{booking['id']}",
        json={"status": "confirmed"},
        headers=ctx["headers"],
    )
    await async_client.patch(
        f"/api/v1/businesses/{ctx['business_id']}/bookings/{booking['id']}",
        json={"status": "no_show"},
        headers=ctx["headers"],
    )
    avail = await async_client.get(
        f"/api/v1/public/b/{ctx['slug']}/availability",
        params={"service_id": ctx["service_id"], "date": TARGET_DATE.isoformat()},
    )
    assert any(
        datetime.fromisoformat(s["starts_at"]) == SLOT_START
        for s in avail.json()["slots"]
    )


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_invalid_status_transition_returns_400(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "admin-bad-transition")
    booking = await _create_booking(async_client, ctx)
    await async_client.patch(
        f"/api/v1/businesses/{ctx['business_id']}/bookings/{booking['id']}",
        json={"status": "confirmed"},
        headers=ctx["headers"],
    )
    await async_client.patch(
        f"/api/v1/businesses/{ctx['business_id']}/bookings/{booking['id']}",
        json={"status": "completed"},
        headers=ctx["headers"],
    )
    response = await async_client.patch(
        f"/api/v1/businesses/{ctx['business_id']}/bookings/{booking['id']}",
        json={"status": "confirmed"},
        headers=ctx["headers"],
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INVALID_BOOKING_STATUS_TRANSITION"


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_search_by_client_name_email_phone_reference(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "admin-search")
    booking = await _create_booking(
        async_client,
        ctx,
    )
    for term in ("Jane", "jane.doe@example.com", "+15550101", booking["reference"][:8]):
        response = await async_client.get(
            f"/api/v1/businesses/{ctx['business_id']}/bookings",
            params={"search": term},
            headers=ctx["headers"],
        )
        assert response.status_code == 200
        assert any(item["id"] == booking["id"] for item in response.json()["data"])


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_pagination_returns_meta(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "admin-page")
    await _create_booking(async_client, ctx)
    await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/bookings",
        json=booking_payload(
            ctx["service_id"],
            starts_at=datetime(2026, 6, 23, 11, 0, tzinfo=ZoneInfo("America/New_York")),
            email="second@example.com",
        ),
    )
    response = await async_client.get(
        f"/api/v1/businesses/{ctx['business_id']}/bookings",
        params={"page": 1, "limit": 1},
        headers=ctx["headers"],
    )
    body = response.json()
    assert body["meta"]["page"] == 1
    assert body["meta"]["limit"] == 1
    assert body["meta"]["total"] >= 2
    assert len(body["data"]) == 1


def test_openapi_includes_admin_bookings_endpoints() -> None:
    paths = app.openapi()["paths"]
    assert "/api/v1/businesses/{business_id}/bookings" in paths
    assert "get" in paths["/api/v1/businesses/{business_id}/bookings"]
    detail = "/api/v1/businesses/{business_id}/bookings/{booking_id}"
    assert detail in paths
    assert "get" in paths[detail]
    assert "patch" in paths[detail]
    cancel = "/api/v1/businesses/{business_id}/bookings/{booking_id}/cancel"
    assert cancel in paths
    assert "post" in paths[cancel]
