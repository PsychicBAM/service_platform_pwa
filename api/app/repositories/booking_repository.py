import uuid
from datetime import date, datetime

from sqlalchemy import cast, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.types import Date

from app.models.booking import Booking
from app.models.client import Client
from app.models.enums import BookingStatus, CancelledBy


BLOCKING_BOOKING_STATUSES = (
    BookingStatus.pending,
    BookingStatus.pending_payment,
    BookingStatus.confirmed,
)


class BookingRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    def _list_filters(
        self,
        stmt,
        business_id: uuid.UUID,
        *,
        status: BookingStatus | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
        search: str | None = None,
    ):
        stmt = stmt.where(Booking.business_id == business_id)
        if status is not None:
            stmt = stmt.where(Booking.status == status)
        if date_from is not None:
            stmt = stmt.where(cast(Booking.starts_at, Date) >= date_from)
        if date_to is not None:
            stmt = stmt.where(cast(Booking.starts_at, Date) <= date_to)
        if search:
            term = f"%{search.strip()}%"
            stmt = stmt.join(Booking.client).where(
                or_(
                    Client.full_name.ilike(term),
                    Client.email.ilike(term),
                    Client.phone.ilike(term),
                    Booking.reference.ilike(term),
                )
            )
        return stmt

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

    async def get_detail_for_business(
        self,
        business_id: uuid.UUID,
        booking_id: uuid.UUID,
    ) -> Booking | None:
        stmt = (
            select(Booking)
            .where(
                Booking.business_id == business_id,
                Booking.id == booking_id,
            )
            .options(
                selectinload(Booking.client),
                selectinload(Booking.service),
            )
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_for_business(
        self,
        business_id: uuid.UUID,
        *,
        status: BookingStatus | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
        search: str | None = None,
        page: int = 1,
        limit: int = 20,
    ) -> list[Booking]:
        stmt = select(Booking).options(
            selectinload(Booking.client),
            selectinload(Booking.service),
        )
        stmt = self._list_filters(
            stmt,
            business_id,
            status=status,
            date_from=date_from,
            date_to=date_to,
            search=search,
        )
        stmt = stmt.order_by(Booking.starts_at.desc())
        offset = max(page - 1, 0) * limit
        stmt = stmt.offset(offset).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().unique().all())

    async def count_for_business(
        self,
        business_id: uuid.UUID,
        *,
        status: BookingStatus | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
        search: str | None = None,
    ) -> int:
        stmt = select(func.count()).select_from(Booking)
        stmt = self._list_filters(
            stmt,
            business_id,
            status=status,
            date_from=date_from,
            date_to=date_to,
            search=search,
        )
        result = await self.session.execute(stmt)
        return int(result.scalar_one())

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
        from sqlalchemy import extract

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

    async def update_booking(self, booking: Booking, data: dict) -> Booking:
        for key, value in data.items():
            setattr(booking, key, value)
        await self.session.flush()
        return booking

    async def cancel_booking(
        self,
        booking: Booking,
        *,
        reason: str | None,
        cancelled_at: datetime,
    ) -> Booking:
        booking.status = BookingStatus.cancelled
        booking.cancelled_at = cancelled_at
        booking.cancelled_by = CancelledBy.admin
        booking.cancellation_reason = reason
        await self.session.flush()
        return booking
