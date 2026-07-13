from datetime import timedelta
from zoneinfo import ZoneInfo

import pytest
from httpx import AsyncClient

from app.models.enums import BookingStatus, OrderStatus
from tests.conftest import assert_response_status
from tests.test_me_bookings_routes import (
    FUTURE_SLOT,
    _login_client,
    _setup_user_linked_booking,
)
from tests.test_me_orders_routes import (
    _admin_set_order_status,
    _setup_user_linked_order,
)


@pytest.mark.asyncio
async def test_client_can_review_own_completed_booking(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_user_linked_booking(
        async_client,
        db_session,
        "client-review-booking",
        status=BookingStatus.completed,
        starts_at=FUTURE_SLOT - timedelta(days=7),
    )
    response = await async_client.post(
        f"/api/v1/me/bookings/{ctx['booking_id']}/review",
        json={"rating": 5, "comment": "Great experience"},
        headers=ctx["client_headers"],
    )
    assert response.status_code == 201
    body = response.json()
    assert body["rating"] == 5
    assert body["comment"] == "Great experience"
    assert body["status"] == "published"
    assert body["customer_name"] == "Client User"

    detail = await async_client.get(
        f"/api/v1/me/bookings/{ctx['booking_id']}",
        headers=ctx["client_headers"],
    )
    assert detail.status_code == 200
    assert detail.json()["has_review"] is True
    assert detail.json()["can_review"] is False


@pytest.mark.asyncio
async def test_client_cannot_review_non_completed_booking(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_user_linked_booking(
        async_client,
        db_session,
        "client-review-pending",
        status=BookingStatus.pending,
    )
    response = await async_client.post(
        f"/api/v1/me/bookings/{ctx['booking_id']}/review",
        json={"rating": 4},
        headers=ctx["client_headers"],
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "REVIEW_NOT_ALLOWED"


@pytest.mark.asyncio
async def test_client_cannot_review_another_clients_booking(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx_a = await _setup_user_linked_booking(
        async_client,
        db_session,
        "client-review-iso-a",
        status=BookingStatus.completed,
        starts_at=FUTURE_SLOT - timedelta(days=7),
    )
    ctx_b = await _setup_user_linked_booking(
        async_client,
        db_session,
        "client-review-iso-b",
        status=BookingStatus.completed,
        starts_at=FUTURE_SLOT - timedelta(days=7),
    )
    response = await async_client.post(
        f"/api/v1/me/bookings/{ctx_b['booking_id']}/review",
        json={"rating": 5},
        headers=ctx_a["client_headers"],
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_duplicate_client_booking_review_rejected(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_user_linked_booking(
        async_client,
        db_session,
        "client-review-dup",
        status=BookingStatus.completed,
        starts_at=FUTURE_SLOT - timedelta(days=7),
    )
    first = await async_client.post(
        f"/api/v1/me/bookings/{ctx['booking_id']}/review",
        json={"rating": 5},
        headers=ctx["client_headers"],
    )
    assert first.status_code == 201
    second = await async_client.post(
        f"/api/v1/me/bookings/{ctx['booking_id']}/review",
        json={"rating": 4},
        headers=ctx["client_headers"],
    )
    assert second.status_code == 409
    assert second.json()["error"]["code"] == "REVIEW_DUPLICATE"


@pytest.mark.asyncio
async def test_client_booking_review_rating_must_be_1_to_5(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_user_linked_booking(
        async_client,
        db_session,
        "client-review-rating",
        status=BookingStatus.completed,
        starts_at=FUTURE_SLOT - timedelta(days=7),
    )
    response = await async_client.post(
        f"/api/v1/me/bookings/{ctx['booking_id']}/review",
        json={"rating": 0},
        headers=ctx["client_headers"],
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_client_booking_review_appears_in_admin_and_public(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_user_linked_booking(
        async_client,
        db_session,
        "client-review-public",
        status=BookingStatus.completed,
        starts_at=FUTURE_SLOT - timedelta(days=7),
    )
    created = await async_client.post(
        f"/api/v1/me/bookings/{ctx['booking_id']}/review",
        json={"rating": 5, "comment": "Loved it"},
        headers=ctx["client_headers"],
    )
    assert created.status_code == 201
    review_id = created.json()["id"]

    admin_list = await async_client.get(
        f"/api/v1/businesses/{ctx['business_id']}/reviews",
        headers=ctx["headers"],
    )
    assert_response_status(admin_list, 200, context="admin list reviews")
    assert any(item["id"] == review_id for item in admin_list.json())

    public_reviews = await async_client.get(f"/api/v1/public/b/{ctx['slug']}/reviews")
    assert_response_status(public_reviews, 200, context="public list reviews")
    body = public_reviews.json()
    assert body["summary"]["review_count"] == 1
    assert body["summary"]["average_rating"] == 5.0
    assert any(item["id"] == review_id for item in body["reviews"])


@pytest.mark.asyncio
async def test_hidden_client_booking_review_not_public(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_user_linked_booking(
        async_client,
        db_session,
        "client-review-hidden",
        status=BookingStatus.completed,
        starts_at=FUTURE_SLOT - timedelta(days=7),
    )
    created = await async_client.post(
        f"/api/v1/me/bookings/{ctx['booking_id']}/review",
        json={"rating": 3},
        headers=ctx["client_headers"],
    )
    assert created.status_code == 201
    review_id = created.json()["id"]

    hidden = await async_client.patch(
        f"/api/v1/businesses/{ctx['business_id']}/reviews/{review_id}",
        json={"status": "hidden"},
        headers=ctx["headers"],
    )
    assert_response_status(hidden, 200, context="admin hide review")

    public_reviews = await async_client.get(f"/api/v1/public/b/{ctx['slug']}/reviews")
    assert_response_status(public_reviews, 200, context="public list reviews")
    body = public_reviews.json()
    assert body["summary"]["review_count"] == 0
    assert body["reviews"] == []


@pytest.mark.asyncio
async def test_client_can_review_own_completed_order(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_user_linked_order(
        async_client,
        db_session,
        "client-review-order",
        status=OrderStatus.submitted,
    )
    await _admin_set_order_status(async_client, ctx, OrderStatus.completed)

    response = await async_client.post(
        f"/api/v1/me/orders/{ctx['order_id']}/review",
        json={"rating": 4, "comment": "Good work"},
        headers=ctx["client_headers"],
    )
    assert response.status_code == 201
    body = response.json()
    assert body["rating"] == 4
    assert body["status"] == "published"

    detail = await async_client.get(
        f"/api/v1/me/orders/{ctx['order_id']}",
        headers=ctx["client_headers"],
    )
    assert detail.status_code == 200
    assert detail.json()["has_review"] is True
    assert detail.json()["can_review"] is False


@pytest.mark.asyncio
async def test_client_cannot_review_non_completed_order(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_user_linked_order(
        async_client,
        db_session,
        "client-review-order-active",
        status=OrderStatus.in_progress,
    )
    response = await async_client.post(
        f"/api/v1/me/orders/{ctx['order_id']}/review",
        json={"rating": 5},
        headers=ctx["client_headers"],
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "REVIEW_NOT_ALLOWED"


@pytest.mark.asyncio
async def test_completed_booking_list_exposes_review_flags(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_user_linked_booking(
        async_client,
        db_session,
        "client-review-list",
        status=BookingStatus.completed,
        starts_at=FUTURE_SLOT - timedelta(days=7),
    )
    before = await async_client.get(
        "/api/v1/me/bookings",
        params={"status": "past"},
        headers=ctx["client_headers"],
    )
    assert before.status_code == 200
    item = next(i for i in before.json()["data"] if i["id"] == ctx["booking_id"])
    assert item["can_review"] is True
    assert item["has_review"] is False

    await async_client.post(
        f"/api/v1/me/bookings/{ctx['booking_id']}/review",
        json={"rating": 5},
        headers=ctx["client_headers"],
    )

    after = await async_client.get(
        "/api/v1/me/bookings",
        params={"status": "past"},
        headers=ctx["client_headers"],
    )
    assert after.status_code == 200
    item = next(i for i in after.json()["data"] if i["id"] == ctx["booking_id"])
    assert item["can_review"] is False
    assert item["has_review"] is True
