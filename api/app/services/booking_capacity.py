from __future__ import annotations

from datetime import datetime
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions.business import SlotUnavailableError
from app.models.service import Service
from app.repositories.booking_repository import BookingRepository
from app.repositories.service_slot_capacity_override_repository import (
    ServiceSlotCapacityOverrideRepository,
)
from app.utils.booking_slots import effective_slot_capacity, service_booking_capacity

SLOT_FULLY_BOOKED_MESSAGE = "This time slot is fully booked."


class SlotCapacityResolver:
    def __init__(self, session: AsyncSession) -> None:
        self.override_repo = ServiceSlotCapacityOverrideRepository(session)

    async def effective_capacity(
        self,
        business_id: uuid.UUID,
        service: Service,
        starts_at: datetime,
        *,
        overrides: list | None = None,
    ) -> int:
        if overrides is not None:
            return effective_slot_capacity(service, starts_at, overrides)
        override = await self.override_repo.get_for_slot(business_id, service.id, starts_at)
        if override is not None:
            return max(1, int(override.capacity))
        return service_booking_capacity(service)


async def assert_slot_has_capacity(
    booking_repo: BookingRepository,
    capacity_resolver: SlotCapacityResolver,
    *,
    business_id: uuid.UUID,
    service: Service,
    starts_at: datetime,
    exclude_booking_id: uuid.UUID | None = None,
    overrides: list | None = None,
) -> None:
    capacity = await capacity_resolver.effective_capacity(
        business_id,
        service,
        starts_at,
        overrides=overrides,
    )
    count = await booking_repo.count_blocking_bookings_for_slot(
        business_id,
        service.id,
        starts_at,
        exclude_booking_id=exclude_booking_id,
    )
    if count >= capacity:
        raise SlotUnavailableError(SLOT_FULLY_BOOKED_MESSAGE)
