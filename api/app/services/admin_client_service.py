from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions.business import ClientEmailExistsError, ClientNotFoundError
from app.models.business import Business
from app.models.client import Client
from app.repositories.client_repository import ClientRepository
from app.schemas.client import (
    ClientBookingSummary,
    ClientDetail,
    ClientListItem,
    ClientListMeta,
    ClientListResponse,
    ClientOrderSummary,
    ClientUpdate,
)


class AdminClientService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = ClientRepository(session)

    async def list_admin_clients(
        self,
        business: Business,
        *,
        search: str | None = None,
        page: int = 1,
        limit: int = 20,
    ) -> ClientListResponse:
        clients = await self.repo.list_for_business(
            business.id,
            search=search,
            page=page,
            limit=limit,
        )
        total = await self.repo.count_for_business(business.id, search=search)
        data: list[ClientListItem] = []
        for client in clients:
            data.append(await self._to_list_item(business.id, client))
        return ClientListResponse(
            data=data,
            meta=ClientListMeta(page=page, limit=limit, total=total),
        )

    async def get_admin_client(
        self,
        business: Business,
        client_id: uuid.UUID,
    ) -> ClientDetail:
        client = await self._get_client_or_404(business.id, client_id)
        return await self._to_detail(business.id, client)

    async def update_admin_client(
        self,
        business: Business,
        client_id: uuid.UUID,
        payload: ClientUpdate,
    ) -> ClientDetail:
        client = await self._get_client_or_404(business.id, client_id)
        data = payload.model_dump(exclude_unset=True)
        if "email" in data and data["email"]:
            existing = await self.repo.find_by_email(business.id, data["email"])
            if existing is not None and existing.id != client.id:
                raise ClientEmailExistsError()
        if data:
            await self.repo.update_client(client, data)
        return await self._to_detail(business.id, client)

    async def _get_client_or_404(
        self,
        business_id: uuid.UUID,
        client_id: uuid.UUID,
    ) -> Client:
        client = await self.repo.get_detail_for_business(business_id, client_id)
        if client is None:
            raise ClientNotFoundError()
        return client

    async def _to_list_item(
        self,
        business_id: uuid.UUID,
        client: Client,
    ) -> ClientListItem:
        bookings_count, orders_count = await self.repo.get_counts_for_client(
            business_id,
            client.id,
        )
        last_activity_at = await self.repo.get_last_activity_at(business_id, client.id)
        return ClientListItem(
            id=client.id,
            full_name=client.full_name,
            email=client.email,
            phone=client.phone,
            source=client.source,
            bookings_count=bookings_count,
            orders_count=orders_count,
            last_activity_at=last_activity_at,
            created_at=client.created_at,
            updated_at=client.updated_at,
        )

    async def _to_detail(
        self,
        business_id: uuid.UUID,
        client: Client,
    ) -> ClientDetail:
        bookings_count, orders_count = await self.repo.get_counts_for_client(
            business_id,
            client.id,
        )
        last_activity_at = await self.repo.get_last_activity_at(business_id, client.id)
        bookings = await self.repo.get_client_bookings_summary(business_id, client.id)
        orders = await self.repo.get_client_orders_summary(business_id, client.id)
        return ClientDetail(
            id=client.id,
            business_id=client.business_id,
            user_id=client.user_id,
            full_name=client.full_name,
            email=client.email,
            phone=client.phone,
            notes=client.notes,
            source=client.source,
            bookings_count=bookings_count,
            orders_count=orders_count,
            last_activity_at=last_activity_at,
            bookings=[
                ClientBookingSummary(
                    id=booking.id,
                    reference=booking.reference,
                    status=booking.status,
                    service_name=booking.service.name,
                    starts_at=booking.starts_at,
                    ends_at=booking.ends_at,
                )
                for booking in bookings
            ],
            orders=[
                ClientOrderSummary(
                    id=order.id,
                    reference=order.reference,
                    status=order.status,
                    service_name=order.service.name,
                    created_at=order.created_at,
                    updated_at=order.updated_at,
                )
                for order in orders
            ],
            created_at=client.created_at,
            updated_at=client.updated_at,
        )
