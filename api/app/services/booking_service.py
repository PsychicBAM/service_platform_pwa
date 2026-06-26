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
from app.repositories.booking_repository import BookingRepository
from app.repositories.business_repository import BusinessRepository
from app.repositories.client_repository import ClientRepository
from app.repositories.service_repository import ServiceRepository
from app.schemas.booking import PublicBookingCreate
from app.services.availability_service import AvailabilityService
from app.utils.references import generate_booking_reference


def normalize_starts_at(starts_at: datetime, tz: ZoneInfo) -> datetime:
    if starts_at.tzinfo is None:
        return starts_at.replace(tzinfo=tz)
    return starts_at.astimezone(tz)


def slot_starts_match(requested: datetime, slot_start: datetime) -> bool:
    return int(requested.timestamp()) == int(slot_start.timestamp())


class BookingService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.business_repo = BusinessRepository(session)
        self.service_repo = ServiceRepository(session)
        self.client_repo = ClientRepository(session)
        self.booking_repo = BookingRepository(session)
        self.availability_service = AvailabilityService(session)

    async def create_public_booking(
        self,
        business_slug: str,
        payload: PublicBookingCreate,
    ) -> tuple[Booking, Service, Client]:
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

        client = await self.client_repo.get_or_create_guest_client(
            business.id,
            full_name=payload.client.full_name,
            email=payload.client.email,
            phone=payload.client.phone,
        )

        settings = business.settings or {}
        auto_confirm = bool(settings.get("auto_confirm_bookings", False))
        status = BookingStatus.confirmed if auto_confirm else BookingStatus.pending

        reference = await generate_booking_reference(
            self.session,
            business.id,
            starts_at.year,
        )

        if await self.booking_repo.exists_overlap(business.id, starts_at, ends_at):
            raise SlotUnavailableError()

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
        await self.session.commit()
        await self.session.refresh(booking)
        return booking, service, client

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
            raise SlotUnavailableError()

        if await self.booking_repo.exists_overlap(business.id, starts_at, ends_at):
            raise SlotUnavailableError()
