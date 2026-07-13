from __future__ import annotations

from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions.business import NotFoundError, ServiceNotBookableError
from app.models.business import Business
from app.models.enums import OperatingMode, ServiceType
from app.models.service import Service
from app.repositories.booking_repository import BookingRepository
from app.repositories.schedule_repository import ScheduleRepository
from app.repositories.service_repository import ServiceRepository
from app.repositories.service_slot_capacity_override_repository import (
    ServiceSlotCapacityOverrideRepository,
)
from app.schemas.schedule import AvailabilityResponse, AvailabilitySlot
from app.utils.booking_rules import (
    earliest_bookable_time,
    effective_booking_window_days,
    effective_min_notice_minutes,
    is_slot_within_booking_rules,
    latest_bookable_time,
)
from app.utils.booking_slots import effective_slot_capacity, slot_starts_match


def spec_day_of_week(target_date: date) -> int:
    """Map Python weekday to DATA_MODEL convention: 0=Sunday … 6=Saturday."""
    return (target_date.weekday() + 1) % 7


def combine_local(date_value: date, time_value: time, tz: ZoneInfo) -> datetime:
    return datetime.combine(date_value, time_value, tzinfo=tz)


def intervals_overlap(start_a: datetime, end_a: datetime, start_b: datetime, end_b: datetime) -> bool:
    return start_a < end_b and end_a > start_b


def _now_in_tz(tz: ZoneInfo) -> datetime:
    return datetime.now(tz)


