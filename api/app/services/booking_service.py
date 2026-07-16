from __future__ import annotations

from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions.business import (
    NotFoundError,
    ServiceNotBookableError,
    SlotUnavailableError,
)
from app.models.booking import Booking
from app.models.business import Business
from app.models.client import Client
from app.models.enums import BookingStatus, BusinessStatus, OperatingMode, ServiceType
from app.models.service import Service
from app.models.user import User
from app.repositories.booking_repository import BookingRepository
from app.repositories.business_repository import BusinessRepository
from app.repositories.client_repository import ClientRepository
from app.repositories.service_repository import ServiceRepository
from app.schemas.booking import PublicBookingCreate
from app.services import availability_service
from app.services.availability_service import AvailabilityService
from app.services.booking_capacity import (
    SLOT_FULLY_BOOKED_MESSAGE,
    SlotCapacityResolver,
    assert_slot_has_capacity,
)
from app.services.email_notification_service import EmailNotificationService
from app.services.legal_consent_service import LegalConsentService
from app.utils.booking_rules import (
    SLOT_OUTSIDE_WINDOW_MESSAGE,
    SLOT_TOO_SOON_MESSAGE,
    assert_slot_booking_rules,
)
from app.utils.booking_slots import normalize_starts_at, slot_starts_match
from app.utils.public_client_attach import resolve_attach_user_id
from app.utils.references import generate_booking_reference

# Re-export for existing imports.
__all__ = ["BookingService", "normalize_starts_at", "slot_starts_match"]


class BookingService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.business_repo = BusinessRepository(session)
        self.service_repo = ServiceRepository(session)
        self.client_repo = ClientRepository(session)
        self.booking_repo = BookingRepository(session)
        self.availability_service = AvailabilityService(session)
        self.capacity_resolver = SlotCapacityResolver(session)

    async def create_public_booking(
        self,
        business_slug: str,
        payload: PublicBookingCreate,
        *,
        current_user: User | None = None,
    ) -> tuple[Booking, Service, Client, bool]:
        business = await self.business_repo.get_by_slug(business_slug)
        if business is None or business.status != BusinessStatus.active:
            raise NotFoundError("Business not found.")

        if business.operating_mode == OperatingMode.orders_only:
            raise ServiceNotBookableError(
                "Business operating mode does not allow bookings."
            )

        service = await self.service_repo.get_by_business_and_id(
            business.id,
            payload.service_id,
        )
        if service is None or not service.is_active:
            raise NotFoundError("Service not found.")
        if service.type != ServiceType.booking:
            raise ServiceNotBookableError("Only booking services can be booked.")

        tz = ZoneInfo(business.timezone)
        starts_at = normalize_starts_at(payload.starts_at, tz)
        duration = service.duration_minutes
        if duration is None:
            raise ServiceNotBookableError("Booking service is missing duration.")
        ends_at = starts_at + timedelta(minutes=duration)

        await self._assert_slot_available(business, service, starts_at, ends_at)

        attach_user_id, _ = resolve_attach_user_id(
            current_user,
            payload.client.email,
        )
        client = await self.client_repo.get_or_create_guest_client(
            business.id,
            full_name=payload.client.full_name,
            email=payload.client.email,
            phone=payload.client.phone,
            attach_user_id=attach_user_id,
        )
        linked_to_account = (
            attach_user_id is not None and client.user_id == attach_user_id
        )
        settings = business.settings or {}
        auto_confirm = bool(settings.get("auto_confirm_bookings", False))
        status = BookingStatus.confirmed if auto_confirm else BookingStatus.pending

        reference = await generate_booking_reference(
            self.session,
            business.id,
            starts_at.year,
        )

        await assert_slot_has_capacity(
            self.booking_repo,
            self.capacity_resolver,
            business_id=business.id,
            service=service,
            starts_at=starts_at,
        )

        booking = Booking(
            business_id=business.id,
            service_id=service.id,
            client_id=client.id,
            reference=reference,
            starts_at=starts_at,
            ends_at=ends_at,
            status=status,
            client_notes=payload.client_notes,
        )
        await self.booking_repo.create(booking)
        consent_service = LegalConsentService(self.session)
        await consent_service.record_public_booking_consent(
            booking_id=booking.id,
            business_id=business.id,
            client_id=client.id,
        )
        await self.session.commit()
        await self.session.refresh(booking)
        booking.business = business
        booking.service = service
        booking.client = client
        EmailNotificationService().notify_admin_booking_created(booking, business=business)
        return booking, service, client, linked_to_account

    async def _assert_slot_available(
        self,
        business: Business,
        service: Service,
        starts_at: datetime,
        ends_at: datetime,
    ) -> None:
        availability = await self.availability_service.get_availability(
            business,
            service,
            starts_at.date(),
        )
        slot_found = any(
            slot_starts_match(starts_at, slot.starts_at)
            for slot in availability.slots
        )
        if not slot_found:
            tz = ZoneInfo(business.timezone)
            now = availability_service._now_in_tz(tz)
            target_date = starts_at.astimezone(tz).date()
            day_open = await self.availability_service.resolve_day_open(business, target_date)
            if day_open is None:
                raise SlotUnavailableError()

            try:
                assert_slot_booking_rules(
                    service,
                    business,
                    starts_at,
                    now=now,
                    day_open=day_open,
                )
            except SlotUnavailableError as exc:
                if exc.message in (SLOT_TOO_SOON_MESSAGE, SLOT_OUTSIDE_WINDOW_MESSAGE):
                    raise
                raise SlotUnavailableError() from exc

            on_schedule = await self.availability_service.is_slot_on_schedule(
                business,
                service,
                starts_at,
            )
            if not on_schedule:
                raise SlotUnavailableError()

            booked_count = await self.booking_repo.count_blocking_bookings_for_slot(
                business.id,
                service.id,
                starts_at,
            )
            capacity = await self.capacity_resolver.effective_capacity(
                business.id,
                service,
                starts_at,
            )
            if booked_count >= capacity:
                raise SlotUnavailableError(SLOT_FULLY_BOOKED_MESSAGE)
            raise SlotUnavailableError()

        await assert_slot_has_capacity(
            self.booking_repo,
            self.capacity_resolver,
            business_id=business.id,
            service=service,
            starts_at=starts_at,
        )
