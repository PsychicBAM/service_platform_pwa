from datetime import UTC, datetime
from unittest.mock import patch

import pytest
from httpx import AsyncClient

from tests.conftest import assert_response_status
from tests.test_bookings_availability_blocking import FIXED_NOW, _setup_booking_business
from tests.test_public_booking_create import booking_payload
from tests.test_public_order_create import _setup_order_business, order_payload


async def _create_completed_booking(async_client: AsyncClient, ctx: dict) -> dict:
    create = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/bookings",
        json=booking_payload(ctx["service_id"]),
    )
    assert_response_status(create, 201, context="public booking create")
    booking = create.json()

    confirm = await async_client.patch(
        f"/api/v1/businesses/{ctx['business_id']}/bookings/{booking['id']}",
        json={"status": "confirmed"},
        headers=ctx["headers"],
    )
    assert_response_status(confirm, 200, context="admin confirm booking")

    complete = await async_client.patch(
        f"/api/v1/businesses/{ctx['business_id']}/bookings/{booking['id']}",
        json={"status": "completed"},
        headers=ctx["headers"],
    )
    assert_response_status(complete, 200, context="admin complete booking")
    return complete.json()


async def _create_completed_order(async_client: AsyncClient, ctx: dict) -> dict:
    create = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/orders",
        json=order_payload(ctx["service_id"]),
    )
    assert_response_status(create, 201, context="public order create")
    order = create.json()

    in_progress = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/orders/{order['id']}/in-progress",
        headers=ctx["headers"],
    )
    assert_response_status(in_progress, 200, context="admin mark order in progress")

    complete = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/orders/{order['id']}/complete",
        headers=ctx["headers"],
    )
    assert_response_status(complete, 200, context="admin complete order")
    return complete.json()


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_public_can_create_review_for_completed_booking(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "reviews-booking-create")
    booking = await _create_completed_booking(async_client, ctx)

    response = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/reviews",
        json={
            "booking_reference": booking["reference"],
            "email": booking["client"]["email"],
            "rating": 5,
            "comment": "Great service",
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert body["booking_reference"] == booking["reference"]
    assert body["rating"] == 5
    assert body["status"] == "published"


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_rating_must_be_1_to_5(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "reviews-rating-range")
    booking = await _create_completed_booking(async_client, ctx)

    bad = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/reviews",
        json={
            "booking_reference": booking["reference"],
            "email": booking["client"]["email"],
            "rating": 6,
        },
    )
    assert bad.status_code == 422


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_cannot_review_non_completed_booking(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "reviews-not-completed")
    booking_resp = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/bookings",
        json=booking_payload(ctx["service_id"]),
    )
    assert_response_status(booking_resp, 201, context="public booking create")
    booking = booking_resp.json()

    response = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/reviews",
        json={
            "booking_reference": booking["reference"],
            "email": booking["client"]["email"],
            "rating": 5,
        },
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "REVIEW_NOT_ALLOWED"


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_duplicate_review_for_same_booking_rejected(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "reviews-dup-booking")
    booking = await _create_completed_booking(async_client, ctx)
    payload = {
        "booking_reference": booking["reference"],
        "email": booking["client"]["email"],
        "rating": 5,
    }
    first = await async_client.post(f"/api/v1/public/b/{ctx['slug']}/reviews", json=payload)
    assert first.status_code == 201
    second = await async_client.post(f"/api/v1/public/b/{ctx['slug']}/reviews", json=payload)
    assert second.status_code == 409
    assert second.json()["error"]["code"] == "REVIEW_DUPLICATE"


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_admin_can_list_and_hide_review(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "reviews-admin-list")
    booking = await _create_completed_booking(async_client, ctx)
    created = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/reviews",
        json={
            "booking_reference": booking["reference"],
            "email": booking["client"]["email"],
            "rating": 4,
            "comment": "Ok",
        },
    )
    assert created.status_code == 201
    review_id = created.json()["id"]

    list_resp = await async_client.get(
        f"/api/v1/businesses/{ctx['business_id']}/reviews",
        headers=ctx["headers"],
    )
    assert list_resp.status_code == 200
    assert any(r["id"] == review_id for r in list_resp.json())

    hide = await async_client.patch(
        f"/api/v1/businesses/{ctx['business_id']}/reviews/{review_id}",
        json={"status": "hidden"},
        headers=ctx["headers"],
    )
    assert hide.status_code == 200
    assert hide.json()["status"] == "hidden"


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_public_reviews_endpoint_returns_only_published_and_summary_ignores_hidden(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "reviews-public-list")
    booking_a = await _create_completed_booking(async_client, ctx)
    booking_b = await _create_completed_booking(async_client, ctx)

    review_a = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/reviews",
        json={
            "booking_reference": booking_a["reference"],
            "email": booking_a["client"]["email"],
            "rating": 5,
            "comment": "Great",
        },
    )
    assert review_a.status_code == 201
    review_b = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/reviews",
        json={
            "booking_reference": booking_b["reference"],
            "email": booking_b["client"]["email"],
            "rating": 1,
            "comment": "Bad",
        },
    )
    assert review_b.status_code == 201

    hide = await async_client.patch(
        f"/api/v1/businesses/{ctx['business_id']}/reviews/{review_b.json()['id']}",
        json={"status": "hidden"},
        headers=ctx["headers"],
    )
    assert hide.status_code == 200

    public_list = await async_client.get(f"/api/v1/public/b/{ctx['slug']}/reviews")
    assert public_list.status_code == 200
    body = public_list.json()
    assert body["summary"]["review_count"] == 1
    assert body["summary"]["average_rating"] == 5.0
    assert len(body["reviews"]) == 1
    assert body["reviews"][0]["comment"] == "Great"

    pub_business = await async_client.get(f"/api/v1/public/b/{ctx['slug']}")
    assert pub_business.status_code == 200
    assert pub_business.json()["review_count"] == 1
    assert pub_business.json()["average_rating"] == 5.0


@pytest.mark.asyncio
async def test_order_review_flow_completed_only(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_order_business(async_client, db_session, "reviews-order-create")
    order = await _create_completed_order(async_client, ctx)

    response = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/reviews",
        json={
            "order_reference": order["reference"],
            "email": order["client"]["email"],
            "rating": 5,
        },
    )
    assert response.status_code == 201

