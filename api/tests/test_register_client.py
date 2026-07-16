import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.business import Business
from app.models.business_member import BusinessMember
from app.models.user import User
from app.services.password_service import verify_password
from tests.conftest import register_payload


def client_register_payload(suffix: str = "client") -> dict:
    return {
        "email": f"customer-{suffix}@example.com",
        "password": "ChangeMe123!",
        "full_name": "Customer Demo",
    }


@pytest.mark.asyncio
async def test_register_client_creates_client_user_without_business(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    payload = client_register_payload("create")
    response = await async_client.post("/api/v1/auth/register-client", json=payload)
    assert response.status_code == 201
    body = response.json()
    assert body["user"]["email"] == payload["email"]
    assert body["user"]["role"] == "client"
    assert body["user"]["full_name"] == "Customer Demo"
    assert "access_token" in body["tokens"]
    assert "refresh_token" in body["tokens"]
    assert "business" not in body

    user = (
        await db_session.execute(select(User).where(User.email == payload["email"]))
    ).scalar_one()
    assert user.role.value == "client"
    assert verify_password(payload["password"], user.password_hash or "")

    members = (
        await db_session.execute(
            select(BusinessMember).where(BusinessMember.user_id == user.id)
        )
    ).scalars().all()
    assert members == []

    owned_businesses = (
        await db_session.execute(
            select(Business).where(Business.contact_email == payload["email"])
        )
    ).scalars().all()
    assert owned_businesses == []


@pytest.mark.asyncio
async def test_register_client_token_can_access_me(async_client: AsyncClient) -> None:
    payload = client_register_payload("me-access")
    register_response = await async_client.post("/api/v1/auth/register-client", json=payload)
    assert register_response.status_code == 201
    token = register_response.json()["tokens"]["access_token"]

    me_response = await async_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_response.status_code == 200
    me = me_response.json()
    assert me["email"] == payload["email"]
    assert me["role"] == "client"
    assert me["businesses"] == []


@pytest.mark.asyncio
async def test_register_client_duplicate_email_returns_helpful_409(
    async_client: AsyncClient,
) -> None:
    payload = client_register_payload("dup")
    assert (await async_client.post("/api/v1/auth/register-client", json=payload)).status_code == 201
    response = await async_client.post("/api/v1/auth/register-client", json=payload)
    assert response.status_code == 409
    error = response.json()["error"]
    assert error["code"] == "EMAIL_ALREADY_EXISTS"
    assert "claim" in error["message"].lower()


@pytest.mark.asyncio
async def test_business_register_still_creates_business_owner(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    payload = register_payload("biz-still")
    response = await async_client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    body = response.json()
    assert body["user"]["role"] == "business_admin"
    assert body["business"]["slug"] == payload["business"]["slug"]

    user = (
        await db_session.execute(select(User).where(User.email == payload["email"]))
    ).scalar_one()
    assert user.role.value == "business_admin"
