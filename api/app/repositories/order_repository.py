import uuid
from enum import Enum
from typing import Any

from sqlalchemy import extract, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.client import Client
from app.models.enums import OrderStatus
from app.models.order import Order
from app.models.service import Service


class UserOrderStatusFilter(str, Enum):
    active = "active"
    completed = "completed"
    declined = "declined"
    cancelled = "cancelled"


ACTIVE_ORDER_STATUSES = (
    OrderStatus.submitted,
    OrderStatus.pending_payment,
    OrderStatus.accepted,
    OrderStatus.in_progress,
)


class OrderRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    def _list_filters(
        self,
        stmt,
        business_id: uuid.UUID,
        *,
        status: OrderStatus | None = None,
        search: str | None = None,
    ):
        stmt = stmt.where(Order.business_id == business_id)
        if status is not None:
            stmt = stmt.where(Order.status == status)
        if search:
            term = f"%{search.strip()}%"
            stmt = (
                stmt.join(Order.client)
                .join(Order.service)
                .where(
                    or_(
                        Client.full_name.ilike(term),
                        Client.email.ilike(term),
                        Client.phone.ilike(term),
                        Order.reference.ilike(term),
                        Service.name.ilike(term),
                    )
                )
            )
        return stmt

    def _user_order_filters(
        self,
        stmt,
        user_id: uuid.UUID,
        status_filter: UserOrderStatusFilter | None,
    ):
        stmt = stmt.join(Order.client).where(Client.user_id == user_id)
        if status_filter == UserOrderStatusFilter.active:
            stmt = stmt.where(Order.status.in_(ACTIVE_ORDER_STATUSES))
        elif status_filter == UserOrderStatusFilter.completed:
            stmt = stmt.where(Order.status == OrderStatus.completed)
        elif status_filter == UserOrderStatusFilter.declined:
            stmt = stmt.where(Order.status == OrderStatus.declined)
        elif status_filter == UserOrderStatusFilter.cancelled:
            stmt = stmt.where(Order.status == OrderStatus.cancelled)
        return stmt

    async def get_for_user(
        self,
        user_id: uuid.UUID,
        order_id: uuid.UUID,
    ) -> Order | None:
        stmt = (
            select(Order)
            .join(Order.client)
            .where(Client.user_id == user_id, Order.id == order_id)
            .options(
                selectinload(Order.client),
                selectinload(Order.service),
                selectinload(Order.business),
            )
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_orders_for_claim_by_reference(self, reference: str) -> list[Order]:
        """Find orders by reference across businesses (refs are unique per business only)."""
        normalized_reference = reference.strip()
        if not normalized_reference:
            return []
        stmt = (
            select(Order)
            .join(Order.client)
            .where(Order.reference == normalized_reference)
            .options(
                selectinload(Order.client),
                selectinload(Order.service),
                selectinload(Order.business),
            )
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().unique().all())

    async def get_for_review_by_reference(
        self,
        business_id: uuid.UUID,
        reference: str,
    ) -> Order | None:
        normalized_reference = reference.strip()
        if not normalized_reference:
            return None
        stmt = (
            select(Order)
            .where(
                Order.business_id == business_id,
                Order.reference == normalized_reference,
            )
            .options(
                selectinload(Order.client),
                selectinload(Order.service),
                selectinload(Order.business),
            )
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_for_user(
        self,
        user_id: uuid.UUID,
        *,
        status_filter: UserOrderStatusFilter | None = None,
        page: int = 1,
        limit: int = 20,
    ) -> list[Order]:
        stmt = select(Order).options(
            selectinload(Order.client),
            selectinload(Order.service),
            selectinload(Order.business),
        )
        stmt = self._user_order_filters(stmt, user_id, status_filter)
        stmt = stmt.order_by(Order.created_at.desc())
        offset = max(page - 1, 0) * limit
        stmt = stmt.offset(offset).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().unique().all())

    async def count_for_user(
        self,
        user_id: uuid.UUID,
        *,
        status_filter: UserOrderStatusFilter | None = None,
    ) -> int:
        stmt = select(func.count()).select_from(Order)
        stmt = self._user_order_filters(stmt, user_id, status_filter)
        result = await self.session.execute(stmt)
        return int(result.scalar_one())

    async def cancel_by_client(
        self,
        order: Order,
        *,
        reason: str | None,
    ) -> Order:
        order.status = OrderStatus.cancelled
        if reason:
            note = f"Cancelled by client: {reason}"
            order.admin_notes = (
                f"{order.admin_notes}\n{note}" if order.admin_notes else note
            )
        await self.session.flush()
        return order

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

    async def get_detail_for_business(
        self,
        business_id: uuid.UUID,
        order_id: uuid.UUID,
    ) -> Order | None:
        stmt = (
            select(Order)
            .where(
                Order.business_id == business_id,
                Order.id == order_id,
            )
            .options(
                selectinload(Order.client),
                selectinload(Order.service),
            )
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_for_business(
        self,
        business_id: uuid.UUID,
        *,
        status: OrderStatus | None = None,
        search: str | None = None,
        page: int = 1,
        limit: int = 20,
    ) -> list[Order]:
        stmt = select(Order).options(
            selectinload(Order.client),
            selectinload(Order.service),
        )
        stmt = self._list_filters(stmt, business_id, status=status, search=search)
        stmt = stmt.order_by(Order.created_at.desc())
        offset = max(page - 1, 0) * limit
        stmt = stmt.offset(offset).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().unique().all())

    async def count_for_business(
        self,
        business_id: uuid.UUID,
        *,
        status: OrderStatus | None = None,
        search: str | None = None,
    ) -> int:
        stmt = select(func.count()).select_from(Order)
        stmt = self._list_filters(stmt, business_id, status=status, search=search)
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

    async def update_order(self, order: Order, data: dict[str, Any]) -> Order:
        return await self.update(order, data)
