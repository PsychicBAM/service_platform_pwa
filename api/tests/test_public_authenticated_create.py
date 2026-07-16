"""Authenticated client public booking/order create should attach Client.user_id."""

from __future__ import annotations

import uuid
from unittest.mock import patch

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.models.client import Client
from app.models.enums import ClientSource, UserRole
from app.models.user import User
from app.services.password_service import hash_password
from tests.test_bookings_availability_blocking import (
    FIXED_NOW,
    _setup_booking_business,
)
from tests.test_guest_claim_routes import FIXED_NOW_UTC
from tests.test_public_booking_create import booking_payload
from tests.test_public_order_create import _setup_order_business, order_payload


@pytest.fixture(autouse=True)
def fixed_booking_time():
    with (
        patch(
            "app.repositories.booking_repository._now_utc",
            return_value=FIXED_NOW_UTC,
        ),
        patch(
            "app.services.client_booking_service._now_utc",
            return_value=FIXED_NOW_UTC,
        ),
        patch(
            "app.services.availability_service._now_in_tz",
            return_value=FIXED_NOW,
        ),
    ):
        yield


async def _create_client_user(db_session, email: str) -> User:
    user = User(
        email=email,
        password_hash=hash_password("securePass123"),
        full_name="Logged In Client",
        role=UserRole.client,
    )
    db_session.add(user)
    await db_session.flush()
    return user


async def _create_business_admin(db_session, email: str) -> User:
    user = User(
        email=email,
        password_hash=hash_password("securePass123"),
        full_name="Business Admin",
        role=UserRole.business_admin,
    )
    db_session.add(user)
    await db_session.flush()
    return user


async def _login(async_client: AsyncClient, email: str) -> dict:
    response = await async_client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "securePass123"},
    )
    assert response.status_code == 200
    token = response.json()["tokens"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_logged_in_client_booking_same_email_links_and_lists(
    async_client: AsyncClient,
    db_session,
) -> None:
    email = "linked-book@example.com"
    ctx = await _setup_booking_business(async_client, db_session, "auth-book")
    user = await _create_client_user(db_session, email)
    await db_session.commit()
    headers = await _login(async_client, email)

    response = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/bookings",
        json=booking_payload(ctx["service_id"], email=email, phone="+15552001"),
        headers=headers,
    )
    assert response.status_code == 201
    body = response.json()
    assert body["linked_to_account"] is True
    assert body["status"] == "pending"

    client = (
        await db_session.execute(
            select(Client).where(
                Client.business_id == uuid.UUID(ctx["business_id"]),
                Client.email == email,
            )
        )
    ).scalar_one()
    assert client.user_id == user.id
    assert client.source == ClientSource.registered

    listing = await async_client.get(
        "/api/v1/me/bookings",
        params={"status": "upcoming"},
        headers=headers,
    )
    assert listing.status_code == 200
    assert any(item["id"] == body["id"] for item in listing.json()["data"])
    assert any(
        item["status"] == "pending" for item in listing.json()["data"] if item["id"] == body["id"]
    )


@pytest.mark.asyncio
async def test_logged_in_client_order_same_email_links_and_lists(
    async_client: AsyncClient,
    db_session,
) -> None:
    email = "linked-order@example.com"
    ctx = await _setup_order_business(async_client, db_session, "auth-ord")
    user = await _create_client_user(db_session, email)
    await db_session.commit()
    headers = await _login(async_client, email)

    response = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/orders",
        json=order_payload(ctx["service_id"], email=email, phone="+15552002"),
        headers=headers,
    )
    assert response.status_code == 201
    body = response.json()
    assert body["linked_to_account"] is True
    assert body["status"] == "submitted"

    client = (
        await db_session.execute(
            select(Client).where(
                Client.business_id == uuid.UUID(ctx["business_id"]),
                Client.email == email,
            )
        )
    ).scalar_one()
    assert client.user_id == user.id

    listing = await async_client.get(
        "/api/v1/me/orders",
        params={"status": "active"},
        headers=headers,
    )
    assert listing.status_code == 200
    assert any(item["id"] == body["id"] for item in listing.json()["data"])


@pytest.mark.asyncio
async def test_logged_in_client_different_email_stays_guest(
    async_client: AsyncClient,
    db_session,
) -> None:
    account_email = "account-a@example.com"
    guest_email = "guest-b@example.com"
    ctx = await _setup_order_business(async_client, db_session, "mismatch")
    user = await _create_client_user(db_session, account_email)
    await db_session.commit()
    headers = await _login(async_client, account_email)

    response = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/orders",
        json=order_payload(ctx["service_id"], email=guest_email, phone="+15552003"),
        headers=headers,
    )
    assert response.status_code == 201
    body = response.json()
    assert body["linked_to_account"] is False

    client = (
        await db_session.execute(
            select(Client).where(
                Client.business_id == uuid.UUID(ctx["business_id"]),
                Client.email == guest_email,
            )
        )
    ).scalar_one()
    assert client.user_id is None
    assert client.source == ClientSource.guest

    listing = await async_client.get(
        "/api/v1/me/orders",
        params={"status": "active"},
        headers=headers,
    )
    assert listing.status_code == 200
    assert all(item["id"] != body["id"] for item in listing.json()["data"])
    assert user.id  # keep user referenced for clarity


@pytest.mark.asyncio
async def test_business_admin_public_booking_does_not_attach_as_client(
    async_client: AsyncClient,
    db_session,
) -> None:
    email = "admin-public@example.com"
    ctx = await _setup_booking_business(async_client, db_session, "admin-pub")
    await _create_business_admin(db_session, email)
    await db_session.commit()
    headers = await _login(async_client, email)

    response = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/bookings",
        json=booking_payload(ctx["service_id"], email=email, phone="+15552004"),
        headers=headers,
    )
    assert response.status_code == 201
    assert response.json()["linked_to_account"] is False

    client = (
        await db_session.execute(
            select(Client).where(
                Client.business_id == uuid.UUID(ctx["business_id"]),
                Client.email == email,
            )
        )
    ).scalar_one()
    assert client.user_id is None


@pytest.mark.asyncio
async def test_guest_public_booking_still_creates_unlinked_client(
    async_client: AsyncClient,
    db_session,
) -> None:
    email = "pure-guest@example.com"
    ctx = await _setup_booking_business(async_client, db_session, "pure-guest")
    response = await async_client.post(
        f"/api/v1/public/b/{ctx['slug']}/bookings",
        json=booking_payload(ctx["service_id"], email=email, phone="+15552005"),
    )
    assert response.status_code == 201
    assert response.json()["linked_to_account"] is False

    client = (
        await db_session.execute(
            select(Client).where(
                Client.business_id == uuid.UUID(ctx["business_id"]),
                Client.email == email,
            )
        )
    ).scalar_one()
    assert client.user_id is None
    assert client.source == ClientSource.guest
