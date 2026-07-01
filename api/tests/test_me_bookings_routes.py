import uuid
from datetime import UTC, datetime, timedelta
from unittest.mock import patch
from zoneinfo import ZoneInfo

import pytest
from httpx import AsyncClient

from app.main import app
from app.models.booking import Booking
from app.models.client import Client
from app.models.enums import BookingStatus, ClientSource, UserRole
from app.models.user import User
from app.services.password_service import hash_password
from tests.test_bookings_availability_blocking import (
    FIXED_NOW,
    SLOT_START,
    TARGET_DATE,
    _setup_booking_business,
)

FIXED_NOW_UTC = FIXED_NOW.astimezone(UTC)
FUTURE_SLOT = datetime(2026, 6, 25, 10, 0, tzinfo=ZoneInfo("America/New_York"))
FUTURE_SLOT_END = FUTURE_SLOT + timedelta(minutes=30)
RESCHEDULE_SLOT = datetime(2026, 6, 25, 11, 0, tzinfo=ZoneInfo("America/New_York"))
PAST_SLOT = datetime(2026, 6, 20, 10, 0, tzinfo=ZoneInfo("America/New_York"))


@pytest.fixture(autouse=True)
def fixed_booking_time():
    with (
        patch(
            "app.repositories.booking_repository._now_utc",
            return_value=FIXED_NOW_UTC,
        ),
        patch(
            "app.services.client_booking_service._now_utc",
            return_value=FIXED_NOW_UTC,
        ),
        patch(
            "app.services.availability_service._now_in_tz",
            return_value=FIXED_NOW,
        ),
    ):
        yield


async def _create_client_user(db_session, suffix: str) -> User:
    user = User(
        email=f"client-{suffix}@example.com",
        password_hash=hash_password("securePass123"),
        full_name="Client User",
        role=UserRole.client,
    )
    db_session.add(user)
    await db_session.flush()
    return user


