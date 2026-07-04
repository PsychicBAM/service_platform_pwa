import uuid
from datetime import UTC, datetime
from unittest.mock import patch

import pytest
from httpx import AsyncClient
from sqlalchemy import update

from app.main import app
from app.models.business import Business
from app.models.enums import OrderStatus
from tests.test_bookings_availability_blocking import FIXED_NOW, _setup_booking_business
from tests.test_me_orders_routes import _setup_user_linked_order
from tests.test_public_booking_create import booking_payload
from tests.test_public_order_create import _setup_order_business, order_payload


@pytest.fixture
def capture_send_email():
    sent: list = []

    def _send(message):
        sent.append(message)
        from app.services.email_service import EmailSendResult

        return EmailSendResult(
            sent=True, dry_run=True, message="EMAIL_DRY_RUN", message_code="EMAIL_DRY_RUN"
        )

    with patch(
        "app.services.email_notification_service.EmailService.send_email",
        side_effect=_send,
    ) as mock_send:
        yield sent, mock_send


async def _set_business_contact_email(
    db_session,
    business_id: str,
    contact_email: str,
) -> None:
    await db_session.execute(
        update(Business)
        .where(Business.id == uuid.UUID(business_id))
        .values(contact_email=contact_email)
    )
    await db_session.commit()


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_public_booking_creation_triggers_admin_email(
    _mock_now,
    async_client: AsyncClient,
    db_session,
    capture_send_email,
) -> None:
    sent, mock_send = capture_send_email
    ctx = await _setup_booking_business(async_client, db_session, "email-book-create")
    await _set_business_contact_email(db_session, ctx["business_id"], "owner@example.com")

    response = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/bookings",
        json=booking_payload(ctx["service_id"]),
    )
    assert response.status_code == 201
    assert mock_send.called
    assert any("owner@example.com" == msg.to_email for msg in sent)
    assert any("New booking" in msg.subject for msg in sent)


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_admin_booking_confirm_triggers_client_email(
    _mock_now,
    async_client: AsyncClient,
    db_session,
    capture_send_email,
) -> None:
    sent, mock_send = capture_send_email
    ctx = await _setup_booking_business(async_client, db_session, "email-book-confirm")
    booking = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/bookings",
        json=booking_payload(ctx["service_id"], email="guest@example.com"),
    )
    assert booking.status_code == 201
    booking_id = booking.json()["id"]
    sent.clear()
    mock_send.reset_mock()

    response = await async_client.patch(
        f"/api/v1/businesses/{ctx['business_id']}/bookings/{booking_id}",
        json={"status": "confirmed"},
        headers=ctx["headers"],
    )
    assert response.status_code == 200
    assert mock_send.called
    assert any(msg.to_email == "guest@example.com" for msg in sent)
    assert any("confirmed" in msg.subject.lower() for msg in sent)


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_admin_booking_cancel_triggers_client_email(
    _mock_now,
    async_client: AsyncClient,
    db_session,
    capture_send_email,
) -> None:
    sent, mock_send = capture_send_email
    ctx = await _setup_booking_business(async_client, db_session, "email-book-cancel")
    booking = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/bookings",
        json=booking_payload(ctx["service_id"], email="guest@example.com"),
    )
    assert booking.status_code == 201
    booking_id = booking.json()["id"]
    sent.clear()
    mock_send.reset_mock()

    response = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/bookings/{booking_id}/cancel",
        json={"reason": "Schedule change"},
        headers=ctx["headers"],
    )
    assert response.status_code == 200
    assert mock_send.called
    assert any(msg.to_email == "guest@example.com" for msg in sent)
    assert any("cancelled" in msg.subject.lower() for msg in sent)


@pytest.mark.asyncio
async def test_public_order_creation_triggers_admin_email(
    async_client: AsyncClient,
    db_session,
    capture_send_email,
) -> None:
    sent, mock_send = capture_send_email
    ctx = await _setup_order_business(async_client, db_session, "email-order-create")
    await _set_business_contact_email(db_session, ctx["business_id"], "owner@example.com")

    response = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/orders",
        json=order_payload(ctx["service_id"]),
    )
    assert response.status_code == 201
    assert mock_send.called
    assert any(msg.to_email == "owner@example.com" for msg in sent)
    assert any("New request" in msg.subject for msg in sent)


@pytest.mark.asyncio
async def test_admin_order_accept_triggers_client_status_email(
    async_client: AsyncClient,
    db_session,
    capture_send_email,
) -> None:
    sent, mock_send = capture_send_email
    ctx = await _setup_order_business(async_client, db_session, "email-order-accept")
    order = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/orders",
        json=order_payload(ctx["service_id"], email="client@example.com"),
    )
    assert order.status_code == 201
    order_id = order.json()["id"]
    sent.clear()
    mock_send.reset_mock()

    response = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/orders/{order_id}/accept",
        json={"start_work": False},
        headers=ctx["headers"],
    )
    assert response.status_code == 200
    assert mock_send.called
    assert any(msg.to_email == "client@example.com" for msg in sent)


@pytest.mark.asyncio
async def test_admin_order_decline_triggers_client_status_email(
    async_client: AsyncClient,
    db_session,
    capture_send_email,
) -> None:
    sent, mock_send = capture_send_email
    ctx = await _setup_order_business(async_client, db_session, "email-order-decline")
    order = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/orders",
        json=order_payload(ctx["service_id"], email="client@example.com"),
    )
    order_id = order.json()["id"]
    sent.clear()
    mock_send.reset_mock()

    response = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/orders/{order_id}/decline",
        json={"decline_reason": "Not a fit"},
        headers=ctx["headers"],
    )
    assert response.status_code == 200
    assert mock_send.called
    assert any("Declined" in msg.text_body for msg in sent)


