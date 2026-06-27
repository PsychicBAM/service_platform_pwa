"""Service-level tests for guest claim helpers (routes covered in test_guest_claim_routes.py)."""

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.exceptions.business import ClaimNotFoundOrMismatchError
from app.models.client import Client
from app.models.enums import ClientSource, UserRole
from app.models.user import User
from app.schemas.claim import ClaimGuestBookingRequest, ClaimGuestOrderRequest
from app.services.claim_service import ClaimService, contact_matches
from app.services.password_service import hash_password
from tests.test_guest_claim_routes import (
    _create_guest_booking,
    _create_guest_order,
)


def test_contact_matches_requires_at_least_one_provided_field_match() -> None:
    client = Client(email="a@example.com", phone="+1")
    assert contact_matches(client, email="a@example.com", phone="+9")
    assert not contact_matches(client, email="b@example.com", phone="+9")


@pytest.mark.asyncio
async def test_claim_service_rejects_unknown_reference(
    async_client: AsyncClient,
    db_session,
) -> None:
    user = User(
        email="claim-unknown@example.com",
        password_hash=hash_password("securePass123"),
        full_name="Claim Client",
        role=UserRole.client,
    )
    db_session.add(user)
    await db_session.commit()

    with pytest.raises(ClaimNotFoundOrMismatchError):
        await ClaimService(db_session).claim_guest_booking(
            user,
            ClaimGuestBookingRequest(
                reference="BKG-2026-NOTFOUND",
                email="guest@example.com",
            ),
        )


@pytest.mark.asyncio
async def test_claim_service_order_wrong_phone(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _create_guest_order(async_client, db_session, "svc-order-wrong")
    user = User(
        email="claim-order-wrong@example.com",
        password_hash=hash_password("securePass123"),
        full_name="Claim Client",
        role=UserRole.client,
    )
    db_session.add(user)
    await db_session.commit()

    with pytest.raises(ClaimNotFoundOrMismatchError):
        await ClaimService(db_session).claim_guest_order(
            user,
            ClaimGuestOrderRequest(
                reference=ctx["reference"],
                phone="+15559999",
            ),
        )


@pytest.mark.asyncio
async def test_claim_service_updates_client_source_to_registered(
    async_client: AsyncClient,
    db_session,
) -> None:
    ctx = await _create_guest_booking(async_client, db_session, "svc-source")
    user = User(
        email="claim-source@example.com",
        password_hash=hash_password("securePass123"),
        full_name="Claim Client",
        role=UserRole.client,
    )
    db_session.add(user)
    await db_session.commit()

    await ClaimService(db_session).claim_guest_booking(
        user,
        ClaimGuestBookingRequest(
            reference=ctx["reference"],
            email=ctx["guest_email"],
        ),
    )

    client = (
        await db_session.execute(
            select(Client).where(
                Client.business_id == uuid.UUID(ctx["business_id"]),
                Client.email == ctx["guest_email"],
            )
        )
    ).scalar_one()
    assert client.source == ClientSource.registered
    assert client.user_id == user.id
