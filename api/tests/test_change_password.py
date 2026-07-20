import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.services.password_service import verify_password
from tests.conftest import register_and_get_context


@pytest.mark.asyncio
async def test_change_password_success(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    ctx = await register_and_get_context(async_client, "pwd-change-ok")
    old_password = ctx["payload"]["password"]
    new_password = "NewPassword456!"

    response = await async_client.post(
        "/api/v1/auth/change-password",
        headers=ctx["headers"],
        json={
            "current_password": old_password,
            "new_password": new_password,
        },
    )
    assert response.status_code == 200
    assert response.json()["changed"] is True

    user = (
        await db_session.execute(
            select(User).where(User.id == uuid.UUID(str(ctx["user_id"])))
        )
    ).scalar_one()
    assert verify_password(new_password, user.password_hash or "")
    assert not verify_password(old_password, user.password_hash or "")

    login = await async_client.post(
        "/api/v1/auth/login",
        json={"email": ctx["payload"]["email"], "password": new_password},
    )
    assert login.status_code == 200


@pytest.mark.asyncio
async def test_change_password_rejects_wrong_current(
    async_client: AsyncClient,
) -> None:
    ctx = await register_and_get_context(async_client, "pwd-change-bad")

    response = await async_client.post(
        "/api/v1/auth/change-password",
        headers=ctx["headers"],
        json={
            "current_password": "WrongPassword1!",
            "new_password": "NewPassword456!",
        },
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INVALID_CURRENT_PASSWORD"


@pytest.mark.asyncio
async def test_change_password_rejects_same_password(
    async_client: AsyncClient,
) -> None:
    ctx = await register_and_get_context(async_client, "pwd-change-same")
    password = ctx["payload"]["password"]

    response = await async_client.post(
        "/api/v1/auth/change-password",
        headers=ctx["headers"],
        json={
            "current_password": password,
            "new_password": password,
        },
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "PASSWORD_CHANGE_VALIDATION_ERROR"
