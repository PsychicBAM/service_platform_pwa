"""Reference generators for domain entities."""

from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.booking_repository import BookingRepository

# TODO: replace count+1 with a race-safe sequence or advisory lock for high concurrency.


async def generate_booking_reference(
    session: AsyncSession,
    business_id: uuid.UUID,
    year: int,
) -> str:
    repo = BookingRepository(session)
    count = await repo.count_for_business_year(business_id, year)
    return f"BKG-{year}-{count + 1:04d}"
