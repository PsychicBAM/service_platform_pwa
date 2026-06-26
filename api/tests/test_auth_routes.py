import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.business import Business
from app.models.business_member import BusinessMember
from app.models.subscription import Subscription
from app.models.user import User
from tests.conftest import register_payload


@pytest.mark.asyncio
async def test_register_creates_user_business_member_subscription(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    payload = register_payload()
    response = await async_client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    body = response.json()
    assert body["user"]["email"] == payload["email"]
    assert body["business"]["slug"] == payload["business"]["slug"]
    assert "access_token" in body["tokens"]

    user = (
        await db_session.execute(select(User).where(User.email == payload["email"]))
    ).scalar_one()
    business = (
        await db_session.execute(
            select(Business).where(Business.slug == payload["business"]["slug"])
        )
    ).scalar_one()
    members = (
        await db_session.execute(
            select(BusinessMember).where(BusinessMember.business_id == business.id)
        )
    ).scalars().all()
    subscription = (
        await db_session.execute(
            select(Subscription).where(Subscription.business_id == business.id)
        )
    ).scalar_one()

    assert user.role.value == "business_admin"
    assert len(members) == 1
    assert members[0].role.value == "owner"
    assert subscription.plan.value == "free"


@pytest.mark.asyncio
async def test_register_duplicate_email_returns_409(async_client: AsyncClient) -> None:
    payload = register_payload("dup-email")
    assert (await async_client.post("/api/v1/auth/register", json=payload)).status_code == 201
    payload["business"]["slug"] = "different-slug-xyz"
    response = await async_client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "EMAIL_ALREADY_EXISTS"


@pytest.mark.asyncio
async def test_register_duplicate_slug_returns_409(async_client: AsyncClient) -> None:
    payload = register_payload("slug-a")
    assert (await async_client.post("/api/v1/auth/register", json=payload)).status_code == 201
    payload["email"] = "other-owner@example.com"
    response = await async_client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "SLUG_ALREADY_EXISTS"


@pytest.mark.asyncio
async def test_login_succeeds(async_client: AsyncClient) -> None:
    payload = register_payload("login-ok")
    await async_client.post("/api/v1/auth/register", json=payload)
    response = await async_client.post(
        "/api/v1/auth/login",
        json={"email": payload["email"], "password": payload["password"]},
    )
    assert response.status_code == 200
    assert "access_token" in response.json()["tokens"]


@pytest.mark.asyncio
async def test_login_fails_with_wrong_password(async_client: AsyncClient) -> None:
    payload = register_payload("login-fail")
    await async_client.post("/api/v1/auth/register", json=payload)
    response = await async_client.post(
        "/api/v1/auth/login",
        json={"email": payload["email"], "password": "wrongPassword123"},
    )
    assert response.status_code == 401
    assert response.json()["error"]["message"] == "Invalid email or password."


@pytest.mark.asyncio
async def test_refresh_returns_new_access_token(async_client: AsyncClient) -> None:
    payload = register_payload("refresh-ok")
    register_response = await async_client.post("/api/v1/auth/register", json=payload)
    refresh_token = register_response.json()["tokens"]["refresh_token"]
    response = await async_client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert response.status_code == 200
    assert response.json()["access_token"]


@pytest.mark.asyncio
async def test_auth_me_returns_user_and_businesses(async_client: AsyncClient) -> None:
    payload = register_payload("me-ok")
    register_response = await async_client.post("/api/v1/auth/register", json=payload)
    access_token = register_response.json()["tokens"]["access_token"]
    response = await async_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["email"] == payload["email"]
    assert len(body["businesses"]) == 1
    assert body["businesses"][0]["slug"] == payload["business"]["slug"]


@pytest.mark.asyncio
async def test_inactive_user_cannot_login(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    payload = register_payload("inactive")
    await async_client.post("/api/v1/auth/register", json=payload)
    user = (
        await db_session.execute(select(User).where(User.email == payload["email"]))
    ).scalar_one()
    user.is_active = False
    await db_session.commit()

    response = await async_client.post(
        "/api/v1/auth/login",
        json={"email": payload["email"], "password": payload["password"]},
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_invalid_token_rejected_on_me(async_client: AsyncClient) -> None:
    response = await async_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer invalid.token.value"},
    )
    assert response.status_code == 401
