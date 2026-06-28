import uuid
from datetime import UTC, datetime
from unittest.mock import MagicMock

from app.models.booking import Booking
from app.models.business import Business
from app.models.client import Client
from app.models.enums import (
    BookingStatus,
    BusinessStatus,
    ClientSource,
    OperatingMode,
    OrderMessageSenderType,
    OrderStatus,
    PriceType,
    ServiceType,
)
from app.models.order import Order
from app.models.order_message import OrderMessage
from app.models.service import Service
from app.services.email_notification_service import (
    EmailNotificationService,
    is_email_notifications_enabled_for_business,
)
from app.services.email_service import EmailSendResult


def _mock_email_service() -> MagicMock:
    mock = MagicMock()
    mock.send_email.return_value = EmailSendResult(
        sent=True,
        dry_run=True,
        message="Email dry-run (not sent)",
    )
    return mock


def _business(*, contact_email: str = "owner@example.com", settings: dict | None = None) -> Business:
    return Business(
        id=uuid.uuid4(),
        name="Demo Business",
        slug="demo-business",
        contact_email=contact_email,
        timezone="UTC",
        operating_mode=OperatingMode.both,
        status=BusinessStatus.active,
        settings=settings or {"notification_email_enabled": True},
    )


def _client(*, email: str | None = "client@example.com") -> Client:
    return Client(
        id=uuid.uuid4(),
        business_id=uuid.uuid4(),
        full_name="Jane Doe",
        email=email,
        source=ClientSource.guest,
    )


def _service() -> Service:
    return Service(
        id=uuid.uuid4(),
        business_id=uuid.uuid4(),
        name="Arabic Lesson",
        type=ServiceType.booking,
        duration_minutes=60,
        currency="USD",
        price_type=PriceType.fixed,
        is_active=True,
        sort_order=0,
    )


def _order_service() -> Service:
    return Service(
        id=uuid.uuid4(),
        business_id=uuid.uuid4(),
        name="Build Bot",
        type=ServiceType.order,
        currency="USD",
        price_type=PriceType.quote,
        is_active=True,
        sort_order=0,
    )


def _booking(business: Business, client: Client, service: Service) -> Booking:
    booking = Booking(
        id=uuid.uuid4(),
        business_id=business.id,
        service_id=service.id,
        client_id=client.id,
        reference="BKG-2026-0001",
        starts_at=datetime(2026, 7, 1, 10, 0, tzinfo=UTC),
        ends_at=datetime(2026, 7, 1, 11, 0, tzinfo=UTC),
        status=BookingStatus.pending,
    )
    booking.client = client
    booking.service = service
    return booking


def _order(business: Business, client: Client, service: Service) -> Order:
    order = Order(
        id=uuid.uuid4(),
        business_id=business.id,
        service_id=service.id,
        client_id=client.id,
        reference="ORD-2026-0001",
        status=OrderStatus.submitted,
        form_data={"brief": "Demo"},
    )
    order.client = client
    order.service = service
    return order


def test_notification_email_enabled_defaults_true() -> None:
    business = _business(settings={})
    assert is_email_notifications_enabled_for_business(business) is True


def test_notification_email_enabled_false_skips_sending() -> None:
    business = _business(settings={"notification_email_enabled": False})
    mock_email = _mock_email_service()
    service = EmailNotificationService(email_service=mock_email)
    booking = _booking(business, _client(), _service())

    service.notify_admin_booking_created(booking, business=business)

    mock_email.send_email.assert_not_called()


def test_missing_recipient_skips_safely() -> None:
    business = _business(contact_email=None)
    mock_email = _mock_email_service()
    service = EmailNotificationService(email_service=mock_email)
    booking = _booking(business, _client(), _service())

    service.notify_admin_booking_created(booking, business=business)

    mock_email.send_email.assert_not_called()


