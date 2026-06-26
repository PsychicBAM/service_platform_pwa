import uuid
from datetime import time

from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions.business import NotFoundError, ValidationAppError
from app.models.business import Business
from app.models.unavailable_time import UnavailableTime
from app.models.working_break import WorkingBreak
from app.repositories.schedule_repository import ScheduleRepository
from app.schemas.schedule import (
    ScheduleRead,
    ScheduleSettingsRead,
    UnavailableTimeCreate,
    UnavailableTimeUpdate,
    WorkingBreakCreate,
    WorkingBreakUpdate,
    WorkingHoursReplaceRequest,
    parse_time_hhmm,
)


class ScheduleService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = ScheduleRepository(session)

    async def get_schedule(self, business: Business) -> ScheduleRead:
        hours = await self.repo.get_working_hours(business.id)
        breaks = await self.repo.list_breaks(business.id)
        unavailable = await self.repo.list_unavailable_times(business.id)
        settings = business.settings or {}
        return ScheduleRead(
            working_hours=hours,
            breaks=breaks,
            unavailable_times=unavailable,
            settings=ScheduleSettingsRead(
                slot_interval_minutes=int(settings.get("slot_interval_minutes", 30)),
                booking_buffer_minutes=int(settings.get("booking_buffer_minutes", 0)),
            ),
        )

    async def replace_working_hours(
        self,
        business: Business,
        payload: WorkingHoursReplaceRequest,
    ) -> list:
        items = []
        for hour in payload.working_hours:
            items.append(
                {
                    "day_of_week": hour.day_of_week,
                    "is_open": hour.is_open,
                    "opens_at": hour.opens_at,
                    "closes_at": hour.closes_at,
                }
            )
        rows = await self.repo.replace_working_hours(business.id, items)
        await self.session.commit()
        for row in rows:
            await self.session.refresh(row)
        return rows

    async def create_break(
        self,
        business: Business,
        payload: WorkingBreakCreate,
    ) -> WorkingBreak:
        break_row = WorkingBreak(
            business_id=business.id,
            label=payload.label,
            day_of_week=payload.day_of_week,
            starts_at=parse_time_hhmm(payload.starts_at),
            ends_at=parse_time_hhmm(payload.ends_at),
        )
        await self.repo.create_break(break_row)
        await self.session.commit()
        await self.session.refresh(break_row)
        return break_row

    async def update_break(
        self,
        business: Business,
        break_id: uuid.UUID,
        payload: WorkingBreakUpdate,
    ) -> WorkingBreak:
        break_row = await self.repo.get_break(business.id, break_id)
        if break_row is None:
            raise NotFoundError("Break not found.")
        data = payload.model_dump(exclude_unset=True)
        if "starts_at" in data and data["starts_at"] is not None:
            data["starts_at"] = parse_time_hhmm(data["starts_at"])
        if "ends_at" in data and data["ends_at"] is not None:
            data["ends_at"] = parse_time_hhmm(data["ends_at"])
        starts = data.get("starts_at", break_row.starts_at)
        ends = data.get("ends_at", break_row.ends_at)
        if starts >= ends:
            raise ValidationAppError("starts_at must be before ends_at")
        await self.repo.update_break(break_row, data)
        await self.session.commit()
        await self.session.refresh(break_row)
        return break_row

    async def delete_break(self, business: Business, break_id: uuid.UUID) -> None:
        break_row = await self.repo.get_break(business.id, break_id)
        if break_row is None:
            raise NotFoundError("Break not found.")
        await self.repo.delete_break(break_row)
        await self.session.commit()

    async def create_unavailable_time(
        self,
        business: Business,
        payload: UnavailableTimeCreate,
    ) -> UnavailableTime:
        block = UnavailableTime(
            business_id=business.id,
            starts_at=payload.starts_at,
            ends_at=payload.ends_at,
            reason=payload.reason,
        )
        await self.repo.create_unavailable_time(block)
        await self.session.commit()
        await self.session.refresh(block)
        return block

    async def update_unavailable_time(
        self,
        business: Business,
        block_id: uuid.UUID,
        payload: UnavailableTimeUpdate,
    ) -> UnavailableTime:
        block = await self.repo.get_unavailable_time(business.id, block_id)
        if block is None:
            raise NotFoundError("Unavailable time not found.")
        data = payload.model_dump(exclude_unset=True)
        starts = data.get("starts_at", block.starts_at)
        ends = data.get("ends_at", block.ends_at)
        if starts >= ends:
            raise ValidationAppError("starts_at must be before ends_at")
        await self.repo.update_unavailable_time(block, data)
        await self.session.commit()
        await self.session.refresh(block)
        return block

    async def delete_unavailable_time(
        self,
        business: Business,
        block_id: uuid.UUID,
    ) -> None:
        block = await self.repo.get_unavailable_time(business.id, block_id)
        if block is None:
            raise NotFoundError("Unavailable time not found.")
        await self.repo.delete_unavailable_time(block)
        await self.session.commit()
