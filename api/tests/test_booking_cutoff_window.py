from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from unittest.mock import patch
from zoneinfo import ZoneInfo

import pytest
from httpx import AsyncClient
from sqlalchemy import update

from app.models.business import Business
from app.repositories.business_repository import DEFAULT_BUSINESS_SETTINGS
from app.services.booking_capacity import SLOT_FULLY_BOOKED_MESSAGE
from app.utils.booking_rules import (
    SLOT_OUTSIDE_WINDOW_MESSAGE,
    SLOT_TOO_SOON_MESSAGE,
    effective_booking_window_days,
    effective_min_notice_minutes,
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
SLOT_12_START = datetime(2026, 6, 23, 12, 0, tzinfo=ZoneInfo("America/New_York"))
FIXED_NOW_UTC = FIXED_NOW.astimezone(UTC)


async def _set_business_settings(db_session, slug: str, **overrides) -> None:
    settings = dict(DEFAULT_BUSINESS_SETTINGS)
    settings.update(overrides)
    await db_session.execute(
        update(Business).where(Business.slug == slug).values(settings=settings)
    )
    await db_session.commit()


def _service(**fields) -> SimpleNamespace:
    defaults = {"booking_min_notice_minutes": 0, "booking_window_days": None}
    defaults.update(fields)
    return SimpleNamespace(**defaults)


def test_effective_min_notice_uses_business_when_service_is_zero() -> None:
    service = _service(booking_min_notice_minutes=0)
    assert effective_min_notice_minutes(service, {"min_advance_booking_hours": 4}) == 240


def test_effective_min_notice_uses_service_when_business_is_zero() -> None:
    service = _service(booking_min_notice_minutes=120)
    assert effective_min_notice_minutes(service, {"min_advance_booking_hours": 0}) == 120


def test_effective_min_notice_stricter_value_wins() -> None:
    service = _service(booking_min_notice_minutes=120)
    assert effective_min_notice_minutes(service, {"min_advance_booking_hours": 4}) == 240
    assert effective_min_notice_minutes(service, {"min_advance_booking_hours": 1}) == 120


def test_effective_min_notice_no_restriction_when_both_zero() -> None:
    service = _service(booking_min_notice_minutes=0)
    assert effective_min_notice_minutes(service, {"min_advance_booking_hours": 0}) == 0
    assert effective_min_notice_minutes(service, {}) == 0


def test_effective_booking_window_uses_business_when_service_is_null() -> None:
    service = _service(booking_window_days=None)
    assert effective_booking_window_days(service, {"max_advance_booking_days": 30}) == 30


def test_effective_booking_window_uses_service_when_business_missing() -> None:
    service = _service(booking_window_days=14)
    settings = dict(DEFAULT_BUSINESS_SETTINGS)
    settings.pop("max_advance_booking_days", None)
    assert effective_booking_window_days(service, settings) == 14


def test_effective_booking_window_stricter_value_wins() -> None:
    service = _service(booking_window_days=14)
    assert effective_booking_window_days(service, {"max_advance_booking_days": 30}) == 14
    service = _service(booking_window_days=30)
    assert effective_booking_window_days(service, {"max_advance_booking_days": 14}) == 14


def test_effective_booking_window_no_restriction_when_both_missing() -> None:
    service = _service(booking_window_days=None)
    settings = dict(DEFAULT_BUSINESS_SETTINGS)
    settings.pop("max_advance_booking_days", None)
    assert effective_booking_window_days(service, settings) is None


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


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_business_min_advance_still_filters_when_service_notice_is_zero(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "cutoff-biz-min")
    await _set_business_settings(db_session, ctx["slug"], min_advance_booking_hours=4)

    response = await async_client.get(
        f"/api/v1/public/b/{ctx['slug']}/availability",
        params={"service_id": ctx["service_id"], "date": TARGET_DATE.isoformat()},
    )
    assert response.status_code == 200
    for slot in response.json()["slots"]:
        start = datetime.fromisoformat(slot["starts_at"])
        assert start >= SLOT_12_START


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_business_max_advance_still_filters_when_service_window_is_null(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "cutoff-biz-max")
    await _set_business_settings(db_session, ctx["slug"], max_advance_booking_days=30)
    far_date = TARGET_DATE + timedelta(days=31)

    response = await async_client.get(
        f"/api/v1/public/b/{ctx['slug']}/availability",
        params={"service_id": ctx["service_id"], "date": far_date.isoformat()},
    )
    assert response.status_code == 200
    assert response.json()["slots"] == []


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_service_min_notice_works_when_business_has_none(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "cutoff-svc-min-only")
    await _set_business_settings(db_session, ctx["slug"], min_advance_booking_hours=0)
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
async def test_public_booking_uses_combined_min_notice(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "cutoff-combined-book")
    await _set_business_settings(db_session, ctx["slug"], min_advance_booking_hours=4)
    await async_client.patch(
        f"/api/v1/businesses/{ctx['business_id']}/services/{ctx['service_id']}",
        json={"booking_min_notice_minutes": 0},
        headers=ctx["headers"],
    )

    response = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/bookings",
        json=booking_payload(ctx["service_id"], starts_at=SLOT_START),
    )
    assert response.status_code == 409
    assert response.json()["error"]["message"] == SLOT_TOO_SOON_MESSAGE


@pytest.mark.asyncio
@patch("app.repositories.booking_repository._now_utc", return_value=FIXED_NOW_UTC)
@patch("app.services.client_booking_service._now_utc", return_value=FIXED_NOW_UTC)
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_client_reschedule_uses_combined_booking_rules(
    _mock_now,
    _mock_client_now,
    _mock_repo_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    import uuid

    from app.models.booking import Booking
    from app.models.client import Client
    from app.models.enums import BookingStatus, ClientSource, UserRole
    from app.models.user import User
    from app.services.password_service import hash_password

    ctx = await _setup_booking_business(async_client, db_session, "cutoff-resched")
    await _set_business_settings(db_session, ctx["slug"], min_advance_booking_hours=4)
    user = User(
        email="cutoff-resched-client@example.com",
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
    future_slot = datetime(2026, 6, 25, 10, 0, tzinfo=ZoneInfo("America/New_York"))
    booking = Booking(
        business_id=uuid.UUID(ctx["business_id"]),
        service_id=uuid.UUID(ctx["service_id"]),
        client_id=client.id,
        reference=f"BK{uuid.uuid4().hex[:8]}".upper()[:20],
        starts_at=future_slot,
        ends_at=future_slot + timedelta(minutes=30),
        status=BookingStatus.pending,
    )
    db_session.add(booking)
    await db_session.commit()

    login = await async_client.post(
        "/api/v1/auth/login",
        json={"email": user.email, "password": "securePass123"},
    )
    headers = {"Authorization": f"Bearer {login.json()['tokens']['access_token']}"}

    response = await async_client.post(
        f"/api/v1/me/bookings/{booking.id}/reschedule",
        json={"starts_at": SLOT_START.isoformat()},
        headers=headers,
    )
    assert response.status_code == 409
    assert response.json()["error"]["message"] == SLOT_TOO_SOON_MESSAGE
