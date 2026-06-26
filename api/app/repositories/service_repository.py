import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import ServiceType
from app.models.service import Service


class ServiceRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(self, service_id: uuid.UUID) -> Service | None:
        stmt = select(Service).where(Service.id == service_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_business_and_id(
        self,
        business_id: uuid.UUID,
        service_id: uuid.UUID,
    ) -> Service | None:
        stmt = select(Service).where(
            Service.business_id == business_id,
            Service.id == service_id,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_for_business(
        self,
        business_id: uuid.UUID,
        *,
        type: ServiceType | None = None,
        include_inactive: bool = True,
        page: int = 1,
        limit: int = 50,
    ) -> list[Service]:
        stmt = select(Service).where(Service.business_id == business_id)
        if type is not None:
            stmt = stmt.where(Service.type == type)
        if not include_inactive:
            stmt = stmt.where(Service.is_active.is_(True))
        stmt = stmt.order_by(Service.sort_order, Service.name)
        offset = max(page - 1, 0) * limit
        stmt = stmt.offset(offset).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def count_for_business(
        self,
        business_id: uuid.UUID,
        *,
        type: ServiceType | None = None,
        include_inactive: bool = True,
    ) -> int:
        stmt = select(func.count()).select_from(Service).where(
            Service.business_id == business_id
        )
        if type is not None:
            stmt = stmt.where(Service.type == type)
        if not include_inactive:
            stmt = stmt.where(Service.is_active.is_(True))
        result = await self.session.execute(stmt)
        return int(result.scalar_one())

    async def list_public_for_business(
        self,
        business_id: uuid.UUID,
        *,
        type: ServiceType | None = None,
        allowed_types: set[ServiceType] | None = None,
    ) -> list[Service]:
        stmt = select(Service).where(
            Service.business_id == business_id,
            Service.is_active.is_(True),
        )
        if type is not None:
            stmt = stmt.where(Service.type == type)
        elif allowed_types is not None:
            stmt = stmt.where(Service.type.in_(allowed_types))
        stmt = stmt.order_by(Service.sort_order, Service.name)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def create(self, service: Service) -> Service:
        self.session.add(service)
        await self.session.flush()
        return service

    async def update(self, service: Service, data: dict) -> Service:
        for key, value in data.items():
            setattr(service, key, value)
        await self.session.flush()
        return service

    async def soft_deactivate(self, service: Service) -> Service:
        service.is_active = False
        await self.session.flush()
        return service
