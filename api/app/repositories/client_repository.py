import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.client import Client
from app.models.enums import ClientSource


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

    async def get_or_create_guest_client(
        self,
        business_id: uuid.UUID,
        *,
        full_name: str,
        email: str | None,
        phone: str | None,
    ) -> Client:
        normalized_email = email.strip().lower() if email else None
        if normalized_email:
            existing = await self.find_by_email(business_id, normalized_email)
            if existing is not None:
                return existing
        client = Client(
            business_id=business_id,
            full_name=full_name,
            email=normalized_email,
            phone=phone.strip() if phone else None,
            source=ClientSource.guest,
        )
        return await self.create(client)

    async def create(self, client: Client) -> Client:
        self.session.add(client)
        await self.session.flush()
        return client