class AvailabilityService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.schedule_repo = ScheduleRepository(session)
        self.service_repo = ServiceRepository(session)
        self.booking_repo = BookingRepository(session)
        self.override_repo = ServiceSlotCapacityOverrideRepository(session)

    async def get_availability(
        self,
        business: Business,
        service: Service,
        target_date: date,
    ) -> AvailabilityResponse:
        self._validate_bookable(business, service)

        tz = ZoneInfo(business.timezone)
        settings = business.settings or {}
        slot_interval = int(settings.get("slot_interval_minutes", 30))
        booking_buffer = int(settings.get("booking_buffer_minutes", 0))
        min_notice_minutes = effective_min_notice_minutes(service, settings)
        window_days = effective_booking_window_days(service, settings)

        now = _now_in_tz(tz)
        if window_days is not None and target_date > latest_bookable_time(now, window_days).date():
            return AvailabilityResponse(date=target_date, timezone=business.timezone, slots=[])

        day = spec_day_of_week(target_date)
        working_hour = await self.schedule_repo.get_working_hour_for_day(business.id, day)
        if (
            working_hour is None
            or not working_hour.is_open
            or working_hour.opens_at is None
            or working_hour.closes_at is None
        ):
            return AvailabilityResponse(date=target_date, timezone=business.timezone, slots=[])

        duration = service.duration_minutes
        if duration is None:
            raise ServiceNotBookableError("Booking service is missing duration.")

        day_open = combine_local(target_date, working_hour.opens_at, tz)
        day_close = combine_local(target_date, working_hour.closes_at, tz)

        step = timedelta(minutes=max(slot_interval, duration + booking_buffer))
        duration_delta = timedelta(minutes=duration)

        breaks = await self.schedule_repo.list_breaks(business.id)
        applicable_breaks = [
            b
            for b in breaks
            if b.day_of_week is None or b.day_of_week == day
        ]

        day_start = combine_local(target_date, time(0, 0), tz)
        day_end = day_start + timedelta(days=1)
        unavailable = await self.schedule_repo.list_unavailable_times_for_range(
            business.id,
            day_start,
            day_end,
        )
        blocking_bookings = await self.booking_repo.list_blocking_bookings_for_service_range(
            business.id,
            service.id,
            day_start,
            day_end,
        )
        overrides = await self.override_repo.list_for_service_range(
            business.id,
            service.id,
            day_start,
            day_end,
        )

        slots: list[AvailabilitySlot] = []
        cursor = day_open
        while cursor + duration_delta <= day_close:
            slot_end = cursor + duration_delta
            if is_slot_within_booking_rules(
                cursor,
                now=now,
                target_date=target_date,
                day_open=day_open,
                min_notice_minutes=min_notice_minutes,
                window_days=window_days,
            ):
                if not self._overlaps_break(cursor, slot_end, target_date, tz, applicable_breaks):
                    if not self._overlaps_unavailable(cursor, slot_end, unavailable):
                        capacity = effective_slot_capacity(service, cursor, overrides)
                        booked_count = self._count_bookings_for_slot(cursor, blocking_bookings)
                        if booked_count < capacity:
                            remaining = capacity - booked_count
                            slots.append(
                                AvailabilitySlot(
                                    starts_at=cursor,
                                    ends_at=slot_end,
                                    spots_remaining=remaining if capacity > 1 else None,
                                )
                            )
            cursor += step

        return AvailabilityResponse(
            date=target_date,
            timezone=business.timezone,
            slots=slots,
        )

    async def is_slot_on_schedule(
        self,
        business: Business,
        service: Service,
        starts_at: datetime,
    ) -> bool:
        self._validate_bookable(business, service)

        tz = ZoneInfo(business.timezone)
        target_date = starts_at.astimezone(tz).date()
        settings = business.settings or {}
        slot_interval = int(settings.get("slot_interval_minutes", 30))
        booking_buffer = int(settings.get("booking_buffer_minutes", 0))
        window_days = effective_booking_window_days(service, settings)

        now = _now_in_tz(tz)
        if window_days is not None and target_date > latest_bookable_time(now, window_days).date():
            return False

        day = spec_day_of_week(target_date)
        working_hour = await self.schedule_repo.get_working_hour_for_day(business.id, day)
        if (
            working_hour is None
            or not working_hour.is_open
            or working_hour.opens_at is None
            or working_hour.closes_at is None
        ):
            return False

        duration = service.duration_minutes
        if duration is None:
            raise ServiceNotBookableError("Booking service is missing duration.")

        day_open = combine_local(target_date, working_hour.opens_at, tz)
        day_close = combine_local(target_date, working_hour.closes_at, tz)

        step = timedelta(minutes=max(slot_interval, duration + booking_buffer))
        duration_delta = timedelta(minutes=duration)

        breaks = await self.schedule_repo.list_breaks(business.id)
        applicable_breaks = [
            b
            for b in breaks
            if b.day_of_week is None or b.day_of_week == day
        ]

        day_start = combine_local(target_date, time(0, 0), tz)
        day_end = day_start + timedelta(days=1)
        unavailable = await self.schedule_repo.list_unavailable_times_for_range(
            business.id,
            day_start,
            day_end,
        )

        cursor = day_open
        while cursor + duration_delta <= day_close:
            slot_end = cursor + duration_delta
            if slot_starts_match(starts_at, cursor):
                if self._overlaps_break(cursor, slot_end, target_date, tz, applicable_breaks):
                    return False
                if self._overlaps_unavailable(cursor, slot_end, unavailable):
                    return False
                return True
            cursor += step
        return False

    async def resolve_day_open(
        self,
        business: Business,
        target_date: date,
    ) -> datetime | None:
        tz = ZoneInfo(business.timezone)
        day = spec_day_of_week(target_date)
        working_hour = await self.schedule_repo.get_working_hour_for_day(business.id, day)
        if (
            working_hour is None
            or not working_hour.is_open
            or working_hour.opens_at is None
        ):
            return None
        return combine_local(target_date, working_hour.opens_at, tz)

    async def get_availability_for_service_id(
        self,
        business: Business,
        service_id,
        target_date: date,
    ) -> AvailabilityResponse:
        service = await self.service_repo.get_by_business_and_id(business.id, service_id)
        if service is None:
            raise NotFoundError("Service not found.")
        return await self.get_availability(business, service, target_date)

    def _validate_bookable(self, business: Business, service: Service) -> None:
        if service.type != ServiceType.booking:
            raise ServiceNotBookableError("Only booking services have availability.")
        if not service.is_active:
            raise NotFoundError("Service not found.")
        if business.operating_mode == OperatingMode.orders_only:
            raise ServiceNotBookableError(
                "Business operating mode does not allow bookings."
            )

    def _overlaps_break(
        self,
        slot_start: datetime,
        slot_end: datetime,
        target_date: date,
        tz: ZoneInfo,
        breaks,
    ) -> bool:
        for break_row in breaks:
            break_start = combine_local(target_date, break_row.starts_at, tz)
            break_end = combine_local(target_date, break_row.ends_at, tz)
            if intervals_overlap(slot_start, slot_end, break_start, break_end):
                return True
        return False

    def _overlaps_unavailable(
        self,
        slot_start: datetime,
        slot_end: datetime,
        unavailable,
    ) -> bool:
        for block in unavailable:
            if intervals_overlap(slot_start, slot_end, block.starts_at, block.ends_at):
                return True
        return False

    def _count_bookings_for_slot(
        self,
        slot_start: datetime,
        bookings,
    ) -> int:
        return sum(
            1 for booking in bookings if slot_starts_match(slot_start, booking.starts_at)
        )
