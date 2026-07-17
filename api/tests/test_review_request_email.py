"""Follow-up email consent and review request email invitations."""

from datetime import UTC, datetime, timedelta
from unittest.mock import patch
from uuid import UUID

import pytest
from httpx import AsyncClient

from app.models.booking import Booking
from app.models.enums import BookingStatus, OrderStatus
from app.models.order import Order
from app.services.email_service import EMAIL_DRY_RUN, EmailSendResult
from tests.test_bookings_availability_blocking import FIXED_NOW, _setup_booking_business
from tests.test_me_bookings_routes import FUTURE_SLOT, _setup_user_linked_booking
from tests.test_me_orders_routes import _admin_set_order_status, _setup_user_linked_order
from tests.test_public_booking_create import booking_payload
from tests.test_public_order_create import _setup_order_business, order_payload


async def _enable_follow_up_consent_booking(db_session, booking_id: str) -> None:
    booking = await db_session.get(Booking, UUID(booking_id))
    assert booking is not None
    booking.follow_up_email_consent = True
    booking.follow_up_email_consent_at = datetime.now(UTC)
    await db_session.commit()


async def _enable_follow_up_consent_order(db_session, order_id: str) -> None:
    order = await db_session.get(Order, UUID(order_id))
    assert order is not None
    order.follow_up_email_consent = True
    order.follow_up_email_consent_at = datetime.now(UTC)
    await db_session.commit()


async def _clear_client_email_for_booking(db_session, booking_id: str) -> None:
    from app.models.client import Client

    booking = await db_session.get(Booking, UUID(booking_id))
    assert booking is not None
    client = await db_session.get(Client, booking.client_id)
    assert client is not None
    client.email = None
    await db_session.commit()


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_public_booking_consent_default_false(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "fu-consent-book-default")
    response = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/bookings",
        json=booking_payload(ctx["service_id"]),
    )
    assert response.status_code == 201
    booking_id = response.json()["id"]
    booking = await db_session.get(Booking, UUID(booking_id))
    assert booking is not None
    assert booking.follow_up_email_consent is False
    assert booking.follow_up_email_consent_at is None


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_public_booking_consent_true_stores_timestamp(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "fu-consent-book-true")
    payload = booking_payload(ctx["service_id"])
    payload["follow_up_email_consent"] = True
    before = datetime.now(UTC)
    response = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/bookings",
        json=payload,
    )
    assert response.status_code == 201
    booking = await db_session.get(Booking, UUID(response.json()["id"]))
    assert booking is not None
    assert booking.follow_up_email_consent is True
    assert booking.follow_up_email_consent_at is not None
    assert booking.follow_up_email_consent_at >= before


@pytest.mark.asyncio
async def test_public_order_consent_default_false(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_order_business(async_client, db_session, "fu-consent-order-default")
    response = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/orders",
        json=order_payload(ctx["service_id"]),
    )
    assert response.status_code == 201
    order = await db_session.get(Order, UUID(response.json()["id"]))
    assert order is not None
    assert order.follow_up_email_consent is False
    assert order.follow_up_email_consent_at is None


@pytest.mark.asyncio
async def test_public_order_consent_true_stores_timestamp(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_order_business(async_client, db_session, "fu-consent-order-true")
    payload = order_payload(ctx["service_id"])
    payload["follow_up_email_consent"] = True
    before = datetime.now(UTC)
    response = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/orders",
        json=payload,
    )
    assert response.status_code == 201
    order = await db_session.get(Order, UUID(response.json()["id"]))
    assert order is not None
    assert order.follow_up_email_consent is True
    assert order.follow_up_email_consent_at is not None
    assert order.follow_up_email_consent_at >= before


