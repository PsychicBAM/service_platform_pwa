from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions.business import (
    BookingCancelTooLateError,
    InvalidBookingStatusTransitionError,
    NotFoundError,
    SlotUnavailableError,
)
from app.models.booking import Booking
from app.models.enums import BookingStatus
from app.models.user import User
from app.repositories.booking_repository import (
    BookingRepository,
    UserBookingStatusFilter,
)
from app.repositories.business_repository import BusinessRepository
from app.schemas.booking import (
    ClientBookingListMeta,
    ClientBookingListResponse,
    ClientBookingRescheduleRequest,
    MyBookingBusinessSummary,
    MyBookingDetail,
    MyBookingListItem,
    MyBookingServiceSummary,
)
from app.services import availability_service
from app.services.availability_service import AvailabilityService
from app.services.booking_capacity import (
    SLOT_FULLY_BOOKED_MESSAGE,
    SlotCapacityResolver,
    assert_slot_has_capacity,
)
from app.utils.booking_rules import (
    SLOT_OUTSIDE_WINDOW_MESSAGE,
    SLOT_TOO_SOON_MESSAGE,
    assert_slot_booking_rules,
)
from app.utils.booking_slots import normalize_starts_at, slot_starts_match

CLIENT_CANCELLABLE_STATUSES = {
    BookingStatus.pending,
    BookingStatus.pending_payment,
    BookingStatus.confirmed,
}

CLIENT_RESCHEDULABLE_STATUSES = {
    BookingStatus.pending,
    BookingStatus.confirmed,
}


def _now_utc() -> datetime:
    return datetime.now(UTC)


def _cancellation_hours(business) -> int:
    settings = business.settings or {}
    return int(settings.get("cancellation_hours", 24))


def _hours_until_start(booking: Booking, now: datetime) -> float:
    return (booking.starts_at - now).total_seconds() / 3600


def can_client_cancel(booking: Booking, business, now: datetime | None = None) -> bool:
    now = now or _now_utc()
    if booking.status not in CLIENT_CANCELLABLE_STATUSES:
        return False
    if booking.starts_at <= now:
        return False
    return _hours_until_start(booking, now) >= _cancellation_hours(business)


def can_client_reschedule(booking: Booking, business, now: datetime | None = None) -> bool:
    now = now or _now_utc()
    if booking.status not in CLIENT_RESCHEDULABLE_STATUSES:
        return False
    if booking.starts_at <= now:
        return False
    return _hours_until_start(booking, now) >= _cancellation_hours(business)


def _ensure_within_cutoff(booking: Booking, business) -> None:
    now = _now_utc()
    if _hours_until_start(booking, now) < _cancellation_hours(business):
        raise BookingCancelTooLateError()


