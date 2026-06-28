from datetime import UTC, datetime, timedelta
from unittest.mock import patch

import pytest
from httpx import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.models.password_reset_token import PasswordResetToken
from app.models.user import User
from app.services.password_reset_service import hash_reset_token
from app.services.password_service import verify_password
from tests.conftest import register_payload


@pytest.mark.asyncio
async def test_request_reset_existing_user_creates_token(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    payload = register_payload("reset-existing")
    await async_client.post("/api/v1/auth/register", json=payload)

    with patch(
        "app.services.password_reset_service.EmailService.send_email",
        return_value=__import__(
            "app.services.email_service", fromlist=["EmailSendResult"]
        ).EmailSendResult(sent=True, dry_run=True, message="dry-run"),
    ):
        response = await async_client.post(
            "/api/v1/auth/request-password-reset",
            json={"email": payload["email"]},
        )

    assert response.status_code == 200
    assert response.json() == {"sent": True}
    user = (
        await db_session.execute(select(User).where(User.email == payload["email"]))
    ).scalar_one()
    tokens = (
        await db_session.execute(
            select(PasswordResetToken).where(PasswordResetToken.user_id == user.id)
        )
    ).scalars().all()
    assert len(tokens) == 1


@pytest.mark.asyncio
async def test_request_reset_sends_email_with_mock(async_client: AsyncClient) -> None:
    payload = register_payload("reset-email-send")
    await async_client.post("/api/v1/auth/register", json=payload)

    with patch(
        "app.services.password_reset_service.EmailService.send_email",
        return_value=__import__(
            "app.services.email_service", fromlist=["EmailSendResult"]
        ).EmailSendResult(sent=True, dry_run=True, message="dry-run"),
    ) as send_mock:
        response = await async_client.post(
            "/api/v1/auth/request-password-reset",
            json={"email": payload["email"]},
        )

    assert response.status_code == 200
    send_mock.assert_called_once()


@pytest.mark.asyncio
async def test_request_reset_unknown_email_same_response(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    response = await async_client.post(
        "/api/v1/auth/request-password-reset",
        json={"email": "nobody-here@example.com"},
    )

    assert response.status_code == 200
    assert response.json() == {"sent": True}
    count = (
        await db_session.execute(select(func.count()).select_from(PasswordResetToken))
    ).scalar_one()
    assert count == 0


@pytest.mark.asyncio
async def test_raw_token_not_stored_in_db(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    payload = register_payload("reset-hash-only")
    await async_client.post("/api/v1/auth/register", json=payload)
    raw_token = "route-reset-token-value"

    with patch(
        "app.services.password_reset_service.secrets.token_urlsafe",
        return_value=raw_token,
    ), patch(
        "app.services.password_reset_service.EmailService.send_email",
        return_value=__import__(
            "app.services.email_service", fromlist=["EmailSendResult"]
        ).EmailSendResult(sent=True, dry_run=True, message="dry-run"),
    ):
        await async_client.post(
            "/api/v1/auth/request-password-reset",
            json={"email": payload["email"]},
        )

    record = (
        await db_session.execute(select(PasswordResetToken))
    ).scalar_one()
    assert record.token_hash == hash_reset_token(raw_token)
    assert record.token_hash != raw_token


@pytest.mark.asyncio
async def test_valid_token_resets_password(async_client: AsyncClient) -> None:
    payload = register_payload("reset-valid")
    old_password = payload["password"]
    await async_client.post("/api/v1/auth/register", json=payload)
    raw_token = "route-valid-reset-token"

    with patch(
        "app.services.password_reset_service.secrets.token_urlsafe",
        return_value=raw_token,
    ), patch(
        "app.services.password_reset_service.EmailService.send_email",
        return_value=__import__(
            "app.services.email_service", fromlist=["EmailSendResult"]
        ).EmailSendResult(sent=True, dry_run=True, message="dry-run"),
    ):
        await async_client.post(
            "/api/v1/auth/request-password-reset",
            json={"email": payload["email"]},
        )

    response = await async_client.post(
        "/api/v1/auth/reset-password",
        json={"token": raw_token, "new_password": "BrandNewPass123!"},
    )
    assert response.status_code == 200
    assert response.json() == {"reset": True}

    old_login = await async_client.post(
        "/api/v1/auth/login",
        json={"email": payload["email"], "password": old_password},
    )
    assert old_login.status_code == 401

    new_login = await async_client.post(
        "/api/v1/auth/login",
        json={"email": payload["email"], "password": "BrandNewPass123!"},
    )
    assert new_login.status_code == 200


@pytest.mark.asyncio
async def test_invalid_token_returns_generic_error(async_client: AsyncClient) -> None:
    response = await async_client.post(
        "/api/v1/auth/reset-password",
        json={"token": "not-a-real-reset-token", "new_password": "BrandNewPass123!"},
    )
    assert response.status_code == 400
    body = response.json()["error"]
    assert body["code"] == "PASSWORD_RESET_TOKEN_INVALID"
    assert "invalid or expired" in body["message"].lower()


@pytest.mark.asyncio
async def test_expired_token_fails(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    payload = register_payload("reset-expired")
    await async_client.post("/api/v1/auth/register", json=payload)
    raw_token = "expired-route-reset-token"

    with patch(
        "app.services.password_reset_service.secrets.token_urlsafe",
        return_value=raw_token,
    ), patch(
        "app.services.password_reset_service.EmailService.send_email",
        return_value=__import__(
            "app.services.email_service", fromlist=["EmailSendResult"]
        ).EmailSendResult(sent=True, dry_run=True, message="dry-run"),
    ):
        await async_client.post(
            "/api/v1/auth/request-password-reset",
            json={"email": payload["email"]},
        )

    record = (
        await db_session.execute(select(PasswordResetToken))
    ).scalar_one()
    record.expires_at = datetime.now(UTC) - timedelta(hours=1)
    await db_session.commit()

    response = await async_client.post(
        "/api/v1/auth/reset-password",
        json={"token": raw_token, "new_password": "BrandNewPass123!"},
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "PASSWORD_RESET_TOKEN_INVALID"


@pytest.mark.asyncio
async def test_used_token_cannot_be_reused(async_client: AsyncClient) -> None:
    payload = register_payload("reset-reuse")
    await async_client.post("/api/v1/auth/register", json=payload)
    raw_token = "reuse-route-reset-token"

    with patch(
        "app.services.password_reset_service.secrets.token_urlsafe",
        return_value=raw_token,
    ), patch(
        "app.services.password_reset_service.EmailService.send_email",
        return_value=__import__(
            "app.services.email_service", fromlist=["EmailSendResult"]
        ).EmailSendResult(sent=True, dry_run=True, message="dry-run"),
    ):
        await async_client.post(
            "/api/v1/auth/request-password-reset",
            json={"email": payload["email"]},
        )

    first = await async_client.post(
        "/api/v1/auth/reset-password",
        json={"token": raw_token, "new_password": "BrandNewPass123!"},
    )
    assert first.status_code == 200

    second = await async_client.post(
        "/api/v1/auth/reset-password",
        json={"token": raw_token, "new_password": "AnotherPass123!"},
    )
    assert second.status_code == 400


@pytest.mark.asyncio
async def test_weak_new_password_rejected(async_client: AsyncClient) -> None:
    response = await async_client.post(
        "/api/v1/auth/reset-password",
        json={"token": "some-token", "new_password": "short"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_openapi_includes_password_reset_endpoints(
    async_client: AsyncClient,
) -> None:
    paths = app.openapi()["paths"]
    assert "/api/v1/auth/request-password-reset" in paths
    assert "post" in paths["/api/v1/auth/request-password-reset"]
    assert "/api/v1/auth/reset-password" in paths
    assert "post" in paths["/api/v1/auth/reset-password"]


@pytest.mark.asyncio
async def test_reset_password_updates_hash_in_db(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    payload = register_payload("reset-db-check")
    await async_client.post("/api/v1/auth/register", json=payload)
    raw_token = "db-check-reset-token"
    user = (
        await db_session.execute(select(User).where(User.email == payload["email"]))
    ).scalar_one()
    old_hash = user.password_hash

    with patch(
        "app.services.password_reset_service.secrets.token_urlsafe",
        return_value=raw_token,
    ), patch(
        "app.services.password_reset_service.EmailService.send_email",
        return_value=__import__(
            "app.services.email_service", fromlist=["EmailSendResult"]
        ).EmailSendResult(sent=True, dry_run=True, message="dry-run"),
    ):
        await async_client.post(
            "/api/v1/auth/request-password-reset",
            json={"email": payload["email"]},
        )

    await async_client.post(
        "/api/v1/auth/reset-password",
        json={"token": raw_token, "new_password": "BrandNewPass123!"},
    )

    await db_session.refresh(user)
    assert user.password_hash != old_hash
    assert verify_password("BrandNewPass123!", user.password_hash or "")
