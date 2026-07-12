from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.service_slot_capacity_override import ServiceSlotCapacityOverride
from app.utils.booking_slots import slot_starts_match


class ServiceSlotCapacityOverrideRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_for_service(
        self,
        business_id: uuid.UUID,
        service_id: uuid.UUID,
    ) -> list[ServiceSlotCapacityOverride]:
        stmt = (
            select(ServiceSlotCapacityOverride)
            .where(
                ServiceSlotCapacityOverride.business_id == business_id,
                ServiceSlotCapacityOverride.service_id == service_id,
            )
            .order_by(ServiceSlotCapacityOverride.starts_at)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def list_for_service_range(
        self,
        business_id: uuid.UUID,
        service_id: uuid.UUID,
        range_start: datetime,
        range_end: datetime,
    ) -> list[ServiceSlotCapacityOverride]:
        stmt = (
            select(ServiceSlotCapacityOverride)
            .where(
                ServiceSlotCapacityOverride.business_id == business_id,
                ServiceSlotCapacityOverride.service_id == service_id,
                ServiceSlotCapacityOverride.starts_at >= range_start,
                ServiceSlotCapacityOverride.starts_at < range_end,
            )
            .order_by(ServiceSlotCapacityOverride.starts_at)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_for_slot(
        self,
        business_id: uuid.UUID,
        service_id: uuid.UUID,
        starts_at: datetime,
    ) -> ServiceSlotCapacityOverride | None:
        overrides = await self.list_for_service(business_id, service_id)
        for override in overrides:
            if slot_starts_match(starts_at, override.starts_at):
                return override
        return None

    async def get_by_id(
        self,
        business_id: uuid.UUID,
        service_id: uuid.UUID,
        override_id: uuid.UUID,
    ) -> ServiceSlotCapacityOverride | None:
        stmt = select(ServiceSlotCapacityOverride).where(
            ServiceSlotCapacityOverride.id == override_id,
            ServiceSlotCapacityOverride.business_id == business_id,
            ServiceSlotCapacityOverride.service_id == service_id,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def create(
        self,
        *,
        business_id: uuid.UUID,
        service_id: uuid.UUID,
        starts_at: datetime,
        capacity: int,
        note: str | None,
    ) -> ServiceSlotCapacityOverride:
        override = ServiceSlotCapacityOverride(
            business_id=business_id,
            service_id=service_id,
            starts_at=starts_at,
            capacity=capacity,
            note=note,
        )
        self.session.add(override)
        await self.session.flush()
        return override

    async def delete(self, override: ServiceSlotCapacityOverride) -> None:
        await self.session.delete(override)
