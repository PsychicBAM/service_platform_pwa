from __future__ import annotations

import logging
from zoneinfo import ZoneInfo

from app.models.booking import Booking
from app.models.business import Business
from app.models.client import Client
from app.models.enums import OrderMessageSenderType, OrderStatus
from app.models.order import Order
from app.models.order_message import OrderMessage
from app.repositories.business_repository import DEFAULT_BUSINESS_SETTINGS
from app.services.email_service import EmailService
from app.services.email_templates import (
    build_admin_booking_created_email,
    build_admin_order_message_email,
    build_admin_order_submitted_email,
    build_client_booking_cancelled_email,
    build_client_booking_confirmed_email,
    build_client_order_message_email,
    build_client_order_status_changed_email,
)
from app.utils.text import trim_message_preview

logger = logging.getLogger(__name__)


def is_email_notifications_enabled_for_business(business: Business) -> bool:
    settings = business.settings or {}
    if "notification_email_enabled" not in settings:
        return bool(DEFAULT_BUSINESS_SETTINGS["notification_email_enabled"])
    return bool(settings.get("notification_email_enabled"))


def _normalize_email(value: str | None) -> str | None:
    if not value:
        return None
    stripped = value.strip()
    return stripped.lower() if stripped else None


def _business_contact_email(business: Business) -> str | None:
    return _normalize_email(business.contact_email)


def _client_email(client: Client) -> str | None:
    return _normalize_email(client.email)


def _resolve_business(booking_or_order: Booking | Order, business: Business | None) -> Business | None:
    if business is not None:
        return business
    loaded = getattr(booking_or_order, "business", None)
    return loaded if isinstance(loaded, Business) else None


def _format_starts_at(booking: Booking, business: Business) -> str:
    tz = ZoneInfo(business.timezone)
    local = booking.starts_at.astimezone(tz)
    return local.strftime("%Y-%m-%d %H:%M %Z")


def _format_order_status(status: OrderStatus) -> str:
    return status.value.replace("_", " ").title()


class EmailNotificationService:
    def __init__(self, email_service: EmailService | None = None) -> None:
        self.email_service = email_service or EmailService()

    def notify_admin_booking_created(
        self,
        booking: Booking,
        *,
        business: Business | None = None,
    ) -> None:
        biz = _resolve_business(booking, business)
        if biz is None or not is_email_notifications_enabled_for_business(biz):
            return
        to_email = _business_contact_email(biz)
        if to_email is None:
            return
        if booking.service is None or booking.client is None:
            return

        message = build_admin_booking_created_email(
            to_email=to_email,
            business_name=biz.name,
            service_name=booking.service.name,
            reference=booking.reference,
            client_name=booking.client.full_name,
            starts_at_label=_format_starts_at(booking, biz),
            status_label=booking.status.value.replace("_", " ").title(),
        )
        self._safe_send("booking_created_admin", booking.reference, message)

    def notify_client_booking_confirmed(
        self,
        booking: Booking,
        *,
        business: Business | None = None,
    ) -> None:
        biz = _resolve_business(booking, business)
        if biz is None or not is_email_notifications_enabled_for_business(biz):
            return
        if booking.client is None or booking.service is None:
            return
        to_email = _client_email(booking.client)
        if to_email is None:
            return

        message = build_client_booking_confirmed_email(
            to_email=to_email,
            recipient_name=booking.client.full_name,
            business_name=biz.name,
            service_name=booking.service.name,
            reference=booking.reference,
            starts_at_label=_format_starts_at(booking, biz),
        )
        self._safe_send("booking_confirmed_client", booking.reference, message)

    def notify_client_booking_cancelled(
        self,
        booking: Booking,
        *,
        business: Business | None = None,
    ) -> None:
        biz = _resolve_business(booking, business)
        if biz is None or not is_email_notifications_enabled_for_business(biz):
            return
        if booking.client is None or booking.service is None:
            return
        to_email = _client_email(booking.client)
        if to_email is None:
            return

        message = build_client_booking_cancelled_email(
            to_email=to_email,
            recipient_name=booking.client.full_name,
            business_name=biz.name,
            service_name=booking.service.name,
            reference=booking.reference,
            starts_at_label=_format_starts_at(booking, biz),
        )
        self._safe_send("booking_cancelled_client", booking.reference, message)

    def notify_admin_order_submitted(
        self,
        order: Order,
        *,
        business: Business | None = None,
    ) -> None:
        biz = _resolve_business(order, business)
        if biz is None or not is_email_notifications_enabled_for_business(biz):
            return
        to_email = _business_contact_email(biz)
        if to_email is None:
            return
        if order.service is None or order.client is None:
            return

        message = build_admin_order_submitted_email(
            to_email=to_email,
            business_name=biz.name,
            service_name=order.service.name,
            reference=order.reference,
            client_name=order.client.full_name,
        )
        self._safe_send("order_submitted_admin", order.reference, message)

    def notify_client_order_status_changed(
        self,
        order: Order,
        event_type: OrderStatus,
        *,
        business: Business | None = None,
    ) -> None:
        biz = _resolve_business(order, business)
        if biz is None or not is_email_notifications_enabled_for_business(biz):
            return
        if order.client is None or order.service is None:
            return
        to_email = _client_email(order.client)
        if to_email is None:
            return

        message = build_client_order_status_changed_email(
            to_email=to_email,
            recipient_name=order.client.full_name,
            business_name=biz.name,
            service_name=order.service.name,
            reference=order.reference,
            status_label=_format_order_status(event_type),
        )
        self._safe_send("order_status_client", order.reference, message)

    def notify_order_message_received(
        self,
        order: Order,
        message: OrderMessage,
        *,
        business: Business | None = None,
    ) -> None:
        biz = _resolve_business(order, business)
        if biz is None or not is_email_notifications_enabled_for_business(biz):
            return
        if order.client is None:
            return

        preview = trim_message_preview(message.body)

        if message.sender_type == OrderMessageSenderType.admin:
            to_email = _client_email(order.client)
            if to_email is None:
                return
            email = build_client_order_message_email(
                to_email=to_email,
                recipient_name=order.client.full_name,
                business_name=biz.name,
                reference=order.reference,
                message_preview=preview,
            )
            self._safe_send("order_message_client", order.reference, email)
            return

        if message.sender_type == OrderMessageSenderType.client:
            to_email = _business_contact_email(biz)
            if to_email is None:
                return
            email = build_admin_order_message_email(
                to_email=to_email,
                business_name=biz.name,
                reference=order.reference,
                client_name=order.client.full_name,
                message_preview=preview,
            )
            self._safe_send("order_message_admin", order.reference, email)

    def _safe_send(self, event: str, reference: str, message) -> None:
        try:
            result = self.email_service.send_email(message)
            if result.dry_run:
                logger.info(
                    "Email notification dry-run: event=%s reference=%s to=%s",
                    event,
                    reference,
                    message.to_email,
                )
            elif result.sent:
                logger.info(
                    "Email notification sent: event=%s reference=%s to=%s",
                    event,
                    reference,
                    message.to_email,
                )
            else:
                logger.warning(
                    "Email notification not sent: event=%s reference=%s reason=%s",
                    event,
                    reference,
                    result.message,
                )
        except Exception:
            logger.warning(
                "Email notification failed: event=%s reference=%s",
                event,
                reference,
                exc_info=True,
            )
