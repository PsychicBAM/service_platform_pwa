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


# --- Automatic review request emails ---


async def _set_auto_review_settings(
    async_client: AsyncClient,
    ctx: dict,
    *,
    enabled: bool,
    delay_minutes: int = 1440,
) -> None:
    response = await async_client.patch(
        f"/api/v1/businesses/{ctx['business_id']}",
        json={
            "settings": {
                "auto_review_request_enabled": enabled,
                "auto_review_request_delay_minutes": delay_minutes,
            }
        },
        headers=ctx["headers"],
    )
    assert response.status_code == 200
    body = response.json()
    assert body["settings"]["auto_review_request_enabled"] is enabled
    assert body["settings"]["auto_review_request_delay_minutes"] == delay_minutes


async def _complete_booking(async_client: AsyncClient, ctx: dict) -> None:
    confirm = await async_client.patch(
        f"/api/v1/businesses/{ctx['business_id']}/bookings/{ctx['booking_id']}",
        json={"status": "confirmed"},
        headers=ctx["headers"],
    )
    assert confirm.status_code == 200
    complete = await async_client.patch(
        f"/api/v1/businesses/{ctx['business_id']}/bookings/{ctx['booking_id']}",
        json={"status": "completed"},
        headers=ctx["headers"],
    )
    assert complete.status_code == 200


def test_auto_review_settings_defaults() -> None:
    from app.repositories.business_repository import DEFAULT_BUSINESS_SETTINGS
    from app.schemas.business import BusinessSettingsRead

    settings = BusinessSettingsRead.from_settings({})
    assert settings.auto_review_request_enabled is False
    assert settings.auto_review_request_delay_minutes == 1440
    assert DEFAULT_BUSINESS_SETTINGS["auto_review_request_enabled"] is False
    assert DEFAULT_BUSINESS_SETTINGS["auto_review_request_delay_minutes"] == 1440


@pytest.mark.asyncio
async def test_admin_can_update_auto_review_settings_persisted(
    async_client: AsyncClient,
    db_session,
    db_engine,
) -> None:
    from app.models.business import Business
    from tests.conftest import _session_factory

    ctx = await _setup_user_linked_booking(
        async_client,
        db_session,
        "auto-rev-settings",
        status=BookingStatus.pending,
    )
    await _set_auto_review_settings(
        async_client,
        ctx,
        enabled=True,
        delay_minutes=60,
    )

    factory = _session_factory(db_engine)
    async with factory() as verify_session:
        business = await verify_session.get(Business, UUID(ctx["business_id"]))
        assert business is not None
        assert business.settings["auto_review_request_enabled"] is True
        assert business.settings["auto_review_request_delay_minutes"] == 60


