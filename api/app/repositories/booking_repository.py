import uuid
from datetime import UTC, date, datetime
from enum import Enum

from sqlalchemy import and_, cast, func, or_, select
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


def _now_utc() -> datetime:
    return datetime.now(UTC)


class UserBookingStatusFilter(str, Enum):
    upcoming = "upcoming"
    past = "past"
    cancelled = "cancelled"


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

    def _user_booking_filters(self, stmt, user_id: uuid.UUID, status_filter: UserBookingStatusFilter | None):
        stmt = stmt.join(Booking.client).where(Client.user_id == user_id)
        now = _now_utc()
        if status_filter == UserBookingStatusFilter.upcoming:
            stmt = stmt.where(
                Booking.status.in_(
                    (
                        BookingStatus.pending,
                        BookingStatus.pending_payment,
                        BookingStatus.confirmed,
                    )
                ),
                Booking.starts_at >= now,
            )
        elif status_filter == UserBookingStatusFilter.past:
            stmt = stmt.where(
                or_(
                    Booking.status.in_((BookingStatus.completed, BookingStatus.no_show)),
                    and_(
                        Booking.starts_at < now,
                        Booking.status != BookingStatus.cancelled,
                    ),
                )
            )
        elif status_filter == UserBookingStatusFilter.cancelled:
            stmt = stmt.where(Booking.status == BookingStatus.cancelled)
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

    async def get_for_user(
        self,
        user_id: uuid.UUID,
        booking_id: uuid.UUID,
    ) -> Booking | None:
        stmt = (
            select(Booking)
            .join(Booking.client)
            .where(Client.user_id == user_id, Booking.id == booking_id)
            .options(
                selectinload(Booking.client),
                selectinload(Booking.service),
                selectinload(Booking.business),
            )
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_guest_booking_for_claim(self, reference: str) -> Booking | None:
        normalized_reference = reference.strip()
        if not normalized_reference:
            return None
        stmt = (
            select(Booking)
            .join(Booking.client)
            .where(
                Booking.reference == normalized_reference,
                Client.user_id.is_(None),
            )
            .options(
                selectinload(Booking.client),
                selectinload(Booking.service),
                selectinload(Booking.business),
            )
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_for_review_by_reference(
        self,
        business_id: uuid.UUID,
        reference: str,
    ) -> Booking | None:
        normalized_reference = reference.strip()
        if not normalized_reference:
            return None
        stmt = (
            select(Booking)
            .where(
                Booking.business_id == business_id,
                Booking.reference == normalized_reference,
            )
            .options(
                selectinload(Booking.client),
                selectinload(Booking.service),
                selectinload(Booking.business),
            )
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_for_user(
        self,
        user_id: uuid.UUID,
        *,
        status_filter: UserBookingStatusFilter | None = None,
        page: int = 1,
        limit: int = 20,
    ) -> list[Booking]:
        stmt = select(Booking).options(
            selectinload(Booking.client),
            selectinload(Booking.service),
            selectinload(Booking.business),
        )
        stmt = self._user_booking_filters(stmt, user_id, status_filter)
        stmt = stmt.order_by(Booking.starts_at.desc())
        offset = max(page - 1, 0) * limit
        stmt = stmt.offset(offset).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().unique().all())

    async def count_for_user(
        self,
        user_id: uuid.UUID,
        *,
        status_filter: UserBookingStatusFilter | None = None,
    ) -> int:
        stmt = select(func.count()).select_from(Booking)
        stmt = self._user_booking_filters(stmt, user_id, status_filter)
        result = await self.session.execute(stmt)
        return int(result.scalar_one())

    async def list_overlapping_bookings(
        self,
        business_id: uuid.UUID,
        starts_at: datetime,
        ends_at: datetime,
        *,
        exclude_booking_id: uuid.UUID | None = None,
    ) -> list[Booking]:
        stmt = select(Booking).where(
            Booking.business_id == business_id,
            Booking.status.in_(BLOCKING_BOOKING_STATUSES),
            Booking.starts_at < ends_at,
            Booking.ends_at > starts_at,
        )
        if exclude_booking_id is not None:
            stmt = stmt.where(Booking.id != exclude_booking_id)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def exists_overlap(
        self,
        business_id: uuid.UUID,
        starts_at: datetime,
        ends_at: datetime,
        *,
        exclude_booking_id: uuid.UUID | None = None,
    ) -> bool:
        overlapping = await self.list_overlapping_bookings(
            business_id,
            starts_at,
            ends_at,
            exclude_booking_id=exclude_booking_id,
        )
        return len(overlapping) > 0

    async def list_blocking_bookings_for_service_range(
        self,
        business_id: uuid.UUID,
        service_id: uuid.UUID,
        range_start: datetime,
        range_end: datetime,
    ) -> list[Booking]:
        stmt = select(Booking).where(
            Booking.business_id == business_id,
            Booking.service_id == service_id,
            Booking.status.in_(BLOCKING_BOOKING_STATUSES),
            Booking.starts_at >= range_start,
            Booking.starts_at < range_end,
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def count_blocking_bookings_for_slot(
        self,
        business_id: uuid.UUID,
        service_id: uuid.UUID,
        starts_at: datetime,
        *,
        exclude_booking_id: uuid.UUID | None = None,
    ) -> int:
        stmt = (
            select(func.count())
            .select_from(Booking)
            .where(
                Booking.business_id == business_id,
                Booking.service_id == service_id,
                Booking.starts_at == starts_at,
                Booking.status.in_(BLOCKING_BOOKING_STATUSES),
            )
        )
        if exclude_booking_id is not None:
            stmt = stmt.where(Booking.id != exclude_booking_id)
        result = await self.session.execute(stmt)
        return int(result.scalar_one())

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
        cancelled_by: CancelledBy = CancelledBy.admin,
    ) -> Booking:
        booking.status = BookingStatus.cancelled
        booking.cancelled_at = cancelled_at
        booking.cancelled_by = cancelled_by
        booking.cancellation_reason = reason
        await self.session.flush()
        return booking

    async def cancel_by_client(
        self,
        booking: Booking,
        *,
        reason: str | None,
        cancelled_at: datetime,
    ) -> Booking:
        return await self.cancel_booking(
            booking,
            reason=reason,
            cancelled_at=cancelled_at,
            cancelled_by=CancelledBy.client,
        )

    async def reschedule_by_client(
        self,
        booking: Booking,
        *,
        starts_at: datetime,
        ends_at: datetime,
    ) -> Booking:
        booking.starts_at = starts_at
        booking.ends_at = ends_at
        await self.session.flush()
        return booking
