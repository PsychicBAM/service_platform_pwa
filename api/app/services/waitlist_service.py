from __future__ import annotations

import uuid
from datetime import timedelta
from zoneinfo import ZoneInfo

from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions.business import (
    NotFoundError,
    ServiceNotBookableError,
    SlotStillAvailableError,
    SlotUnavailableError,
    WaitlistDisabledError,
    WaitlistDuplicateError,
    WaitlistNotPromotableError,
)
from app.models.booking import Booking
from app.models.business import Business
from app.models.enums import BookingStatus, BusinessStatus, OperatingMode, ServiceType, WaitlistStatus
from app.models.service import Service
from app.repositories.booking_repository import BookingRepository
from app.repositories.booking_waitlist_repository import BookingWaitlistRepository
from app.repositories.business_repository import BusinessRepository
from app.repositories.client_repository import ClientRepository
from app.repositories.service_repository import ServiceRepository
from app.schemas.booking import AdminBookingRead
from app.schemas.waitlist import PublicWaitlistCreate, WaitlistEntryRead, WaitlistPromoteResponse
from app.services import availability_service
from app.services.availability_service import AvailabilityService
from app.services.booking_capacity import SlotCapacityResolver, assert_slot_has_capacity
from app.services.email_notification_service import EmailNotificationService
from app.utils.booking_rules import assert_slot_booking_rules
from app.utils.booking_slots import normalize_starts_at
from app.utils.references import generate_booking_reference

_PROMOTABLE_WAITLIST_STATUSES = {
    WaitlistStatus.waiting,
    WaitlistStatus.contacted,
}


