from datetime import UTC, datetime, timedelta
from unittest.mock import patch

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings, get_settings
from app.main import app
from app.models.email_verification_token import EmailVerificationToken
from app.models.user import User
from app.services.email_verification_service import hash_verification_token
from tests.conftest import register_payload


@pytest.mark.asyncio
async def test_register_creates_unverified_user_and_verification_token(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    payload = register_payload("verify-register")
    response = await async_client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201

    user = (
        await db_session.execute(select(User).where(User.email == payload["email"]))
    ).scalar_one()
    assert user.email_verified_at is None

    tokens = (
        await db_session.execute(
            select(EmailVerificationToken).where(
                EmailVerificationToken.user_id == user.id
            )
        )
    ).scalars().all()
    assert len(tokens) == 1
    assert tokens[0].token_hash
    assert len(tokens[0].token_hash) == 64


@pytest.mark.asyncio
async def test_register_attempts_verification_email_with_mock(
    async_client: AsyncClient,
) -> None:
    payload = register_payload("verify-email-send")
    with patch(
        "app.services.email_verification_service.EmailService.send_email",
        return_value=__import__(
            "app.services.email_service", fromlist=["EmailSendResult"]
        ).EmailSendResult(sent=True, dry_run=True, message="dry-run"),
    ) as send_mock:
        response = await async_client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    send_mock.assert_called_once()


@pytest.mark.asyncio
async def test_verify_valid_token_sets_email_verified_at(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    payload = register_payload("verify-ok")
    raw_token = "route-valid-token"
    with patch(
        "app.services.email_verification_service.secrets.token_urlsafe",
        return_value=raw_token,
    ):
        register_response = await async_client.post(
            "/api/v1/auth/register",
            json=payload,
        )
    assert register_response.status_code == 201

    response = await async_client.post(
        "/api/v1/auth/verify-email",
        json={"token": raw_token},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["verified"] is True
    assert body["email"] == payload["email"]

    user = (
        await db_session.execute(select(User).where(User.email == payload["email"]))
    ).scalar_one()
    assert user.email_verified_at is not None


@pytest.mark.asyncio
async def test_verify_invalid_token_returns_400(async_client: AsyncClient) -> None:
    response = await async_client.post(
        "/api/v1/auth/verify-email",
        json={"token": "not-a-real-token"},
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "EMAIL_VERIFICATION_TOKEN_INVALID"
    assert "invalid or expired" in response.json()["error"]["message"].lower()


@pytest.mark.asyncio
async def test_verify_expired_token_fails(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    payload = register_payload("verify-expired")
    raw_token = "expired-route-token"
    with patch(
        "app.services.email_verification_service.secrets.token_urlsafe",
        return_value=raw_token,
    ):
        await async_client.post("/api/v1/auth/register", json=payload)

    record = (
        await db_session.execute(select(EmailVerificationToken))
    ).scalar_one()
    record.expires_at = datetime.now(UTC) - timedelta(hours=1)
    await db_session.commit()

    response = await async_client.post(
        "/api/v1/auth/verify-email",
        json={"token": raw_token},
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "EMAIL_VERIFICATION_TOKEN_INVALID"


@pytest.mark.asyncio
async def test_verify_used_token_cannot_be_reused(
    async_client: AsyncClient,
) -> None:
    payload = register_payload("verify-reuse")
    raw_token = "reuse-route-token"
    with patch(
        "app.services.email_verification_service.secrets.token_urlsafe",
        return_value=raw_token,
    ):
        await async_client.post("/api/v1/auth/register", json=payload)

    first = await async_client.post(
        "/api/v1/auth/verify-email",
        json={"token": raw_token},
    )
    assert first.status_code == 200

    second = await async_client.post(
        "/api/v1/auth/verify-email",
        json={"token": raw_token},
    )
    assert second.status_code == 400


@pytest.mark.asyncio
async def test_resend_verification_requires_auth(async_client: AsyncClient) -> None:
    response = await async_client.post("/api/v1/auth/resend-verification")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_resend_verification_creates_token_for_unverified_user(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    payload = register_payload("verify-resend")
    register_response = await async_client.post(
        "/api/v1/auth/register",
        json=payload,
    )
    access_token = register_response.json()["tokens"]["access_token"]

    with patch(
        "app.services.email_verification_service.EmailService.send_email",
        return_value=__import__(
            "app.services.email_service", fromlist=["EmailSendResult"]
        ).EmailSendResult(sent=True, dry_run=True, message="dry-run"),
    ):
        response = await async_client.post(
            "/api/v1/auth/resend-verification",
            headers={"Authorization": f"Bearer {access_token}"},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["sent"] is True
    assert body["already_verified"] is False

    user = (
        await db_session.execute(select(User).where(User.email == payload["email"]))
    ).scalar_one()
    tokens = (
        await db_session.execute(
            select(EmailVerificationToken).where(
                EmailVerificationToken.user_id == user.id
            )
        )
    ).scalars().all()
    assert len(tokens) == 2


@pytest.mark.asyncio
async def test_resend_verification_for_verified_user(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    payload = register_payload("verify-resend-done")
    register_response = await async_client.post(
        "/api/v1/auth/register",
        json=payload,
    )
    access_token = register_response.json()["tokens"]["access_token"]
    user = (
        await db_session.execute(select(User).where(User.email == payload["email"]))
    ).scalar_one()
    user.email_verified_at = datetime.now(UTC)
    await db_session.commit()

    response = await async_client.post(
        "/api/v1/auth/resend-verification",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["sent"] is False
    assert body["already_verified"] is True


@pytest.mark.asyncio
async def test_default_login_works_for_unverified_user(async_client: AsyncClient) -> None:
    payload = register_payload("verify-login-default")
    await async_client.post("/api/v1/auth/register", json=payload)
    response = await async_client.post(
        "/api/v1/auth/login",
        json={"email": payload["email"], "password": payload["password"]},
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_login_blocked_when_verification_required(
    async_client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    payload = register_payload("verify-login-blocked")
    await async_client.post("/api/v1/auth/register", json=payload)

    base = get_settings()
    monkeypatch.setattr(
        "app.services.auth_service.get_settings",
        lambda: Settings(
            **{
                **base.model_dump(),
                "require_email_verification_for_login": True,
            }
        ),
    )

    response = await async_client.post(
        "/api/v1/auth/login",
        json={"email": payload["email"], "password": payload["password"]},
    )
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "EMAIL_VERIFICATION_REQUIRED"


@pytest.mark.asyncio
async def test_openapi_includes_verify_and_resend_endpoints(
    async_client: AsyncClient,
) -> None:
    paths = app.openapi()["paths"]
    assert "/api/v1/auth/verify-email" in paths
    assert "post" in paths["/api/v1/auth/verify-email"]
    assert "/api/v1/auth/resend-verification" in paths
    assert "post" in paths["/api/v1/auth/resend-verification"]


@pytest.mark.asyncio
async def test_raw_token_not_stored_in_db(
    async_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    payload = register_payload("verify-hash-only")
    raw_token = "stored-hash-only-token"
    with patch(
        "app.services.email_verification_service.secrets.token_urlsafe",
        return_value=raw_token,
    ):
        await async_client.post("/api/v1/auth/register", json=payload)

    record = (
        await db_session.execute(select(EmailVerificationToken))
    ).scalar_one()
    assert record.token_hash == hash_verification_token(raw_token)
    assert record.token_hash != raw_token
