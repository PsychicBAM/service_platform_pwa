import uuid
from datetime import datetime

from sqlalchemy import extract, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.booking import Booking
from app.models.enums import BookingStatus

BLOCKING_BOOKING_STATUSES = (
    BookingStatus.pending,
    BookingStatus.pending_payment,
    BookingStatus.confirmed,
)


class BookingRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(self, booking_id: uuid.UUID) -> Booking | None:
        stmt = select(Booking).where(Booking.id == booking_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_business_and_id(
        self,
        business_id: uuid.UUID,
        booking_id: uuid.UUID,
    ) -> Booking | None:
        stmt = select(Booking).where(
            Booking.business_id == business_id,
            Booking.id == booking_id,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_overlapping_bookings(
        self,
        business_id: uuid.UUID,
        starts_at: datetime,
        ends_at: datetime,
    ) -> list[Booking]:
        stmt = select(Booking).where(
            Booking.business_id == business_id,
            Booking.status.in_(BLOCKING_BOOKING_STATUSES),
            Booking.starts_at < ends_at,
            Booking.ends_at > starts_at,
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def exists_overlap(
        self,
        business_id: uuid.UUID,
        starts_at: datetime,
        ends_at: datetime,
    ) -> bool:
        overlapping = await self.list_overlapping_bookings(
            business_id,
            starts_at,
            ends_at,
        )
        return len(overlapping) > 0

    async def count_for_business_year(
        self,
        business_id: uuid.UUID,
        year: int,
    ) -> int:
        stmt = (
            select(func.count())
            .select_from(Booking)
            .where(
                Booking.business_id == business_id,
                extract("year", Booking.starts_at) == year,
            )
        )
        result = await self.session.execute(stmt)
        return int(result.scalar_one())

    async def list_for_client(
        self,
        business_id: uuid.UUID,
        client_id: uuid.UUID,
    ) -> list[Booking]:
        stmt = (
            select(Booking)
            .where(
                Booking.business_id == business_id,
                Booking.client_id == client_id,
            )
            .order_by(Booking.starts_at.desc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def create(self, booking: Booking) -> Booking:
        self.session.add(booking)
        await self.session.flush()
        return booking