class ClientBookingService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = BookingRepository(session)
        self.business_repo = BusinessRepository(session)
        self.availability_service = AvailabilityService(session)
        self.capacity_resolver = SlotCapacityResolver(session)

    async def list_my_bookings(
        self,
        user: User,
        *,
        status_filter: UserBookingStatusFilter | None = None,
        page: int = 1,
        limit: int = 20,
    ) -> ClientBookingListResponse:
        bookings = await self.repo.list_for_user(
            user.id,
            status_filter=status_filter,
            page=page,
            limit=limit,
        )
        total = await self.repo.count_for_user(user.id, status_filter=status_filter)
        now = _now_utc()
        return ClientBookingListResponse(
            data=[self._to_list_item(b, now) for b in bookings],
            meta=ClientBookingListMeta(page=page, limit=limit, total=total),
        )

    async def get_my_booking(
        self,
        user: User,
        booking_id: uuid.UUID,
    ) -> MyBookingDetail:
        booking = await self.repo.get_for_user(user.id, booking_id)
        if booking is None:
            raise NotFoundError("Booking not found.")
        return self._to_detail(booking, _now_utc())

    async def cancel_my_booking(
        self,
        user: User,
        booking_id: uuid.UUID,
        *,
        reason: str | None,
    ) -> MyBookingDetail:
        booking = await self._get_booking_for_action(user.id, booking_id)
        if booking.status not in CLIENT_CANCELLABLE_STATUSES:
            raise InvalidBookingStatusTransitionError(
                f"Cannot cancel booking with status '{booking.status.value}'."
            )
        if booking.starts_at <= _now_utc():
            raise InvalidBookingStatusTransitionError(
                "Cannot cancel a booking that has already started."
            )
        _ensure_within_cutoff(booking, booking.business)

        # TODO: send cancellation notification when notification service exists.
        await self.repo.cancel_by_client(
            booking,
            reason=reason,
            cancelled_at=_now_utc(),
        )
        await self.session.commit()
        booking = await self.repo.get_for_user(user.id, booking_id)
        assert booking is not None
        return self._to_detail(booking, _now_utc())

    async def reschedule_my_booking(
        self,
        user: User,
        booking_id: uuid.UUID,
        payload: ClientBookingRescheduleRequest,
    ) -> MyBookingDetail:
        booking = await self._get_booking_for_action(user.id, booking_id)
        if booking.status not in CLIENT_RESCHEDULABLE_STATUSES:
            raise InvalidBookingStatusTransitionError(
                f"Cannot reschedule booking with status '{booking.status.value}'."
            )
        if booking.starts_at <= _now_utc():
            raise InvalidBookingStatusTransitionError(
                "Cannot reschedule a booking that has already started."
            )
        _ensure_within_cutoff(booking, booking.business)

        tz = ZoneInfo(booking.business.timezone)
        new_starts_at = normalize_starts_at(payload.starts_at, tz)
        duration = booking.service.duration_minutes
        if duration is None:
            raise SlotUnavailableError()
        new_ends_at = new_starts_at + timedelta(minutes=duration)

        availability = await self.availability_service.get_availability(
            booking.business,
            booking.service,
            new_starts_at.date(),
        )
        slot_found = any(
            slot_starts_match(new_starts_at, slot.starts_at)
            for slot in availability.slots
        )
        if not slot_found:
            now = availability_service._now_in_tz(tz)
            target_date = new_starts_at.astimezone(tz).date()
            day_open = await self.availability_service.resolve_day_open(
                booking.business,
                target_date,
            )
            if day_open is None:
                raise SlotUnavailableError()

            try:
                assert_slot_booking_rules(
                    booking.service,
                    booking.business,
                    new_starts_at,
                    now=now,
                    day_open=day_open,
                )
            except SlotUnavailableError as exc:
                if exc.message in (SLOT_TOO_SOON_MESSAGE, SLOT_OUTSIDE_WINDOW_MESSAGE):
                    raise
                raise SlotUnavailableError() from exc

            on_schedule = await self.availability_service.is_slot_on_schedule(
                booking.business,
                booking.service,
                new_starts_at,
            )
            if not on_schedule:
                raise SlotUnavailableError()

            booked_count = await self.repo.count_blocking_bookings_for_slot(
                booking.business_id,
                booking.service.id,
                new_starts_at,
                exclude_booking_id=booking.id,
            )
            capacity = await self.capacity_resolver.effective_capacity(
                booking.business_id,
                booking.service,
                new_starts_at,
            )
            if booked_count >= capacity:
                raise SlotUnavailableError(SLOT_FULLY_BOOKED_MESSAGE)
            raise SlotUnavailableError()

        await assert_slot_has_capacity(
            self.repo,
            self.capacity_resolver,
            business_id=booking.business_id,
            service=booking.service,
            starts_at=new_starts_at,
            exclude_booking_id=booking.id,
        )

        # TODO: send reschedule notification when notification service exists.
        await self.repo.reschedule_by_client(
            booking,
            starts_at=new_starts_at,
            ends_at=new_ends_at,
        )
        await self.session.commit()
        booking = await self.repo.get_for_user(user.id, booking_id)
        assert booking is not None
        return self._to_detail(booking, _now_utc())

    async def _get_booking_for_action(
        self,
        user_id: uuid.UUID,
        booking_id: uuid.UUID,
    ) -> Booking:
        booking = await self.repo.get_for_user(user_id, booking_id)
        if booking is None:
            raise NotFoundError("Booking not found.")
        return booking

    def _to_list_item(self, booking: Booking, now: datetime) -> MyBookingListItem:
        return MyBookingListItem(
            id=booking.id,
            reference=booking.reference,
            status=booking.status,
            business=MyBookingBusinessSummary(
                id=booking.business.id,
                name=booking.business.name,
                slug=booking.business.slug,
            ),
            service=MyBookingServiceSummary(
                id=booking.service.id,
                name=booking.service.name,
            ),
            starts_at=booking.starts_at,
            ends_at=booking.ends_at,
            can_cancel=can_client_cancel(booking, booking.business, now),
            can_reschedule=can_client_reschedule(booking, booking.business, now),
        )

    def _to_detail(self, booking: Booking, now: datetime) -> MyBookingDetail:
        return MyBookingDetail(
            id=booking.id,
            reference=booking.reference,
            status=booking.status,
            business=MyBookingBusinessSummary(
                id=booking.business.id,
                name=booking.business.name,
                slug=booking.business.slug,
            ),
            service=MyBookingServiceSummary(
                id=booking.service.id,
                name=booking.service.name,
            ),
            starts_at=booking.starts_at,
            ends_at=booking.ends_at,
            client_notes=booking.client_notes,
            cancelled_at=booking.cancelled_at,
            cancelled_by=booking.cancelled_by.value if booking.cancelled_by else None,
            cancellation_reason=booking.cancellation_reason,
            can_cancel=can_client_cancel(booking, booking.business, now),
            can_reschedule=can_client_reschedule(booking, booking.business, now),
            created_at=booking.created_at,
            updated_at=booking.updated_at,
        )
