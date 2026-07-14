import uuid
from datetime import UTC, datetime, timedelta
from unittest.mock import patch

import jwt
import pytest
from httpx import AsyncClient

from app.config import get_settings
from app.models.enums import BookingStatus, OrderStatus
from app.services.review_request_token_service import create_review_request_token
from tests.conftest import assert_response_status
from tests.test_me_bookings_routes import FUTURE_SLOT, _setup_user_linked_booking
from tests.test_me_orders_routes import _admin_set_order_status, _setup_user_linked_order


async def _generate_booking_review_link(async_client: AsyncClient, ctx: dict) -> dict:
    response = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/reviews/request-link",
        json={"booking_id": ctx["booking_id"]},
        headers=ctx["headers"],
    )
    assert response.status_code == 201
    return response.json()


async def _generate_order_review_link(async_client: AsyncClient, ctx: dict) -> dict:
    response = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/reviews/request-link",
        json={"order_id": ctx["order_id"]},
        headers=ctx["headers"],
    )
    assert response.status_code == 201
    return response.json()


def _token_from_review_url(review_url: str) -> str:
    return review_url.rstrip("/").rsplit("/", 1)[-1]


@pytest.mark.asyncio
async def test_admin_can_generate_booking_review_link(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_user_linked_booking(
        async_client,
        db_session,
        "review-link-booking",
        status=BookingStatus.completed,
        starts_at=FUTURE_SLOT - timedelta(days=7),
    )
    body = await _generate_booking_review_link(async_client, ctx)
    assert body["already_reviewed"] is False
    assert body["review_url"].startswith("http")
    assert body["expires_at"]


@pytest.mark.asyncio
async def test_cannot_generate_link_for_non_completed_booking(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_user_linked_booking(
        async_client,
        db_session,
        "review-link-pending",
        status=BookingStatus.pending,
    )
    response = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/reviews/request-link",
        json={"booking_id": ctx["booking_id"]},
        headers=ctx["headers"],
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "REVIEW_NOT_ALLOWED"


@pytest.mark.asyncio
async def test_cannot_generate_link_for_already_reviewed_booking(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_user_linked_booking(
        async_client,
        db_session,
        "review-link-reviewed",
        status=BookingStatus.completed,
        starts_at=FUTURE_SLOT - timedelta(days=7),
    )
    await async_client.post(
        f"/api/v1/me/bookings/{ctx['booking_id']}/review",
        json={"rating": 5},
        headers=ctx["client_headers"],
    )
    response = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/reviews/request-link",
        json={"booking_id": ctx["booking_id"]},
        headers=ctx["headers"],
    )
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "REVIEW_DUPLICATE"


@pytest.mark.asyncio
async def test_cannot_generate_link_for_another_business_booking(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx_a = await _setup_user_linked_booking(
        async_client,
        db_session,
        "review-link-biz-a",
        status=BookingStatus.completed,
        starts_at=FUTURE_SLOT - timedelta(days=7),
    )
    ctx_b = await _setup_user_linked_booking(
        async_client,
        db_session,
        "review-link-biz-b",
        status=BookingStatus.completed,
        starts_at=FUTURE_SLOT - timedelta(days=7),
    )
    response = await async_client.post(
        f"/api/v1/businesses/{ctx_a['business_id']}/reviews/request-link",
        json={"booking_id": ctx_b["booking_id"]},
        headers=ctx_a["headers"],
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_public_get_token_returns_safe_context(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_user_linked_booking(
        async_client,
        db_session,
        "review-link-context",
        status=BookingStatus.completed,
        starts_at=FUTURE_SLOT - timedelta(days=7),
    )
    link = await _generate_booking_review_link(async_client, ctx)
    token = _token_from_review_url(link["review_url"])
    response = await async_client.get(f"/api/v1/public/reviews/request/{token}")
    assert response.status_code == 200
    body = response.json()
    assert body["type"] == "booking"
    assert body["business_name"]
    assert body["service_name"]
    assert body["customer_name"]
    assert body["already_reviewed"] is False
    assert "admin_notes" not in body
    assert "email" not in body


@pytest.mark.asyncio
async def test_public_post_token_creates_review(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_user_linked_booking(
        async_client,
        db_session,
        "review-link-submit",
        status=BookingStatus.completed,
        starts_at=FUTURE_SLOT - timedelta(days=7),
    )
    link = await _generate_booking_review_link(async_client, ctx)
    token = _token_from_review_url(link["review_url"])
    response = await async_client.post(
        f"/api/v1/public/reviews/request/{token}",
        json={"rating": 5, "comment": "Great via link"},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["rating"] == 5
    assert body["status"] == "published"


@pytest.mark.asyncio
async def test_duplicate_post_after_review_created(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_user_linked_booking(
        async_client,
        db_session,
        "review-link-dup",
        status=BookingStatus.completed,
        starts_at=FUTURE_SLOT - timedelta(days=7),
    )
    link = await _generate_booking_review_link(async_client, ctx)
    token = _token_from_review_url(link["review_url"])
    first = await async_client.post(
        f"/api/v1/public/reviews/request/{token}",
        json={"rating": 4},
    )
    assert first.status_code == 201
    second = await async_client.post(
        f"/api/v1/public/reviews/request/{token}",
        json={"rating": 3},
    )
    assert second.status_code == 409
    assert second.json()["error"]["code"] == "REVIEW_DUPLICATE"


@pytest.mark.asyncio
async def test_expired_token_fails(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_user_linked_booking(
        async_client,
        db_session,
        "review-link-expired",
        status=BookingStatus.completed,
        starts_at=FUTURE_SLOT - timedelta(days=7),
    )
    settings = get_settings()
    expired_token, _ = create_review_request_token(
        business_id=uuid.UUID(ctx["business_id"]),
        target_type="booking",
        target_id=uuid.UUID(ctx["booking_id"]),
        settings=settings,
    )
    payload = jwt.decode(
        expired_token,
        settings.jwt_secret_key,
        algorithms=[settings.jwt_algorithm],
    )
    payload["exp"] = datetime.now(UTC) - timedelta(days=1)
    tampered = jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)

    response = await async_client.get(f"/api/v1/public/reviews/request/{tampered}")
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "REVIEW_REQUEST_TOKEN_EXPIRED"


@pytest.mark.asyncio
async def test_invalid_token_fails(async_client: AsyncClient) -> None:
    response = await async_client.get("/api/v1/public/reviews/request/not-a-valid-token")
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "REVIEW_REQUEST_TOKEN_INVALID"


@pytest.mark.asyncio
async def test_order_review_link_flow(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_user_linked_order(
        async_client,
        db_session,
        "review-link-order",
        status=OrderStatus.submitted,
    )
    await _admin_set_order_status(async_client, ctx, OrderStatus.completed)
    link = await _generate_order_review_link(async_client, ctx)
    token = _token_from_review_url(link["review_url"])

    context = await async_client.get(f"/api/v1/public/reviews/request/{token}")
    assert context.status_code == 200
    assert context.json()["type"] == "order"

    created = await async_client.post(
        f"/api/v1/public/reviews/request/{token}",
        json={"rating": 4, "comment": "Order review"},
    )
    assert created.status_code == 201


@pytest.mark.asyncio
async def test_created_review_appears_in_admin_and_public(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_user_linked_booking(
        async_client,
        db_session,
        "review-link-public",
        status=BookingStatus.completed,
        starts_at=FUTURE_SLOT - timedelta(days=7),
    )
    link = await _generate_booking_review_link(async_client, ctx)
    token = _token_from_review_url(link["review_url"])
    created = await async_client.post(
        f"/api/v1/public/reviews/request/{token}",
        json={"rating": 5},
    )
    assert created.status_code == 201
    review_id = created.json()["id"]

    admin_list = await async_client.get(
        f"/api/v1/businesses/{ctx['business_id']}/reviews",
        headers=ctx["headers"],
    )
    assert_response_status(admin_list, 200, context="admin reviews list")
    assert any(item["id"] == review_id for item in admin_list.json())

    public_reviews = await async_client.get(f"/api/v1/public/b/{ctx['slug']}/reviews")
    assert_response_status(public_reviews, 200, context="public reviews list")
    assert any(item["id"] == review_id for item in public_reviews.json()["reviews"])


@pytest.mark.asyncio
async def test_get_context_shows_already_reviewed(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_user_linked_booking(
        async_client,
        db_session,
        "review-link-already",
        status=BookingStatus.completed,
        starts_at=FUTURE_SLOT - timedelta(days=7),
    )
    link = await _generate_booking_review_link(async_client, ctx)
    token = _token_from_review_url(link["review_url"])
    await async_client.post(
        f"/api/v1/public/reviews/request/{token}",
        json={"rating": 5},
    )
    context = await async_client.get(f"/api/v1/public/reviews/request/{token}")
    assert context.status_code == 200
    assert context.json()["already_reviewed"] is True