class WaitlistService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.business_repo = BusinessRepository(session)
        self.service_repo = ServiceRepository(session)
        self.booking_repo = BookingRepository(session)
        self.waitlist_repo = BookingWaitlistRepository(session)
        self.client_repo = ClientRepository(session)
        self.availability_service = AvailabilityService(session)
        self.capacity_resolver = SlotCapacityResolver(session)

    async def create_public_waitlist_entry(
        self,
        business_slug: str,
        payload: PublicWaitlistCreate,
    ) -> WaitlistEntryRead:
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
            raise ServiceNotBookableError("Only booking services support waitlists.")
        if not service.waitlist_enabled:
            raise WaitlistDisabledError()

        tz = ZoneInfo(business.timezone)
        starts_at = normalize_starts_at(payload.starts_at, tz)

        await self._assert_slot_full_for_waitlist(business, service, starts_at)

        duplicate = await self.waitlist_repo.find_active_duplicate(
            business.id,
            service.id,
            starts_at,
            customer_email=payload.customer_email,
            customer_phone=payload.customer_phone,
        )
        if duplicate is not None:
            raise WaitlistDuplicateError()

        entry = await self.waitlist_repo.create(
            business_id=business.id,
            service_id=service.id,
            starts_at=starts_at,
            customer_name=payload.customer_name,
            customer_email=payload.customer_email,
            customer_phone=payload.customer_phone,
            note=payload.note,
        )
        await self.session.commit()
        await self.session.refresh(entry)
        entry.service = service
        return WaitlistEntryRead.from_entry(entry)

    async def list_for_business(
        self,
        business: Business,
        *,
        service_id: uuid.UUID | None = None,
        status: WaitlistStatus | None = None,
    ) -> list[WaitlistEntryRead]:
        entries = await self.waitlist_repo.list_for_business(
            business.id,
            service_id=service_id,
            status=status,
        )
        return [WaitlistEntryRead.from_entry(entry) for entry in entries]

    async def update_status(
        self,
        business: Business,
        entry_id: uuid.UUID,
        status: WaitlistStatus,
    ) -> WaitlistEntryRead:
        entry = await self.waitlist_repo.get_by_id(business.id, entry_id)
        if entry is None:
            raise NotFoundError("Waitlist entry not found.")
        await self.waitlist_repo.update_status(entry, status)
        await self.session.commit()
        await self.session.refresh(entry)
        return WaitlistEntryRead.from_entry(entry)

    async def promote_to_booking(
        self,
        business: Business,
        entry_id: uuid.UUID,
    ) -> WaitlistPromoteResponse:
        entry = await self.waitlist_repo.get_by_id(business.id, entry_id)
        if entry is None:
            raise NotFoundError("Waitlist entry not found.")
        if entry.status not in _PROMOTABLE_WAITLIST_STATUSES:
            raise WaitlistNotPromotableError(
                "Only waiting or contacted waitlist entries can be promoted."
            )

        service = entry.service
        if service is None:
            service = await self.service_repo.get_by_business_and_id(
                business.id,
                entry.service_id,
            )
        if service is None or not service.is_active:
            raise NotFoundError("Service not found.")
        if service.type != ServiceType.booking:
            raise ServiceNotBookableError("Only booking services support waitlist promotion.")

        starts_at = entry.starts_at
        duration = service.duration_minutes
        if duration is None:
            raise ServiceNotBookableError("Booking service is missing duration.")
        ends_at = starts_at + timedelta(minutes=duration)

        await self._assert_slot_promotable(business, service, starts_at)

        client = await self.client_repo.get_or_create_guest_client(
            business.id,
            full_name=entry.customer_name,
            email=entry.customer_email,
            phone=entry.customer_phone,
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

        client_notes_parts = ["Promoted from waitlist"]
        if entry.note:
            client_notes_parts.append(entry.note)
        client_notes = " ".join(client_notes_parts)

        booking = Booking(
            business_id=business.id,
            service_id=service.id,
            client_id=client.id,
            reference=reference,
            starts_at=starts_at,
            ends_at=ends_at,
            status=status,
            client_notes=client_notes,
            admin_notes="Promoted from waitlist",
        )
        await self.booking_repo.create(booking)
        await self.waitlist_repo.update_status(entry, WaitlistStatus.resolved)
        await self.session.commit()
        await self.session.refresh(booking)
        await self.session.refresh(entry)
        booking.business = business
        booking.service = service
        booking.client = client
        entry.service = service
        EmailNotificationService().notify_admin_booking_created(booking, business=business)
        return WaitlistPromoteResponse(
            booking=AdminBookingRead.from_booking(booking),
            waitlist_entry=WaitlistEntryRead.from_entry(entry),
        )

    async def _assert_slot_promotable(
        self,
        business: Business,
        service: Service,
        starts_at,
    ) -> None:
        on_schedule = await self.availability_service.is_slot_on_schedule(
            business,
            service,
            starts_at,
        )
        if not on_schedule:
            raise SlotUnavailableError()

        tz = ZoneInfo(business.timezone)
        now = availability_service._now_in_tz(tz)
        target_date = starts_at.astimezone(tz).date()
        day_open = await self.availability_service.resolve_day_open(business, target_date)
        if day_open is None:
            raise SlotUnavailableError()

        assert_slot_booking_rules(
            service,
            business,
            starts_at,
            now=now,
            day_open=day_open,
        )

        await assert_slot_has_capacity(
            self.booking_repo,
            self.capacity_resolver,
            business_id=business.id,
            service=service,
            starts_at=starts_at,
        )

    async def _assert_slot_full_for_waitlist(
        self,
        business: Business,
        service: Service,
        starts_at,
    ) -> None:
        on_schedule = await self.availability_service.is_slot_on_schedule(
            business,
            service,
            starts_at,
        )
        if not on_schedule:
            raise SlotUnavailableError()

        tz = ZoneInfo(business.timezone)
        now = availability_service._now_in_tz(tz)
        target_date = starts_at.astimezone(tz).date()
        day_open = await self.availability_service.resolve_day_open(business, target_date)
        if day_open is None:
            raise SlotUnavailableError()

        assert_slot_booking_rules(
            service,
            business,
            starts_at,
            now=now,
            day_open=day_open,
        )

        capacity = await self.capacity_resolver.effective_capacity(
            business.id,
            service,
            starts_at,
        )
        booked_count = await self.booking_repo.count_blocking_bookings_for_slot(
            business.id,
            service.id,
            starts_at,
        )
        if booked_count < capacity:
            raise SlotStillAvailableError()