async def _login_client(async_client: AsyncClient, email: str) -> dict:
    response = await async_client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "securePass123"},
    )
    assert response.status_code == 200
    token = response.json()["tokens"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


async def _setup_user_linked_booking(
    async_client: AsyncClient,
    db_session,
    suffix: str,
    *,
    starts_at: datetime = FUTURE_SLOT,
    status: BookingStatus = BookingStatus.pending,
) -> dict:
    biz_ctx = await _setup_booking_business(async_client, db_session, suffix)
    user = await _create_client_user(db_session, suffix)
    client = Client(
        business_id=uuid.UUID(biz_ctx["business_id"]),
        user_id=user.id,
        full_name="Client User",
        email=user.email,
        source=ClientSource.registered,
    )
    db_session.add(client)
    await db_session.flush()
    booking = Booking(
        business_id=uuid.UUID(biz_ctx["business_id"]),
        service_id=uuid.UUID(biz_ctx["service_id"]),
        client_id=client.id,
        reference=f"BK{uuid.uuid4().hex[:8]}".upper()[:20],
        starts_at=starts_at,
        ends_at=starts_at + timedelta(minutes=30),
        status=status,
    )
    db_session.add(booking)
    await db_session.commit()
    booking_id = str(booking.id)
    headers = await _login_client(async_client, user.email)
    return {
        **biz_ctx,
        "user_id": str(user.id),
        "booking_id": booking_id,
        "client_headers": headers,
        "client_email": user.email,
    }


@pytest.mark.asyncio
async def test_user_can_list_own_upcoming_bookings(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_user_linked_booking(async_client, db_session, "me-list")
    response = await async_client.get(
        "/api/v1/me/bookings",
        params={"status": "upcoming"},
        headers=ctx["client_headers"],
    )
    assert response.status_code == 200
    assert any(item["id"] == ctx["booking_id"] for item in response.json()["data"])


@pytest.mark.asyncio
async def test_user_cannot_see_another_users_bookings(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx_a = await _setup_user_linked_booking(async_client, db_session, "me-iso-a")
    ctx_b = await _setup_user_linked_booking(async_client, db_session, "me-iso-b")
    response = await async_client.get(
        "/api/v1/me/bookings",
        headers=ctx_a["client_headers"],
    )
    ids = {item["id"] for item in response.json()["data"]}
    assert ctx_b["booking_id"] not in ids


@pytest.mark.asyncio
async def test_get_detail_returns_own_booking(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_user_linked_booking(async_client, db_session, "me-detail")
    response = await async_client.get(
        f"/api/v1/me/bookings/{ctx['booking_id']}",
        headers=ctx["client_headers"],
    )
    assert response.status_code == 200
    assert response.json()["id"] == ctx["booking_id"]


@pytest.mark.asyncio
async def test_get_detail_for_other_users_booking_returns_404(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx_a = await _setup_user_linked_booking(async_client, db_session, "me-detail-a")
    ctx_b = await _setup_user_linked_booking(async_client, db_session, "me-detail-b")
    response = await async_client.get(
        f"/api/v1/me/bookings/{ctx_b['booking_id']}",
        headers=ctx_a["client_headers"],
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_client_can_cancel_future_pending_booking(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_user_linked_booking(async_client, db_session, "me-cancel-pending")
    response = await async_client.post(
        f"/api/v1/me/bookings/{ctx['booking_id']}/cancel",
        json={"reason": "Changed plans"},
        headers=ctx["client_headers"],
    )
    assert response.status_code == 200
    assert response.json()["status"] == "cancelled"


@pytest.mark.asyncio
async def test_client_can_cancel_future_confirmed_booking(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_user_linked_booking(
        async_client,
        db_session,
        "me-cancel-confirmed",
        status=BookingStatus.confirmed,
    )
    response = await async_client.post(
        f"/api/v1/me/bookings/{ctx['booking_id']}/cancel",
        json={},
        headers=ctx["client_headers"],
    )
    assert response.status_code == 200
    assert response.json()["status"] == "cancelled"


@pytest.mark.asyncio
async def test_cancel_sets_cancelled_by_client_and_reason(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_user_linked_booking(async_client, db_session, "me-cancel-fields")
    response = await async_client.post(
        f"/api/v1/me/bookings/{ctx['booking_id']}/cancel",
        json={"reason": "Cannot make it"},
        headers=ctx["client_headers"],
    )
    body = response.json()
    assert body["cancelled_by"] == "client"
    assert body["cancellation_reason"] == "Cannot make it"


@pytest.mark.asyncio
async def test_client_cannot_cancel_past_booking(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_user_linked_booking(
        async_client,
        db_session,
        "me-cancel-past",
        starts_at=PAST_SLOT,
    )
    response = await async_client.post(
        f"/api/v1/me/bookings/{ctx['booking_id']}/cancel",
        json={},
        headers=ctx["client_headers"],
    )
    assert response.status_code == 400


@pytest.mark.parametrize(
    "status",
    [BookingStatus.completed, BookingStatus.no_show, BookingStatus.cancelled],
)
@pytest.mark.asyncio
async def test_client_cannot_cancel_terminal_bookings(
    async_client: AsyncClient,
    db_session,
    status: BookingStatus,
) -> None:
    ctx = await _setup_user_linked_booking(
        async_client,
        db_session,
        f"me-cancel-{status.value.replace('_', '-')}",
        status=status,
    )
    response = await async_client.post(
        f"/api/v1/me/bookings/{ctx['booking_id']}/cancel",
        json={},
        headers=ctx["client_headers"],
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_cancellation_cutoff_blocks_too_late_cancel(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_user_linked_booking(
        async_client,
        db_session,
        "me-cutoff",
        starts_at=SLOT_START,
    )
    response = await async_client.post(
        f"/api/v1/me/bookings/{ctx['booking_id']}/cancel",
        json={},
        headers=ctx["client_headers"],
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "BOOKING_CANCEL_TOO_LATE"


@pytest.mark.asyncio
async def test_client_can_reschedule_future_pending_booking(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_user_linked_booking(async_client, db_session, "me-resched-pending")
    response = await async_client.post(
        f"/api/v1/me/bookings/{ctx['booking_id']}/reschedule",
        json={"starts_at": RESCHEDULE_SLOT.isoformat()},
        headers=ctx["client_headers"],
    )
    assert response.status_code == 200
    assert datetime.fromisoformat(response.json()["starts_at"]) == RESCHEDULE_SLOT


@pytest.mark.asyncio
async def test_client_can_reschedule_future_confirmed_booking(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_user_linked_booking(
        async_client,
        db_session,
        "me-resched-confirmed",
        status=BookingStatus.confirmed,
    )
    response = await async_client.post(
        f"/api/v1/me/bookings/{ctx['booking_id']}/reschedule",
        json={"starts_at": RESCHEDULE_SLOT.isoformat()},
        headers=ctx["client_headers"],
    )
    assert response.status_code == 200
    assert response.json()["status"] == "confirmed"


@pytest.mark.asyncio
async def test_reschedule_to_occupied_slot_returns_slot_unavailable(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_user_linked_booking(async_client, db_session, "me-resched-occupied")
    other_client = await _create_client_user(db_session, "other-occ")
    client = Client(
        business_id=uuid.UUID(ctx["business_id"]),
        user_id=other_client.id,
        full_name="Other Client",
        email=other_client.email,
        source=ClientSource.registered,
    )
    db_session.add(client)
    await db_session.flush()
    db_session.add(
        Booking(
            business_id=uuid.UUID(ctx["business_id"]),
            service_id=uuid.UUID(ctx["service_id"]),
            client_id=client.id,
            reference=f"BK{uuid.uuid4().hex[:8]}".upper()[:20],
            starts_at=RESCHEDULE_SLOT,
            ends_at=RESCHEDULE_SLOT + timedelta(minutes=30),
            status=BookingStatus.confirmed,
        )
    )
    await db_session.commit()
    response = await async_client.post(
        f"/api/v1/me/bookings/{ctx['booking_id']}/reschedule",
        json={"starts_at": RESCHEDULE_SLOT.isoformat()},
        headers=ctx["client_headers"],
    )
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_reschedule_to_break_returns_slot_unavailable(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_user_linked_booking(async_client, db_session, "me-resched-break")
    await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/schedule/breaks",
        json={"label": "Lunch", "day_of_week": 4, "starts_at": "12:00", "ends_at": "13:00"},
        headers=ctx["headers"],
    )
    lunch_slot = datetime(2026, 6, 25, 12, 0, tzinfo=ZoneInfo("America/New_York"))
    response = await async_client.post(
        f"/api/v1/me/bookings/{ctx['booking_id']}/reschedule",
        json={"starts_at": lunch_slot.isoformat()},
        headers=ctx["client_headers"],
    )
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_cancelled_slot_becomes_available_after_cancel(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_user_linked_booking(async_client, db_session, "me-avail-after-cancel")
    await async_client.post(
        f"/api/v1/me/bookings/{ctx['booking_id']}/cancel",
        json={},
        headers=ctx["client_headers"],
    )
    avail = await async_client.get(
        f"/api/v1/public/b/{ctx['slug']}/availability",
        params={"service_id": ctx["service_id"], "date": FUTURE_SLOT.date().isoformat()},
    )
    assert any(
        datetime.fromisoformat(s["starts_at"]) == FUTURE_SLOT
        for s in avail.json()["slots"]
    )


@pytest.mark.asyncio
async def test_status_filter_upcoming_and_cancelled(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_user_linked_booking(async_client, db_session, "me-filter")
    await async_client.post(
        f"/api/v1/me/bookings/{ctx['booking_id']}/cancel",
        json={},
        headers=ctx["client_headers"],
    )
    upcoming = await async_client.get(
        "/api/v1/me/bookings",
        params={"status": "upcoming"},
        headers=ctx["client_headers"],
    )
    cancelled = await async_client.get(
        "/api/v1/me/bookings",
        params={"status": "cancelled"},
        headers=ctx["client_headers"],
    )
    assert ctx["booking_id"] not in {item["id"] for item in upcoming.json()["data"]}
    assert any(item["id"] == ctx["booking_id"] for item in cancelled.json()["data"])


@pytest.mark.asyncio
async def test_pagination_returns_meta(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_user_linked_booking(async_client, db_session, "me-page")
    response = await async_client.get(
        "/api/v1/me/bookings",
        params={"page": 1, "limit": 1},
        headers=ctx["client_headers"],
    )
    meta = response.json()["meta"]
    assert meta["page"] == 1
    assert meta["limit"] == 1
    assert meta["total"] >= 1


def test_openapi_includes_me_bookings_endpoints() -> None:
    paths = app.openapi()["paths"]
    assert "/api/v1/me/bookings" in paths
    detail = "/api/v1/me/bookings/{booking_id}"
    assert detail in paths
    assert "/api/v1/me/bookings/{booking_id}/cancel" in paths
    assert "/api/v1/me/bookings/{booking_id}/reschedule" in paths
