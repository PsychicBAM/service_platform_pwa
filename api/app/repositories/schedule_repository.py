import uuid

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.unavailable_time import UnavailableTime
from app.models.working_break import WorkingBreak
from app.models.working_hour import WorkingHour
from app.schemas.schedule import parse_time_hhmm


class ScheduleRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_working_hours(self, business_id: uuid.UUID) -> list[WorkingHour]:
        stmt = (
            select(WorkingHour)
            .where(WorkingHour.business_id == business_id)
            .order_by(WorkingHour.day_of_week)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_working_hour_for_day(
        self,
        business_id: uuid.UUID,
        day_of_week: int,
    ) -> WorkingHour | None:
        stmt = select(WorkingHour).where(
            WorkingHour.business_id == business_id,
            WorkingHour.day_of_week == day_of_week,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def replace_working_hours(
        self,
        business_id: uuid.UUID,
        hours: list[dict],
    ) -> list[WorkingHour]:
        await self.session.execute(
            delete(WorkingHour).where(WorkingHour.business_id == business_id)
        )
        created: list[WorkingHour] = []
        for item in hours:
            opens_at = (
                parse_time_hhmm(item["opens_at"]) if item.get("opens_at") else None
            )
            closes_at = (
                parse_time_hhmm(item["closes_at"]) if item.get("closes_at") else None
            )
            row = WorkingHour(
                business_id=business_id,
                day_of_week=item["day_of_week"],
                is_open=item["is_open"],
                opens_at=opens_at,
                closes_at=closes_at,
            )
            self.session.add(row)
            created.append(row)
        await self.session.flush()
        return created

    async def list_breaks(self, business_id: uuid.UUID) -> list[WorkingBreak]:
        stmt = (
            select(WorkingBreak)
            .where(WorkingBreak.business_id == business_id)
            .order_by(WorkingBreak.day_of_week.nullsfirst(), WorkingBreak.starts_at)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_break(
        self,
        business_id: uuid.UUID,
        break_id: uuid.UUID,
    ) -> WorkingBreak | None:
        stmt = select(WorkingBreak).where(
            WorkingBreak.business_id == business_id,
            WorkingBreak.id == break_id,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def create_break(self, break_row: WorkingBreak) -> WorkingBreak:
        self.session.add(break_row)
        await self.session.flush()
        return break_row

    async def update_break(self, break_row: WorkingBreak, data: dict) -> WorkingBreak:
        for key, value in data.items():
            setattr(break_row, key, value)
        await self.session.flush()
        return break_row

    async def delete_break(self, break_row: WorkingBreak) -> None:
        await self.session.delete(break_row)
        await self.session.flush()

    async def list_unavailable_times(
        self,
        business_id: uuid.UUID,
    ) -> list[UnavailableTime]:
        stmt = (
            select(UnavailableTime)
            .where(UnavailableTime.business_id == business_id)
            .order_by(UnavailableTime.starts_at)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def list_unavailable_times_for_range(
        self,
        business_id: uuid.UUID,
        range_start,
        range_end,
    ) -> list[UnavailableTime]:
        stmt = select(UnavailableTime).where(
            UnavailableTime.business_id == business_id,
            UnavailableTime.starts_at < range_end,
            UnavailableTime.ends_at > range_start,
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_unavailable_time(
        self,
        business_id: uuid.UUID,
        block_id: uuid.UUID,
    ) -> UnavailableTime | None:
        stmt = select(UnavailableTime).where(
            UnavailableTime.business_id == business_id,
            UnavailableTime.id == block_id,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def create_unavailable_time(
        self,
        block: UnavailableTime,
    ) -> UnavailableTime:
        self.session.add(block)
        await self.session.flush()
        return block

    async def update_unavailable_time(
        self,
        block: UnavailableTime,
        data: dict,
    ) -> UnavailableTime:
        for key, value in data.items():
            setattr(block, key, value)
        await self.session.flush()
        return block

    async def delete_unavailable_time(self, block: UnavailableTime) -> None:
        await self.session.delete(block)
        await self.session.flush()


async def create_default_working_hours(
    session: AsyncSession,
    business_id: uuid.UUID,
) -> list[WorkingHour]:
    """Optional helper — not called on register by default."""
    repo = ScheduleRepository(session)
    hours = []
    for day in range(7):
        is_weekday = 1 <= day <= 5
        hours.append(
            {
                "day_of_week": day,
                "is_open": is_weekday,
                "opens_at": "09:00" if is_weekday else None,
                "closes_at": "17:00" if is_weekday else None,
            }
        )
    return await repo.replace_working_hours(business_id, hours)