@pytest.mark.asyncio
async def test_admin_order_message_triggers_client_email(
    async_client: AsyncClient,
    db_session,
    capture_send_email,
) -> None:
    sent, mock_send = capture_send_email
    ctx = await _setup_user_linked_order(async_client, db_session, "email-msg-admin")
    sent.clear()
    mock_send.reset_mock()

    response = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/orders/{ctx['order_id']}/messages",
        json={"body": "Thanks for your request"},
        headers=ctx["headers"],
    )
    assert response.status_code == 201
    assert mock_send.called
    assert any(msg.to_email == ctx["client_email"] for msg in sent)


@pytest.mark.asyncio
async def test_client_order_message_triggers_admin_email(
    async_client: AsyncClient,
    db_session,
    capture_send_email,
) -> None:
    sent, mock_send = capture_send_email
    ctx = await _setup_user_linked_order(async_client, db_session, "email-msg-client")
    await _set_business_contact_email(db_session, ctx["business_id"], "owner@example.com")
    sent.clear()
    mock_send.reset_mock()

    response = await async_client.post(
        f"/api/v1/me/orders/{ctx['order_id']}/messages",
        json={"body": "Any update?"},
        headers=ctx["client_headers"],
    )
    assert response.status_code == 201
    assert mock_send.called
    assert any(msg.to_email == "owner@example.com" for msg in sent)


@pytest.mark.asyncio
async def test_admin_order_complete_triggers_client_status_email(
    async_client: AsyncClient,
    db_session,
    capture_send_email,
) -> None:
    sent, mock_send = capture_send_email
    ctx = await _setup_order_business(async_client, db_session, "email-order-complete")
    order = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/orders",
        json=order_payload(ctx["service_id"], email="client@example.com"),
    )
    order_id = order.json()["id"]
    await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/orders/{order_id}/accept",
        json={"start_work": True},
        headers=ctx["headers"],
    )
    sent.clear()
    mock_send.reset_mock()

    response = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/orders/{order_id}/complete",
        headers=ctx["headers"],
    )
    assert response.status_code == 200
    assert mock_send.called
    assert any("Completed" in msg.text_body for msg in sent)


@pytest.mark.asyncio
async def test_admin_order_cancel_triggers_client_status_email(
    async_client: AsyncClient,
    db_session,
    capture_send_email,
) -> None:
    sent, mock_send = capture_send_email
    ctx = await _setup_order_business(async_client, db_session, "email-order-cancel")
    order = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/orders",
        json=order_payload(ctx["service_id"], email="client@example.com"),
    )
    order_id = order.json()["id"]
    sent.clear()
    mock_send.reset_mock()

    response = await async_client.post(
        f"/api/v1/businesses/{ctx['business_id']}/orders/{order_id}/cancel",
        json={"reason": "No longer needed"},
        headers=ctx["headers"],
    )
    assert response.status_code == 200
    assert mock_send.called
    assert any("Cancelled" in msg.text_body for msg in sent)


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_email_failure_does_not_break_booking_creation(
    _mock_now,
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _setup_booking_business(async_client, db_session, "email-book-fail")
    with patch(
        "app.services.email_notification_service.EmailService.send_email",
        side_effect=RuntimeError("SMTP unavailable"),
    ):
        response = await async_client.post(
            f"/api/v1/public/b/{ctx['slug']}/bookings",
            json=booking_payload(ctx["service_id"]),
        )
    assert response.status_code == 201


@pytest.mark.asyncio
@patch("app.services.email_notification_service.EmailService.send_email")
async def test_email_disabled_does_not_break_order_creation(
    mock_send,
    async_client: AsyncClient,
    db_session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.config import get_settings

    monkeypatch.setenv("EMAIL_ENABLED", "false")
    get_settings.cache_clear()
    mock_send.return_value = __import__(
        "app.services.email_service", fromlist=["EmailSendResult"]
    ).EmailSendResult(sent=False, dry_run=True, message="EMAIL_DISABLED", message_code="EMAIL_DISABLED")

    ctx = await _setup_order_business(async_client, db_session, "email-order-disabled")
    response = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/orders",
        json=order_payload(ctx["service_id"]),
    )
    assert response.status_code == 201
    get_settings.cache_clear()


@pytest.mark.asyncio
@patch("app.services.availability_service._now_in_tz", return_value=FIXED_NOW)
async def test_notification_email_disabled_skips_admin_booking_email(
    _mock_now,
    async_client: AsyncClient,
    db_session,
    capture_send_email,
) -> None:
    sent, mock_send = capture_send_email
    ctx = await _setup_booking_business(async_client, db_session, "email-book-off")
    await _set_business_contact_email(db_session, ctx["business_id"], "owner@example.com")
    business = await db_session.get(Business, uuid.UUID(ctx["business_id"]))
    assert business is not None
    settings = dict(business.settings or {})
    settings["notification_email_enabled"] = False
    await db_session.execute(
        update(Business)
        .where(Business.id == uuid.UUID(ctx["business_id"]))
        .values(settings=settings)
    )
    await db_session.commit()

    mock_send.reset_mock()
    sent.clear()

    response = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/bookings",
        json=booking_payload(ctx["service_id"]),
    )
    assert response.status_code == 201
    assert not mock_send.called
    assert sent == []
