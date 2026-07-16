import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.booking import Booking
from app.models.client import Client
from app.models.enums import ClientSource
from app.models.order import Order


class ClientRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(self, client_id: uuid.UUID) -> Client | None:
        stmt = select(Client).where(Client.id == client_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_business_and_id(
        self,
        business_id: uuid.UUID,
        client_id: uuid.UUID,
    ) -> Client | None:
        stmt = select(Client).where(
            Client.business_id == business_id,
            Client.id == client_id,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_detail_for_business(
        self,
        business_id: uuid.UUID,
        client_id: uuid.UUID,
    ) -> Client | None:
        return await self.get_by_business_and_id(business_id, client_id)

    async def find_by_email(
        self,
        business_id: uuid.UUID,
        email: str,
    ) -> Client | None:
        normalized = email.strip().lower()
        stmt = select(Client).where(
            Client.business_id == business_id,
            Client.email == normalized,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    def _apply_search(self, stmt, search: str | None):
        if not search:
            return stmt
        term = f"%{search.strip()}%"
        return stmt.where(
            or_(
                Client.full_name.ilike(term),
                Client.email.ilike(term),
                Client.phone.ilike(term),
            )
        )

    async def list_for_business(
        self,
        business_id: uuid.UUID,
        *,
        search: str | None = None,
        page: int = 1,
        limit: int = 20,
    ) -> list[Client]:
        stmt = select(Client).where(Client.business_id == business_id)
        stmt = self._apply_search(stmt, search)
        stmt = stmt.order_by(Client.updated_at.desc())
        offset = max(page - 1, 0) * limit
        stmt = stmt.offset(offset).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def count_for_business(
        self,
        business_id: uuid.UUID,
        *,
        search: str | None = None,
    ) -> int:
        stmt = select(func.count()).select_from(Client).where(
            Client.business_id == business_id
        )
        stmt = self._apply_search(stmt, search)
        result = await self.session.execute(stmt)
        return int(result.scalar_one())

    async def get_counts_for_client(
        self,
        business_id: uuid.UUID,
        client_id: uuid.UUID,
    ) -> tuple[int, int]:
        bookings_stmt = (
            select(func.count())
            .select_from(Booking)
            .where(
                Booking.business_id == business_id,
                Booking.client_id == client_id,
            )
        )
        orders_stmt = (
            select(func.count())
            .select_from(Order)
            .where(
                Order.business_id == business_id,
                Order.client_id == client_id,
            )
        )
        bookings_result = await self.session.execute(bookings_stmt)
        orders_result = await self.session.execute(orders_stmt)
        return int(bookings_result.scalar_one()), int(orders_result.scalar_one())

    async def get_last_activity_at(
        self,
        business_id: uuid.UUID,
        client_id: uuid.UUID,
    ) -> datetime | None:
        client = await self.get_by_business_and_id(business_id, client_id)
        if client is None:
            return None

        candidates: list[datetime] = [client.updated_at]

        booking_stmt = select(
            func.max(
                func.greatest(
                    Booking.created_at,
                    Booking.updated_at,
                    Booking.starts_at,
                )
            )
        ).where(
            Booking.business_id == business_id,
            Booking.client_id == client_id,
        )
        booking_max = (await self.session.execute(booking_stmt)).scalar_one_or_none()
        if booking_max is not None:
            candidates.append(booking_max)

        order_stmt = select(
            func.max(func.greatest(Order.created_at, Order.updated_at))
        ).where(
            Order.business_id == business_id,
            Order.client_id == client_id,
        )
        order_max = (await self.session.execute(order_stmt)).scalar_one_or_none()
        if order_max is not None:
            candidates.append(order_max)

        return max(candidates)

    async def get_client_bookings_summary(
        self,
        business_id: uuid.UUID,
        client_id: uuid.UUID,
        limit: int = 10,
    ) -> list[Booking]:
        stmt = (
            select(Booking)
            .where(
                Booking.business_id == business_id,
                Booking.client_id == client_id,
            )
            .options(selectinload(Booking.service))
            .order_by(Booking.starts_at.desc())
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_client_orders_summary(
        self,
        business_id: uuid.UUID,
        client_id: uuid.UUID,
        limit: int = 10,
    ) -> list[Order]:
        stmt = (
            select(Order)
            .where(
                Order.business_id == business_id,
                Order.client_id == client_id,
            )
            .options(selectinload(Order.service))
            .order_by(Order.created_at.desc())
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def update_client(self, client: Client, data: dict[str, Any]) -> Client:
        for key, value in data.items():
            setattr(client, key, value)
        await self.session.flush()
        return client

    async def get_or_create_guest_client(
        self,
        business_id: uuid.UUID,
        *,
        full_name: str,
        email: str | None,
        phone: str | None,
        attach_user_id: uuid.UUID | None = None,
    ) -> Client:
        normalized_email = email.strip().lower() if email else None
        if normalized_email:
            existing = await self.find_by_email(business_id, normalized_email)
            if existing is not None:
                if (
                    attach_user_id is not None
                    and existing.user_id is None
                ):
                    existing.user_id = attach_user_id
                    existing.source = ClientSource.registered
                    await self.session.flush()
                return existing
        client = Client(
            business_id=business_id,
            full_name=full_name,
            email=normalized_email,
            phone=phone.strip() if phone else None,
            user_id=attach_user_id,
            source=(
                ClientSource.registered
                if attach_user_id is not None
                else ClientSource.guest
            ),
        )
        return await self.create(client)

    async def create(self, client: Client) -> Client:
        self.session.add(client)
        await self.session.flush()
        return client
