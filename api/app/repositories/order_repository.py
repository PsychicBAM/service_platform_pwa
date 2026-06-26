import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import extract, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import OrderStatus
from app.models.order import Order


class OrderRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    def _list_filters(
        self,
        stmt,
        business_id: uuid.UUID,
        *,
        status: OrderStatus | None = None,
    ):
        stmt = stmt.where(Order.business_id == business_id)
        if status is not None:
            stmt = stmt.where(Order.status == status)
        return stmt

    async def get_by_id(self, order_id: uuid.UUID) -> Order | None:
        stmt = select(Order).where(Order.id == order_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_business_and_id(
        self,
        business_id: uuid.UUID,
        order_id: uuid.UUID,
    ) -> Order | None:
        stmt = select(Order).where(
            Order.business_id == business_id,
            Order.id == order_id,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_for_business(
        self,
        business_id: uuid.UUID,
        *,
        status: OrderStatus | None = None,
        page: int = 1,
        limit: int = 20,
    ) -> list[Order]:
        stmt = select(Order)
        stmt = self._list_filters(stmt, business_id, status=status)
        stmt = stmt.order_by(Order.created_at.desc())
        offset = max(page - 1, 0) * limit
        stmt = stmt.offset(offset).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def count_for_business(
        self,
        business_id: uuid.UUID,
        *,
        status: OrderStatus | None = None,
    ) -> int:
        stmt = select(func.count()).select_from(Order)
        stmt = self._list_filters(stmt, business_id, status=status)
        result = await self.session.execute(stmt)
        return int(result.scalar_one())

    async def list_for_client(
        self,
        business_id: uuid.UUID,
        client_id: uuid.UUID,
    ) -> list[Order]:
        stmt = (
            select(Order)
            .where(
                Order.business_id == business_id,
                Order.client_id == client_id,
            )
            .order_by(Order.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def count_for_business_year(
        self,
        business_id: uuid.UUID,
        year: int,
    ) -> int:
        stmt = (
            select(func.count())
            .select_from(Order)
            .where(
                Order.business_id == business_id,
                extract("year", Order.created_at) == year,
            )
        )
        result = await self.session.execute(stmt)
        return int(result.scalar_one())

    async def create(self, order: Order) -> Order:
        self.session.add(order)
        await self.session.flush()
        return order

    async def update(self, order: Order, data: dict[str, Any]) -> Order:
        for key, value in data.items():
            setattr(order, key, value)
        await self.session.flush()
        return order
