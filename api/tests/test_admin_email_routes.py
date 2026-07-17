"""Admin email delivery status + Brevo SMTP test endpoints."""

from __future__ import annotations

from httpx import AsyncClient
from unittest.mock import MagicMock, patch

import pytest

from app.config import Settings, get_settings
from app.exceptions.business import ValidationAppError
from app.services.email_service import EMAIL_DRY_RUN, EMAIL_SENT, EmailService
from app.services.password_service import hash_password
from app.models.enums import UserRole
from app.models.user import User


def _brevo_settings(**overrides) -> Settings:
    base = {
        "email_enabled": True,
        "email_dry_run": False,
        "email_provider": "brevo",
        "smtp_host": "smtp-relay.brevo.com",
        "smtp_port": 587,
        "smtp_user": "brevo-login",
        "smtp_password": "brevo-secret-key",
        "smtp_from_email": "noreply@example.com",
        "smtp_from_name": "Service Platform",
        "smtp_use_tls": True,
        "smtp_use_ssl": False,
    }
    base.update(overrides)
    return Settings(**base)


async def _create_business_admin(db_session, email: str = "owner-email@example.com") -> User:
    user = User(
        email=email,
        password_hash=hash_password("securePass123"),
        full_name="Owner",
        role=UserRole.business_admin,
    )
    db_session.add(user)
    await db_session.commit()
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
async def test_email_status_when_disabled(async_client: AsyncClient, db_session, monkeypatch) -> None:
    monkeypatch.setenv("EMAIL_ENABLED", "false")
    monkeypatch.setenv("EMAIL_DRY_RUN", "true")
    get_settings.cache_clear()
    await _create_business_admin(db_session)
    headers = await _login(async_client, "owner-email@example.com")

    response = await async_client.get("/api/v1/admin/email/status", headers=headers)
    get_settings.cache_clear()

    assert response.status_code == 200
    body = response.json()
    assert body["enabled"] is False
    assert body["dry_run"] is True
    assert body["status"] == "disabled"
    assert body["provider"] == "brevo"
    assert "password" not in body
    assert "smtp_password" not in body


@pytest.mark.asyncio
async def test_email_status_when_brevo_configured(
    async_client: AsyncClient,
    db_session,
    monkeypatch,
) -> None:
    monkeypatch.setenv("EMAIL_ENABLED", "true")
    monkeypatch.setenv("EMAIL_DRY_RUN", "false")
    monkeypatch.setenv("EMAIL_PROVIDER", "brevo")
    monkeypatch.setenv("SMTP_HOST", "smtp-relay.brevo.com")
    monkeypatch.setenv("SMTP_PORT", "587")
    monkeypatch.setenv("SMTP_USER", "brevo-login")
    monkeypatch.setenv("SMTP_PASSWORD", "brevo-secret-key")
    monkeypatch.setenv("SMTP_FROM_EMAIL", "noreply@example.com")
    monkeypatch.setenv("SMTP_FROM_NAME", "Service Platform")
    get_settings.cache_clear()

    await _create_business_admin(db_session, "owner-ready@example.com")
    headers = await _login(async_client, "owner-ready@example.com")

    response = await async_client.get("/api/v1/admin/email/status", headers=headers)
    body = response.json()
    get_settings.cache_clear()

    assert response.status_code == 200
    assert body["enabled"] is True
    assert body["dry_run"] is False
    assert body["configured"] is True
    assert body["status"] == "ready"
    assert body["host"] == "smtp-relay.brevo.com"
    assert body["from_email"] == "noreply@example.com"
    assert "brevo-secret-key" not in response.text
    assert "password" not in body


@pytest.mark.asyncio
async def test_email_status_requires_auth(async_client: AsyncClient) -> None:
    response = await async_client.get("/api/v1/admin/email/status")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_test_email_dry_run_does_not_call_smtp(
    async_client: AsyncClient,
    db_session,
    monkeypatch,
) -> None:
    monkeypatch.setenv("EMAIL_ENABLED", "true")
    monkeypatch.setenv("EMAIL_DRY_RUN", "true")
    get_settings.cache_clear()

    await _create_business_admin(db_session, "owner-dry@example.com")
    headers = await _login(async_client, "owner-dry@example.com")

    with patch("app.services.email_service.smtplib.SMTP") as smtp_mock:
        response = await async_client.post(
            "/api/v1/admin/email/test",
            headers=headers,
            json={"to_email": "test@example.com"},
        )

    get_settings.cache_clear()
    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert body["dry_run"] is True
    assert "dry-run" in body["message"].lower()
    assert body["message_code"] in {EMAIL_DRY_RUN, "EMAIL_DRY_RUN"}
    smtp_mock.assert_not_called()