def test_admin_booking_created_sends_to_business_contact() -> None:
    business = _business(contact_email="admin@example.com")
    mock_email = _mock_email_service()
    service = EmailNotificationService(email_service=mock_email)
    booking = _booking(business, _client(), _service())

    service.notify_admin_booking_created(booking, business=business)

    mock_email.send_email.assert_called_once()
    message = mock_email.send_email.call_args[0][0]
    assert message.to_email == "admin@example.com"
    assert "BKG-2026-0001" in message.subject


def test_client_booking_confirmed_sends_to_client() -> None:
    business = _business()
    mock_email = _mock_email_service()
    service = EmailNotificationService(email_service=mock_email)
    booking = _booking(business, _client(email="guest@example.com"), _service())
    booking.status = BookingStatus.confirmed

    service.notify_client_booking_confirmed(booking, business=business)

    message = mock_email.send_email.call_args[0][0]
    assert message.to_email == "guest@example.com"
    assert "confirmed" in message.subject.lower()


def test_client_booking_cancelled_sends_to_client() -> None:
    business = _business()
    mock_email = _mock_email_service()
    service = EmailNotificationService(email_service=mock_email)
    booking = _booking(business, _client(email="guest@example.com"), _service())

    service.notify_client_booking_cancelled(booking, business=business)

    message = mock_email.send_email.call_args[0][0]
    assert message.to_email == "guest@example.com"
    assert "cancelled" in message.subject.lower()


def test_admin_order_submitted_sends_to_business() -> None:
    business = _business(contact_email="admin@example.com")
    mock_email = _mock_email_service()
    service = EmailNotificationService(email_service=mock_email)
    order = _order(business, _client(), _order_service())

    service.notify_admin_order_submitted(order, business=business)

    message = mock_email.send_email.call_args[0][0]
    assert message.to_email == "admin@example.com"
    assert "ORD-2026-0001" in message.subject


def test_client_order_status_changed_sends_to_client() -> None:
    business = _business()
    mock_email = _mock_email_service()
    service = EmailNotificationService(email_service=mock_email)
    order = _order(business, _client(email="client@example.com"), _order_service())

    service.notify_client_order_status_changed(
        order,
        OrderStatus.accepted,
        business=business,
    )

    message = mock_email.send_email.call_args[0][0]
    assert message.to_email == "client@example.com"
    assert "Accepted" in message.text_body


def test_admin_order_message_notifies_client() -> None:
    business = _business()
    mock_email = _mock_email_service()
    service = EmailNotificationService(email_service=mock_email)
    order = _order(business, _client(email="client@example.com"), _order_service())
    message = OrderMessage(
        id=uuid.uuid4(),
        order_id=order.id,
        business_id=business.id,
        sender_type=OrderMessageSenderType.admin,
        body="We received your request.",
    )

    service.notify_order_message_received(order, message, business=business)

    sent = mock_email.send_email.call_args[0][0]
    assert sent.to_email == "client@example.com"
    assert "message" in sent.subject.lower()


def test_client_order_message_notifies_admin() -> None:
    business = _business(contact_email="admin@example.com")
    mock_email = _mock_email_service()
    service = EmailNotificationService(email_service=mock_email)
    order = _order(business, _client(), _order_service())
    message = OrderMessage(
        id=uuid.uuid4(),
        order_id=order.id,
        business_id=business.id,
        sender_type=OrderMessageSenderType.client,
        body="Any update on my request?",
    )

    service.notify_order_message_received(order, message, business=business)

    sent = mock_email.send_email.call_args[0][0]
    assert sent.to_email == "admin@example.com"
    assert "Client message" in sent.subject


def test_email_send_exception_is_swallowed() -> None:
    business = _business()
    mock_email = _mock_email_service()
    mock_email.send_email.side_effect = RuntimeError("SMTP down")
    service = EmailNotificationService(email_service=mock_email)
    booking = _booking(business, _client(), _service())

    service.notify_admin_booking_created(booking, business=business)

    mock_email.send_email.assert_called_once()