@pytest.mark.asyncio
async def test_send_review_request_email_booking_success(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_user_linked_booking(
        async_client,
        db_session,
        "rev-email-book-ok",
        status=BookingStatus.completed,
        starts_at=FUTURE_SLOT - timedelta(days=7),
    )
    await _enable_follow_up_consent_booking(db_session, ctx["booking_id"])

    mock_result = EmailSendResult(
        sent=True,
        dry_run=True,
        message=EMAIL_DRY_RUN,
        message_code=EMAIL_DRY_RUN,
    )
    with patch(
        "app.services.review_service.EmailService.send_email",
        return_value=mock_result,
    ) as send_mock:
        response = await async_client.post(
            f"/api/v1/businesses/{ctx['business_id']}/reviews/request-email",
            json={"booking_id": ctx["booking_id"]},
            headers=ctx["headers"],
        )
    assert response.status_code == 200
    body = response.json()
    assert body["message"] == "Review request sent."
    assert body["dry_run"] is True
    assert "smtp" not in str(body).lower()
    assert "password" not in str(body).lower()
    send_mock.assert_called_once()
    message = send_mock.call_args.args[0]
    assert "/review/" in message.text_body
    assert message.to_email == ctx["client_email"]


@pytest.mark.asyncio
async def test_send_review_request_email_booking_rejects_without_consent(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_user_linked_booking(
        async_client,
        db_session,
        "rev-email-book-no-consent",
        status=BookingStatus.completed,
        starts_at=FUTURE_SLOT - timedelta(days=7),
    )
    response = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/reviews/request-email",
        json={"booking_id": ctx["booking_id"]},
        headers=ctx["headers"],
    )
    assert response.status_code == 400
    assert response.json()["error"]["message"] == (
        "This client did not agree to follow-up emails."
    )


@pytest.mark.asyncio
async def test_send_review_request_email_booking_rejects_non_completed(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_user_linked_booking(
        async_client,
        db_session,
        "rev-email-book-pending",
        status=BookingStatus.pending,
    )
    await _enable_follow_up_consent_booking(db_session, ctx["booking_id"])
    response = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/reviews/request-email",
        json={"booking_id": ctx["booking_id"]},
        headers=ctx["headers"],
    )
    assert response.status_code == 400
    assert response.json()["error"]["message"] == "This booking is not completed yet."


@pytest.mark.asyncio
async def test_send_review_request_email_booking_rejects_other_business(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx_a = await _setup_user_linked_booking(
        async_client,
        db_session,
        "rev-email-biz-a",
        status=BookingStatus.completed,
        starts_at=FUTURE_SLOT - timedelta(days=7),
    )
    ctx_b = await _setup_user_linked_booking(
        async_client,
        db_session,
        "rev-email-biz-b",
        status=BookingStatus.completed,
        starts_at=FUTURE_SLOT - timedelta(days=7),
    )
    await _enable_follow_up_consent_booking(db_session, ctx_b["booking_id"])
    response = await async_client.post(
        f"/api/v1/businesses/{ctx_a['business_id']}/reviews/request-email",
        json={"booking_id": ctx_b["booking_id"]},
        headers=ctx_a["headers"],
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_send_review_request_email_booking_rejects_no_email(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_user_linked_booking(
        async_client,
        db_session,
        "rev-email-book-no-email",
        status=BookingStatus.completed,
        starts_at=FUTURE_SLOT - timedelta(days=7),
    )
    await _enable_follow_up_consent_booking(db_session, ctx["booking_id"])
    await _clear_client_email_for_booking(db_session, ctx["booking_id"])
    response = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/reviews/request-email",
        json={"booking_id": ctx["booking_id"]},
        headers=ctx["headers"],
    )
    assert response.status_code == 400
    assert response.json()["error"]["message"] == (
        "No email address is available for this client."
    )


@pytest.mark.asyncio
async def test_send_review_request_email_booking_rejects_already_reviewed(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_user_linked_booking(
        async_client,
        db_session,
        "rev-email-book-reviewed",
        status=BookingStatus.completed,
        starts_at=FUTURE_SLOT - timedelta(days=7),
    )
    await _enable_follow_up_consent_booking(db_session, ctx["booking_id"])
    review_resp = await async_client.post(
        f"/api/v1/me/bookings/{ctx['booking_id']}/review",
        json={"rating": 5},
        headers=ctx["client_headers"],
    )
    assert review_resp.status_code == 201
    response = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/reviews/request-email",
        json={"booking_id": ctx["booking_id"]},
        headers=ctx["headers"],
    )
    assert response.status_code == 400
    assert response.json()["error"]["message"] == (
        "A review already exists for this booking."
    )


@pytest.mark.asyncio
async def test_send_review_request_email_order_success(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_user_linked_order(
        async_client,
        db_session,
        "rev-email-order-ok",
        status=OrderStatus.submitted,
    )
    await _admin_set_order_status(async_client, ctx, OrderStatus.completed)
    await _enable_follow_up_consent_order(db_session, ctx["order_id"])

    mock_result = EmailSendResult(
        sent=True,
        dry_run=True,
        message=EMAIL_DRY_RUN,
        message_code=EMAIL_DRY_RUN,
    )
    with patch(
        "app.services.review_service.EmailService.send_email",
        return_value=mock_result,
    ) as send_mock:
        response = await async_client.post(
            f"/api/v1/businesses/{ctx['business_id']}/reviews/request-email",
            json={"order_id": ctx["order_id"]},
            headers=ctx["headers"],
        )
    assert response.status_code == 200
    assert response.json()["message"] == "Review request sent."
    send_mock.assert_called_once()
    assert "/review/" in send_mock.call_args.args[0].text_body


@pytest.mark.asyncio
async def test_send_review_request_email_order_rejects_without_consent(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_user_linked_order(
        async_client,
        db_session,
        "rev-email-order-no-consent",
        status=OrderStatus.submitted,
    )
    await _admin_set_order_status(async_client, ctx, OrderStatus.completed)
    response = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/reviews/request-email",
        json={"order_id": ctx["order_id"]},
        headers=ctx["headers"],
    )
    assert response.status_code == 400
    assert response.json()["error"]["message"] == (
        "This client did not agree to follow-up emails."
    )


@pytest.mark.asyncio
async def test_admin_booking_list_exposes_follow_up_consent(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_user_linked_booking(
        async_client,
        db_session,
        "rev-email-list-consent",
        status=BookingStatus.completed,
        starts_at=FUTURE_SLOT - timedelta(days=7),
    )
    await _enable_follow_up_consent_booking(db_session, ctx["booking_id"])
    response = await async_client.get(
        f"/api/v1/businesses/{ctx['business_id']}/bookings",
        headers=ctx["headers"],
    )
    assert response.status_code == 200
    items = response.json()["data"]
    match = next(item for item in items if item["id"] == ctx["booking_id"])
    assert match["follow_up_email_consent"] is True