@pytest.mark.asyncio
async def test_test_email_configured_uses_mocked_smtp(
    async_client: AsyncClient,
    db_session,
    monkeypatch,
) -> None:
    monkeypatch.setenv("EMAIL_ENABLED", "true")
    monkeypatch.setenv("EMAIL_DRY_RUN", "false")
    monkeypatch.setenv("SMTP_HOST", "smtp-relay.brevo.com")
    monkeypatch.setenv("SMTP_USER", "brevo-login")
    monkeypatch.setenv("SMTP_PASSWORD", "brevo-secret-key")
    monkeypatch.setenv("SMTP_FROM_EMAIL", "noreply@example.com")
    monkeypatch.setenv("SMTP_USE_TLS", "true")
    get_settings.cache_clear()

    await _create_business_admin(db_session, "owner-live@example.com")
    headers = await _login(async_client, "owner-live@example.com")

    smtp_instance = MagicMock()
    with patch("app.services.email_service.smtplib.SMTP", return_value=smtp_instance) as smtp_mock:
        smtp_instance.__enter__.return_value = smtp_instance
        response = await async_client.post(
            "/api/v1/admin/email/test",
            headers=headers,
            json={"to_email": "test@example.com"},
        )

    get_settings.cache_clear()
    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert body["dry_run"] is False
    assert body["message_code"] == EMAIL_SENT
    assert "sent" in body["message"].lower()
    assert "brevo-secret-key" not in response.text
    smtp_mock.assert_called_once()
    smtp_instance.starttls.assert_called_once()
    smtp_instance.login.assert_called_once_with("brevo-login", "brevo-secret-key")


@pytest.mark.asyncio
async def test_test_email_incomplete_config_returns_clear_error(
    async_client: AsyncClient,
    db_session,
    monkeypatch,
) -> None:
    monkeypatch.setenv("EMAIL_ENABLED", "true")
    monkeypatch.setenv("EMAIL_DRY_RUN", "false")
    monkeypatch.setenv("SMTP_HOST", "")
    monkeypatch.setenv("SMTP_USER", "")
    monkeypatch.setenv("SMTP_PASSWORD", "")
    monkeypatch.setenv("SMTP_FROM_EMAIL", "")
    get_settings.cache_clear()

    await _create_business_admin(db_session, "owner-incomplete@example.com")
    headers = await _login(async_client, "owner-incomplete@example.com")

    response = await async_client.post(
        "/api/v1/admin/email/test",
        headers=headers,
        json={"to_email": "test@example.com"},
    )
    get_settings.cache_clear()

    assert response.status_code == 400
    assert response.json()["error"]["message"] == "Email configuration is incomplete."


@pytest.mark.asyncio
async def test_test_email_requires_auth(async_client: AsyncClient) -> None:
    response = await async_client.post(
        "/api/v1/admin/email/test",
        json={"to_email": "test@example.com"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_test_email_invalid_address_returns_friendly_error(
    async_client: AsyncClient,
    db_session,
) -> None:
    await _create_business_admin(db_session, "owner-invalid-email@example.com")
    headers = await _login(async_client, "owner-invalid-email@example.com")

    response = await async_client.post(
        "/api/v1/admin/email/test",
        headers=headers,
        json={"to_email": "not-an-email"},
    )

    assert response.status_code == 400
    assert response.json()["error"]["message"] == "Enter a valid email address."
    assert "password" not in response.text


@pytest.mark.asyncio
async def test_test_email_rejects_crafted_long_suspicious_input_quickly(
    async_client: AsyncClient,
    db_session,
) -> None:
    await _create_business_admin(db_session, "owner-long-email@example.com")
    headers = await _login(async_client, "owner-long-email@example.com")

    crafted = "!@!." + ("!." * 200)
    assert len(crafted) > 254

    response = await async_client.post(
        "/api/v1/admin/email/test",
        headers=headers,
        json={"to_email": crafted},
    )

    assert response.status_code in {400, 422}
    assert "brevo-secret-key" not in response.text
    assert "smtp_password" not in response.text.lower()


@pytest.mark.asyncio
async def test_test_email_trims_whitespace_for_valid_address(
    async_client: AsyncClient,
    db_session,
    monkeypatch,
) -> None:
    monkeypatch.setenv("EMAIL_ENABLED", "true")
    monkeypatch.setenv("EMAIL_DRY_RUN", "true")
    get_settings.cache_clear()

    await _create_business_admin(db_session, "owner-trim-email@example.com")
    headers = await _login(async_client, "owner-trim-email@example.com")

    with patch("app.services.email_service.smtplib.SMTP") as smtp_mock:
        response = await async_client.post(
            "/api/v1/admin/email/test",
            headers=headers,
            json={"to_email": "  test@example.com  "},
        )

    get_settings.cache_clear()
    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert body["dry_run"] is True
    assert "password" not in body
    smtp_mock.assert_not_called()


def test_normalize_admin_test_email_rejects_oversized_without_regex() -> None:
    from app.routers.admin_email import normalize_admin_test_email

    crafted = "!@!." + ("!." * 200)
    with pytest.raises(ValidationAppError, match="Enter a valid email address"):
        normalize_admin_test_email(crafted)


def test_delivery_status_ready_for_brevo_settings() -> None:
    status = EmailService(_brevo_settings()).get_delivery_status()
    assert status.status == "ready"
    assert status.configured is True
    assert status.provider == "brevo"
    assert status.host == "smtp-relay.brevo.com"


def test_smtp_username_alias_accepted() -> None:
    settings = Settings.model_validate(
        {
            "email_enabled": False,
            "SMTP_USERNAME": "alias-login",
            "smtp_password": "x",
            "smtp_host": "smtp-relay.brevo.com",
            "smtp_from_email": "a@example.com",
        }
    )
    assert settings.smtp_user == "alias-login"
