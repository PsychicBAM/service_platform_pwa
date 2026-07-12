from __future__ import annotations

from datetime import datetime
import uuid

from app.exceptions.business import SlotUnavailableError
from app.models.service import Service
from app.repositories.booking_repository import BookingRepository
from app.utils.booking_slots import service_booking_capacity

SLOT_FULLY_BOOKED_MESSAGE = "This time slot is fully booked."


async def assert_slot_has_capacity(
    booking_repo: BookingRepository,
    *,
    business_id: uuid.UUID,
    service: Service,
    starts_at: datetime,
    exclude_booking_id: uuid.UUID | None = None,
) -> None:
    capacity = service_booking_capacity(service)
    count = await booking_repo.count_blocking_bookings_for_slot(
        business_id,
        service.id,
        starts_at,
        exclude_booking_id=exclude_booking_id,
    )
    if count >= capacity:
        raise SlotUnavailableError(SLOT_FULLY_BOOKED_MESSAGE)