@pytest.mark.asyncio
async def test_complete_booking_auto_disabled_does_not_schedule(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_user_linked_booking(
        async_client,
        db_session,
        "auto-rev-off",
        status=BookingStatus.pending,
        starts_at=FUTURE_SLOT - timedelta(days=7),
    )
    await _enable_follow_up_consent_booking(db_session, ctx["booking_id"])
    await _set_auto_review_settings(async_client, ctx, enabled=False, delay_minutes=0)
    await _complete_booking(async_client, ctx)

    booking = await db_session.get(Booking, UUID(ctx["booking_id"]))
    assert booking is not None
    await db_session.refresh(booking)
    assert booking.review_request_email_due_at is None
    assert booking.review_request_email_sent_at is None


@pytest.mark.asyncio
async def test_complete_booking_auto_enabled_schedules_due_at(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_user_linked_booking(
        async_client,
        db_session,
        "auto-rev-due",
        status=BookingStatus.pending,
        starts_at=FUTURE_SLOT - timedelta(days=7),
    )
    await _enable_follow_up_consent_booking(db_session, ctx["booking_id"])
    await _set_auto_review_settings(
        async_client,
        ctx,
        enabled=True,
        delay_minutes=1440,
    )
    before = datetime.now(UTC)
    await _complete_booking(async_client, ctx)

    booking = await db_session.get(Booking, UUID(ctx["booking_id"]))
    assert booking is not None
    await db_session.refresh(booking)
    assert booking.review_request_email_due_at is not None
    assert booking.review_request_email_sent_at is None
    assert booking.review_request_email_due_at >= before + timedelta(minutes=1430)
    assert booking.review_request_email_due_at <= before + timedelta(minutes=1450)


@pytest.mark.asyncio
async def test_complete_booking_without_consent_not_scheduled(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_user_linked_booking(
        async_client,
        db_session,
        "auto-rev-no-consent",
        status=BookingStatus.pending,
        starts_at=FUTURE_SLOT - timedelta(days=7),
    )
    await _set_auto_review_settings(async_client, ctx, enabled=True, delay_minutes=0)
    await _complete_booking(async_client, ctx)
    booking = await db_session.get(Booking, UUID(ctx["booking_id"]))
    assert booking is not None
    await db_session.refresh(booking)
    assert booking.review_request_email_due_at is None


@pytest.mark.asyncio
async def test_complete_booking_without_email_not_scheduled(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_user_linked_booking(
        async_client,
        db_session,
        "auto-rev-no-email",
        status=BookingStatus.pending,
        starts_at=FUTURE_SLOT - timedelta(days=7),
    )
    await _enable_follow_up_consent_booking(db_session, ctx["booking_id"])
    await _clear_client_email_for_booking(db_session, ctx["booking_id"])
    await _set_auto_review_settings(async_client, ctx, enabled=True, delay_minutes=60)
    await _complete_booking(async_client, ctx)
    booking = await db_session.get(Booking, UUID(ctx["booking_id"]))
    assert booking is not None
    await db_session.refresh(booking)
    assert booking.review_request_email_due_at is None


@pytest.mark.asyncio
async def test_due_processor_sends_eligible_booking_once(
    async_client: AsyncClient,
    db_session,
) -> None:
    from app.services.email_service import EMAIL_DRY_RUN
    from app.services.review_service import ReviewService

    ctx = await _setup_user_linked_booking(
        async_client,
        db_session,
        "auto-rev-process",
        status=BookingStatus.pending,
        starts_at=FUTURE_SLOT - timedelta(days=7),
    )
    await _enable_follow_up_consent_booking(db_session, ctx["booking_id"])
    await _set_auto_review_settings(
        async_client,
        ctx,
        enabled=True,
        delay_minutes=1440,
    )
    await _complete_booking(async_client, ctx)

    booking = await db_session.get(Booking, UUID(ctx["booking_id"]))
    assert booking is not None
    booking.review_request_email_due_at = datetime.now(UTC) - timedelta(minutes=1)
    await db_session.commit()

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
        first = await ReviewService(db_session).process_due_review_request_emails()
        second = await ReviewService(db_session).process_due_review_request_emails()

    assert first == 1
    assert second == 0
    send_mock.assert_called_once()
    assert "/review/" in send_mock.call_args.args[0].text_body

    await db_session.refresh(booking)
    assert booking.review_request_email_sent_at is not None


@pytest.mark.asyncio
async def test_due_processor_skips_already_reviewed_booking(
    async_client: AsyncClient,
    db_session,
) -> None:
    from app.services.review_service import ReviewService

    ctx = await _setup_user_linked_booking(
        async_client,
        db_session,
        "auto-rev-reviewed",
        status=BookingStatus.completed,
        starts_at=FUTURE_SLOT - timedelta(days=7),
    )
    await _enable_follow_up_consent_booking(db_session, ctx["booking_id"])
    await _set_auto_review_settings(async_client, ctx, enabled=True, delay_minutes=0)

    booking = await db_session.get(Booking, UUID(ctx["booking_id"]))
    assert booking is not None
    booking.review_request_email_due_at = datetime.now(UTC) - timedelta(minutes=1)
    await db_session.commit()

    review_resp = await async_client.post(
        f"/api/v1/me/bookings/{ctx['booking_id']}/review",
        json={"rating": 5},
        headers=ctx["client_headers"],
    )
    assert review_resp.status_code == 201

    with patch(
        "app.services.review_service.EmailService.send_email",
    ) as send_mock:
        sent = await ReviewService(db_session).process_due_review_request_emails()
    assert sent == 0
    send_mock.assert_not_called()


@pytest.mark.asyncio
async def test_manual_send_sets_sent_at_and_blocks_auto(
    async_client: AsyncClient,
    db_session,
) -> None:
    from app.services.review_service import ReviewService

    ctx = await _setup_user_linked_booking(
        async_client,
        db_session,
        "auto-rev-manual",
        status=BookingStatus.completed,
        starts_at=FUTURE_SLOT - timedelta(days=7),
    )
    await _enable_follow_up_consent_booking(db_session, ctx["booking_id"])
    await _set_auto_review_settings(async_client, ctx, enabled=True, delay_minutes=0)

    mock_result = EmailSendResult(
        sent=True,
        dry_run=True,
        message=EMAIL_DRY_RUN,
        message_code=EMAIL_DRY_RUN,
    )
    with patch(
        "app.services.review_service.EmailService.send_email",
        return_value=mock_result,
    ):
        response = await async_client.post(
            f"/api/v1/businesses/{ctx['business_id']}/reviews/request-email",
            json={"booking_id": ctx["booking_id"]},
            headers=ctx["headers"],
        )
    assert response.status_code == 200

    booking = await db_session.get(Booking, UUID(ctx["booking_id"]))
    assert booking is not None
    await db_session.refresh(booking)
    assert booking.review_request_email_sent_at is not None

    booking.review_request_email_due_at = datetime.now(UTC) - timedelta(minutes=1)
    await db_session.commit()

    with patch("app.services.review_service.EmailService.send_email") as send_mock:
        sent = await ReviewService(db_session).process_due_review_request_emails()
    assert sent == 0
    send_mock.assert_not_called()


@pytest.mark.asyncio
async def test_auto_review_order_schedules_and_processor_sends(
    async_client: AsyncClient,
    db_session,
) -> None:
    from app.services.review_service import ReviewService

    ctx = await _setup_user_linked_order(
        async_client,
        db_session,
        "auto-rev-order",
        status=OrderStatus.submitted,
    )
    await _enable_follow_up_consent_order(db_session, ctx["order_id"])
    await _set_auto_review_settings(
        async_client,
        ctx,
        enabled=True,
        delay_minutes=1440,
    )
    await _admin_set_order_status(async_client, ctx, OrderStatus.completed)

    order = await db_session.get(Order, UUID(ctx["order_id"]))
    assert order is not None
    await db_session.refresh(order)
    assert order.review_request_email_due_at is not None
    assert order.review_request_email_sent_at is None

    order.review_request_email_due_at = datetime.now(UTC) - timedelta(minutes=1)
    await db_session.commit()

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
        first = await ReviewService(db_session).process_due_review_request_emails()
        second = await ReviewService(db_session).process_due_review_request_emails()
    assert first == 1
    assert second == 0
    send_mock.assert_called_once()
    await db_session.refresh(order)
    assert order.review_request_email_sent_at is not None


@pytest.mark.asyncio
async def test_send_failure_stores_safe_last_error(
    async_client: AsyncClient,
    db_session,
) -> None:
    from app.services.email_service import EMAIL_SEND_FAILED
    from app.services.review_service import ReviewService

    ctx = await _setup_user_linked_booking(
        async_client,
        db_session,
        "auto-rev-fail",
        status=BookingStatus.completed,
        starts_at=FUTURE_SLOT - timedelta(days=7),
    )
    await _enable_follow_up_consent_booking(db_session, ctx["booking_id"])
    await _set_auto_review_settings(async_client, ctx, enabled=True, delay_minutes=0)

    booking = await db_session.get(Booking, UUID(ctx["booking_id"]))
    assert booking is not None
    booking.review_request_email_due_at = datetime.now(UTC) - timedelta(minutes=1)
    await db_session.commit()

    fail_result = EmailSendResult(
        sent=False,
        dry_run=False,
        message=EMAIL_SEND_FAILED,
        message_code=EMAIL_SEND_FAILED,
    )
    with patch(
        "app.services.review_service.EmailService.send_email",
        return_value=fail_result,
    ):
        sent = await ReviewService(db_session).process_due_review_request_emails()
    assert sent == 0
    await db_session.refresh(booking)
    assert booking.review_request_email_sent_at is None
    assert booking.review_request_email_last_error == "Email delivery failed."
    assert "smtp" not in (booking.review_request_email_last_error or "").lower()
    assert "password" not in (booking.review_request_email_last_error or "").lower()
    assert "token" not in (booking.review_request_email_last_error or "").lower()
