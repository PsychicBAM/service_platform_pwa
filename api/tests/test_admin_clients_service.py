import uuid

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions.business import ClientEmailExistsError, ClientNotFoundError
from app.models.business import Business
from app.models.client import Client
from app.models.enums import BusinessStatus, ClientSource
from app.repositories.client_repository import ClientRepository
from app.schemas.client import ClientUpdate
from app.services.admin_client_service import AdminClientService


@pytest.mark.asyncio
async def test_get_admin_client_raises_not_found(db_session: AsyncSession) -> None:
    business = Business(
        id=uuid.uuid4(),
        name="Test",
        slug="test",
        timezone="UTC",
        status=BusinessStatus.active,
    )
    db_session.add(business)
    await db_session.flush()

    service = AdminClientService(db_session)
    with pytest.raises(ClientNotFoundError):
        await service.get_admin_client(business, uuid.uuid4())


@pytest.mark.asyncio
async def test_update_admin_client_duplicate_email_raises(
    db_session: AsyncSession,
) -> None:
    business = Business(
        id=uuid.uuid4(),
        name="Test Biz",
        slug="test-biz",
        timezone="UTC",
        status=BusinessStatus.active,
    )
    db_session.add(business)
    await db_session.flush()

    repo = ClientRepository(db_session)
    first = await repo.create(
        Client(
            business_id=business.id,
            full_name="First Client",
            email="first@example.com",
            source=ClientSource.guest,
        )
    )
    second = await repo.create(
        Client(
            business_id=business.id,
            full_name="Second Client",
            email="second@example.com",
            source=ClientSource.guest,
        )
    )
    await db_session.commit()

    service = AdminClientService(db_session)
    with pytest.raises(ClientEmailExistsError):
        await service.update_admin_client(
            business,
            second.id,
            ClientUpdate(email="first@example.com"),
        )

    assert first.email == "first@example.com"


@pytest.mark.asyncio
async def test_update_admin_client_same_email_on_self_allowed(
    db_session: AsyncSession,
) -> None:
    business = Business(
        id=uuid.uuid4(),
        name="Test Biz",
        slug="test-biz-self",
        timezone="UTC",
        status=BusinessStatus.active,
    )
    db_session.add(business)
    await db_session.flush()

    repo = ClientRepository(db_session)
    client = await repo.create(
        Client(
            business_id=business.id,
            full_name="Self Client",
            email="self@example.com",
            source=ClientSource.guest,
        )
    )
    await db_session.commit()

    service = AdminClientService(db_session)
    detail = await service.update_admin_client(
        business,
        client.id,
        ClientUpdate(email="self@example.com", notes="unchanged email"),
    )
    assert detail.email == "self@example.com"
    assert detail.notes == "unchanged email"
