from __future__ import annotations

import uuid
from zoneinfo import ZoneInfo

from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions.business import (
    NotFoundError,
    ServiceNotBookableError,
    SlotCapacityOverrideExistsError,
    ValidationAppError,
)
from app.models.business import Business
from app.models.enums import ServiceType
from app.models.service import Service
from app.repositories.service_repository import ServiceRepository
from app.repositories.service_slot_capacity_override_repository import (
    ServiceSlotCapacityOverrideRepository,
)
from app.schemas.service_slot_capacity_override import (
    ServiceSlotCapacityOverrideCreate,
    ServiceSlotCapacityOverrideRead,
)
from app.services.availability_service import AvailabilityService
from app.utils.booking_slots import normalize_starts_at, slot_starts_match


class ServiceSlotCapacityOverrideService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.service_repo = ServiceRepository(session)
        self.override_repo = ServiceSlotCapacityOverrideRepository(session)
        self.availability_service = AvailabilityService(session)

    async def list_for_service(
        self,
        business: Business,
        service_id: uuid.UUID,
    ) -> list[ServiceSlotCapacityOverrideRead]:
        service = await self._get_booking_service(business, service_id)
        overrides = await self.override_repo.list_for_service(business.id, service.id)
        return [ServiceSlotCapacityOverrideRead.from_override(item) for item in overrides]

    async def create(
        self,
        business: Business,
        service_id: uuid.UUID,
        payload: ServiceSlotCapacityOverrideCreate,
    ) -> ServiceSlotCapacityOverrideRead:
        service = await self._get_booking_service(business, service_id)
        tz = ZoneInfo(business.timezone)
        starts_at = normalize_starts_at(payload.starts_at, tz)

        existing = await self.override_repo.get_for_slot(business.id, service.id, starts_at)
        if existing is not None:
            raise SlotCapacityOverrideExistsError()

        if not await self.availability_service.is_slot_on_schedule(
            business,
            service,
            starts_at,
        ):
            raise ValidationAppError(
                "Selected time is not a valid bookable slot for this service."
            )

        override = await self.override_repo.create(
            business_id=business.id,
            service_id=service.id,
            starts_at=starts_at,
            capacity=payload.capacity,
            note=payload.note,
        )
        await self.session.commit()
        await self.session.refresh(override)
        return ServiceSlotCapacityOverrideRead.from_override(override)

    async def delete(
        self,
        business: Business,
        service_id: uuid.UUID,
        override_id: uuid.UUID,
    ) -> None:
        service = await self._get_booking_service(business, service_id)
        override = await self.override_repo.get_by_id(business.id, service.id, override_id)
        if override is None:
            raise NotFoundError("Capacity override not found.")
        await self.override_repo.delete(override)
        await self.session.commit()

    async def _get_booking_service(
        self,
        business: Business,
        service_id: uuid.UUID,
    ) -> Service:
        service = await self.service_repo.get_by_business_and_id(business.id, service_id)
        if service is None:
            raise NotFoundError("Service not found.")
        if service.type != ServiceType.booking:
            raise ServiceNotBookableError(
                "Only booking services can have special group time slots."
            )
        return service
