from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.booking_waitlist_entry import BookingWaitlistEntry
from app.models.enums import WaitlistStatus
from app.utils.booking_slots import slot_starts_match

_ACTIVE_WAITLIST_STATUSES = {
    WaitlistStatus.waiting,
    WaitlistStatus.contacted,
}


class BookingWaitlistRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_for_business(
        self,
        business_id: uuid.UUID,
        *,
        service_id: uuid.UUID | None = None,
        status: WaitlistStatus | None = None,
    ) -> list[BookingWaitlistEntry]:
        stmt = (
            select(BookingWaitlistEntry)
            .options(selectinload(BookingWaitlistEntry.service))
            .where(BookingWaitlistEntry.business_id == business_id)
            .order_by(BookingWaitlistEntry.starts_at, BookingWaitlistEntry.created_at)
        )
        if service_id is not None:
            stmt = stmt.where(BookingWaitlistEntry.service_id == service_id)
        if status is not None:
            stmt = stmt.where(BookingWaitlistEntry.status == status)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_id(
        self,
        business_id: uuid.UUID,
        entry_id: uuid.UUID,
    ) -> BookingWaitlistEntry | None:
        stmt = (
            select(BookingWaitlistEntry)
            .options(selectinload(BookingWaitlistEntry.service))
            .where(
                BookingWaitlistEntry.id == entry_id,
                BookingWaitlistEntry.business_id == business_id,
            )
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def find_active_duplicate(
        self,
        business_id: uuid.UUID,
        service_id: uuid.UUID,
        starts_at: datetime,
        *,
        customer_email: str | None,
        customer_phone: str | None,
    ) -> BookingWaitlistEntry | None:
        stmt = select(BookingWaitlistEntry).where(
            BookingWaitlistEntry.business_id == business_id,
            BookingWaitlistEntry.service_id == service_id,
            BookingWaitlistEntry.status.in_(_ACTIVE_WAITLIST_STATUSES),
        )
        result = await self.session.execute(stmt)
        entries = list(result.scalars().all())
        for entry in entries:
            if not slot_starts_match(starts_at, entry.starts_at):
                continue
            if customer_email and entry.customer_email:
                if entry.customer_email.lower() == customer_email.lower():
                    return entry
            if customer_phone and entry.customer_phone:
                if entry.customer_phone == customer_phone:
                    return entry
        return None

    async def create(
        self,
        *,
        business_id: uuid.UUID,
        service_id: uuid.UUID,
        starts_at: datetime,
        customer_name: str,
        customer_email: str | None,
        customer_phone: str | None,
        note: str | None,
    ) -> BookingWaitlistEntry:
        entry = BookingWaitlistEntry(
            business_id=business_id,
            service_id=service_id,
            starts_at=starts_at,
            customer_name=customer_name,
            customer_email=customer_email,
            customer_phone=customer_phone,
            note=note,
            status=WaitlistStatus.waiting,
        )
        self.session.add(entry)
        await self.session.flush()
        return entry

    async def update_status(
        self,
        entry: BookingWaitlistEntry,
        status: WaitlistStatus,
    ) -> BookingWaitlistEntry:
        entry.status = status
        await self.session.flush()
        return entry
